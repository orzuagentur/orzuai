"use client";

import { CHAT_ATTACHMENTS_BUCKET } from "@/features/chats/chat-attachments";
import {
  createClientIfConfigured,
  getBrowserSupabaseConfig,
} from "@/lib/supabase/client";

export type ChatUploadPhase = "uploading";

export type ChatUploadProgressUpdate = {
  percent: number;
  loaded: number;
  total: number;
  bytesPerSecond: number;
  phase: ChatUploadPhase;
};

type UploadChatAttachmentOptions = {
  bucket?: string;
  upsert?: boolean;
  onProgress?: (update: ChatUploadProgressUpdate) => void;
};

function buildStorageUploadUrl(bucket: string, path: string, supabaseUrl: string): string {
  const normalizedBase = supabaseUrl.replace(/\/$/, "");
  const normalizedPath = path.replace(/^\/+/, "");

  return `${normalizedBase}/storage/v1/object/${bucket}/${normalizedPath}`;
}

function uploadViaXhr(
  body: File | Blob,
  url: string,
  accessToken: string,
  anonKey: string,
  options: {
    upsert?: boolean;
    onProgress?: (update: ChatUploadProgressUpdate) => void;
  } = {},
): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    let lastLoaded = 0;
    let lastTime = performance.now();

    const formData = new FormData();
    formData.append("cacheControl", "3600");
    formData.append("", body);

    xhr.upload.addEventListener("progress", (event) => {
      if (!event.lengthComputable || !options.onProgress) {
        return;
      }

      const now = performance.now();
      const elapsedSeconds = (now - lastTime) / 1000;
      const loadedDelta = event.loaded - lastLoaded;
      const bytesPerSecond =
        elapsedSeconds > 0 ? loadedDelta / elapsedSeconds : 0;

      lastLoaded = event.loaded;
      lastTime = now;

      options.onProgress({
        percent: Math.min(100, (event.loaded / event.total) * 100),
        loaded: event.loaded,
        total: event.total,
        bytesPerSecond,
        phase: "uploading",
      });
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ success: true });
        return;
      }

      resolve({
        success: false,
        error:
          xhr.responseText?.trim() ||
          `Upload failed with status ${xhr.status}.`,
      });
    });

    xhr.addEventListener("error", () => {
      resolve({ success: false, error: "Network error during upload." });
    });

    xhr.addEventListener("abort", () => {
      resolve({ success: false, error: "Upload cancelled." });
    });

    xhr.open("POST", url);
    xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
    xhr.setRequestHeader("apikey", anonKey);
    xhr.setRequestHeader("x-upsert", options.upsert ? "true" : "false");
    xhr.send(formData);
  });
}

async function uploadViaSupabaseClient(
  body: File | Blob,
  path: string,
  bucket: string,
  upsert: boolean,
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClientIfConfigured();

  if (!supabase) {
    return { success: false, error: "Supabase is not configured." };
  }

  const contentType =
    body instanceof File
      ? body.type || "application/octet-stream"
      : body.type || "application/octet-stream";

  const { error } = await supabase.storage.from(bucket).upload(path, body, {
    contentType,
    upsert,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

async function uploadStorageObject(
  body: File | Blob,
  path: string,
  options: UploadChatAttachmentOptions = {},
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClientIfConfigured();
  const config = getBrowserSupabaseConfig();

  if (!supabase || !config) {
    return { success: false, error: "Supabase is not configured." };
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    return { success: false, error: "Not authenticated." };
  }

  const bucket = options.bucket ?? CHAT_ATTACHMENTS_BUCKET;
  const upsert = options.upsert ?? false;

  if (options.onProgress) {
    const url = buildStorageUploadUrl(bucket, path, config.url);
    const xhrResult = await uploadViaXhr(
      body,
      url,
      session.access_token,
      config.anonKey,
      {
        upsert,
        onProgress: options.onProgress,
      },
    );

    if (xhrResult.success) {
      return xhrResult;
    }
  }

  return uploadViaSupabaseClient(body, path, bucket, upsert);
}

export async function uploadChatAttachmentDirect(
  file: File,
  path: string,
  options: UploadChatAttachmentOptions = {},
): Promise<{ success: boolean; error?: string }> {
  return uploadStorageObject(file, path, options);
}

export async function uploadChatAttachmentBlob(
  blob: Blob,
  path: string,
  options: Omit<UploadChatAttachmentOptions, "onProgress"> = {},
): Promise<{ success: boolean; error?: string }> {
  return uploadStorageObject(blob, path, {
    ...options,
    upsert: options.upsert ?? true,
  });
}

export async function getChatAttachmentSignedUrlClient(
  path: string,
  bucket = CHAT_ATTACHMENTS_BUCKET,
  expiresIn = 60 * 60,
): Promise<string | null> {
  const supabase = createClientIfConfigured();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error || !data?.signedUrl) {
    return null;
  }

  return data.signedUrl;
}
