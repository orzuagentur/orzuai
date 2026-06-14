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
  onProgress?: (update: ChatUploadProgressUpdate) => void;
};

function buildStorageUploadUrl(bucket: string, path: string, supabaseUrl: string): string {
  const normalizedBase = supabaseUrl.replace(/\/$/, "");
  const normalizedPath = path.replace(/^\/+/, "");

  return `${normalizedBase}/storage/v1/object/${bucket}/${normalizedPath}`;
}

function uploadViaXhr(
  file: File,
  url: string,
  accessToken: string,
  anonKey: string,
  onProgress?: (update: ChatUploadProgressUpdate) => void,
): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    let lastLoaded = 0;
    let lastTime = performance.now();

    const formData = new FormData();
    formData.append("cacheControl", "3600");
    formData.append("", file);

    xhr.upload.addEventListener("progress", (event) => {
      if (!event.lengthComputable || !onProgress) {
        return;
      }

      const now = performance.now();
      const elapsedSeconds = (now - lastTime) / 1000;
      const loadedDelta = event.loaded - lastLoaded;
      const bytesPerSecond =
        elapsedSeconds > 0 ? loadedDelta / elapsedSeconds : 0;

      lastLoaded = event.loaded;
      lastTime = now;

      onProgress({
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
    xhr.setRequestHeader("x-upsert", "false");
    xhr.send(formData);
  });
}

async function uploadViaSupabaseClient(
  file: File,
  path: string,
  bucket: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClientIfConfigured();

  if (!supabase) {
    return { success: false, error: "Supabase is not configured." };
  }

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function uploadChatAttachmentDirect(
  file: File,
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

  if (options.onProgress) {
    const url = buildStorageUploadUrl(bucket, path, config.url);
    const xhrResult = await uploadViaXhr(
      file,
      url,
      session.access_token,
      config.anonKey,
      options.onProgress,
    );

    if (xhrResult.success) {
      return xhrResult;
    }
  }

  return uploadViaSupabaseClient(file, path, bucket);
}
