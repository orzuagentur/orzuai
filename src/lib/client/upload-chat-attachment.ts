"use client";

import { CHAT_ATTACHMENTS_BUCKET } from "@/features/chats/chat-attachments";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/env";
import { createClientIfConfigured } from "@/lib/supabase/client";

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

function buildStorageUploadUrl(bucket: string, path: string): string {
  const supabaseUrl = getSupabaseUrl().replace(/\/$/, "");
  const normalizedPath = path.replace(/^\/+/, "");

  return `${supabaseUrl}/storage/v1/object/${bucket}/${normalizedPath}`;
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

  if (!supabase) {
    return { success: false, error: "Supabase is not configured." };
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    return { success: false, error: "Not authenticated." };
  }

  const bucket = options.bucket ?? CHAT_ATTACHMENTS_BUCKET;
  const supabaseUrl = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();

  if (!supabaseUrl || !anonKey) {
    return { success: false, error: "Supabase is not configured." };
  }

  const url = buildStorageUploadUrl(bucket, path);
  const xhrResult = await uploadViaXhr(
    file,
    url,
    session.access_token,
    anonKey,
    options.onProgress,
  );

  if (xhrResult.success) {
    return xhrResult;
  }

  const fallbackResult = await uploadViaSupabaseClient(file, path, bucket);

  if (fallbackResult.success) {
    return fallbackResult;
  }

  return {
    success: false,
    error: xhrResult.error ?? fallbackResult.error,
  };
}
