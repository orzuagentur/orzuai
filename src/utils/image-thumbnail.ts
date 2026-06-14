import "server-only";

const THUMB_MAX_WIDTH = 320;
const THUMB_JPEG_QUALITY = 78;

type SharpModule = typeof import("sharp");

async function loadSharp(): Promise<SharpModule["default"] | null> {
  try {
    const mod = await import("sharp");
    return mod.default;
  } catch (error) {
    console.error("[image-thumbnail] sharp module unavailable", error);
    return null;
  }
}

export async function generateImageThumbnailBuffer(
  source: Buffer,
): Promise<{ buffer: Buffer; width: number; height: number } | null> {
  const sharp = await loadSharp();

  if (!sharp) {
    return null;
  }

  try {
    const image = sharp(source).rotate();
    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) {
      return null;
    }

    const buffer = await image
      .resize({
        width: THUMB_MAX_WIDTH,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: THUMB_JPEG_QUALITY })
      .toBuffer();

    const resized = await sharp(buffer).metadata();

    return {
      buffer,
      width: resized.width ?? THUMB_MAX_WIDTH,
      height: resized.height ?? THUMB_MAX_WIDTH,
    };
  } catch (error) {
    console.error("[image-thumbnail] resize failed", error);
    return null;
  }
}

export function buildThumbnailStoragePath(storagePath: string): string {
  const slashIndex = storagePath.lastIndexOf("/");

  if (slashIndex === -1) {
    return `thumbs/${storagePath}.jpg`;
  }

  const directory = storagePath.slice(0, slashIndex);
  const fileName = storagePath.slice(slashIndex + 1);
  const baseName = fileName.includes(".")
    ? fileName.slice(0, fileName.lastIndexOf("."))
    : fileName;

  return `${directory}/thumbs/${baseName}.jpg`;
}
