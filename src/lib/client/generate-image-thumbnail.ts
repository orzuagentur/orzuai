const THUMB_MAX_WIDTH = 320;
const THUMB_JPEG_QUALITY = 0.78;

export async function generateClientImageThumbnail(
  file: File,
): Promise<{ blob: Blob; width: number; height: number } | null> {
  if (!file.type.startsWith("image/")) {
    return null;
  }

  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const scale = Math.min(1, THUMB_MAX_WIDTH / image.naturalWidth);
      const width = Math.max(1, Math.round(image.naturalWidth * scale));
      const height = Math.max(1, Math.round(image.naturalHeight * scale));

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d");

      if (!context) {
        resolve(null);
        return;
      }

      context.drawImage(image, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(null);
            return;
          }

          resolve({ blob, width, height });
        },
        "image/jpeg",
        THUMB_JPEG_QUALITY,
      );
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(null);
    };

    image.src = objectUrl;
  });
}
