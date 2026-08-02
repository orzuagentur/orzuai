import "server-only";

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import ffmpegStaticPath from "ffmpeg-static";

import {
  deleteMediaObject,
  downloadMediaObject,
  putMediaObject,
} from "@/lib/storage/media-storage";
import {
  buildVoiceNoteOggFileName,
  buildVoiceNoteOggStoragePath,
  needsVoiceNoteTranscode,
} from "@/utils/voice-note";

const OUTPUT_MIME_TYPE = "audio/ogg";

function resolveFfmpegBinary(): string {
  const executableName = process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg";
  const candidates = [
    process.env.FFMPEG_PATH,
    ffmpegStaticPath,
    path.join(process.cwd(), "node_modules", "ffmpeg-static", executableName),
  ].filter((value): value is string => Boolean(value?.trim()));

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error("ffmpeg binary is unavailable.");
}

function resolveFfmpegInputFormat(mimeType: string): string {
  const normalized = mimeType.toLowerCase().split(";")[0]!.trim();

  if (normalized.includes("webm")) {
    return "webm";
  }

  if (normalized.includes("mp4") || normalized.includes("m4a")) {
    return "mp4";
  }

  if (normalized.includes("mpeg") || normalized.includes("mp3")) {
    return "mp3";
  }

  if (normalized.includes("wav")) {
    return "wav";
  }

  return "webm";
}

export async function transcodeVoiceNoteToOggOpus(
  inputBuffer: Buffer,
  mimeType: string,
): Promise<Buffer> {
  const ffmpegBinary = resolveFfmpegBinary();

  return new Promise((resolve, reject) => {
    const args = [
      "-hide_banner",
      "-loglevel",
      "error",
      "-f",
      resolveFfmpegInputFormat(mimeType),
      "-i",
      "pipe:0",
      "-vn",
      "-c:a",
      "libopus",
      "-b:a",
      "32k",
      "-vbr",
      "on",
      "-application",
      "voip",
      "-f",
      "ogg",
      "pipe:1",
    ];

    const ffmpegProcess = spawn(ffmpegBinary, args, {
      stdio: ["pipe", "pipe", "pipe"],
    });

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    ffmpegProcess.stdout.on("data", (chunk: Buffer) => {
      stdoutChunks.push(chunk);
    });

    ffmpegProcess.stderr.on("data", (chunk: Buffer) => {
      stderrChunks.push(chunk);
    });

    ffmpegProcess.on("error", (error: Error) => {
      reject(error);
    });

    ffmpegProcess.on("close", (code: number | null) => {
      if (code === 0 && stdoutChunks.length > 0) {
        resolve(Buffer.concat(stdoutChunks));
        return;
      }

      const details = Buffer.concat(stderrChunks).toString("utf8").trim();

      reject(
        new Error(
          details
            ? `Voice note transcode failed: ${details}`
            : "Voice note transcode failed.",
        ),
      );
    });

    ffmpegProcess.stdin.end(inputBuffer);
  });
}

async function downloadStorageObject(ref: string): Promise<Buffer> {
  const buffer = await downloadMediaObject(ref);

  if (!buffer) {
    throw new Error("Unable to download voice note from storage.");
  }

  return buffer;
}

async function uploadStorageObject(
  ref: string,
  buffer: Buffer,
  contentType: string,
): Promise<void> {
  const ok = await putMediaObject({
    ref,
    body: buffer,
    contentType,
    upsert: true,
  });

  if (!ok) {
    throw new Error("Unable to store transcoded voice note.");
  }
}

export type NormalizedVoiceNoteAsset = {
  path: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

export async function normalizeStoredVoiceNoteAsset(input: {
  path: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}): Promise<NormalizedVoiceNoteAsset> {
  if (
    !needsVoiceNoteTranscode({
      fileName: input.fileName,
      mimeType: input.mimeType,
    })
  ) {
    return input;
  }

  const sourceBuffer = await downloadStorageObject(input.path);
  const oggBuffer = await transcodeVoiceNoteToOggOpus(
    sourceBuffer,
    input.mimeType,
  );
  const oggPath = buildVoiceNoteOggStoragePath(input.path);
  const oggFileName = buildVoiceNoteOggFileName(input.fileName);

  await uploadStorageObject(oggPath, oggBuffer, OUTPUT_MIME_TYPE);

  if (oggPath !== input.path) {
    await deleteMediaObject(input.path);
  }

  return {
    path: oggPath,
    fileName: oggFileName,
    mimeType: OUTPUT_MIME_TYPE,
    sizeBytes: oggBuffer.length,
  };
}

export async function transcodeRemoteVoiceNoteToOggOpus(
  mediaUrl: string,
  mimeType: string,
): Promise<Buffer> {
  const response = await fetch(mediaUrl, { cache: "no-store" });

  if (!response.ok) {
    throw new Error("Unable to download voice note for delivery.");
  }

  const inputBuffer = Buffer.from(await response.arrayBuffer());

  return transcodeVoiceNoteToOggOpus(inputBuffer, mimeType);
}
