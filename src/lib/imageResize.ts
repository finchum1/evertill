const MAX_DIMENSION = 256;
const JPEG_QUALITY = 0.85;
const MAX_INPUT_BYTES = 8 * 1024 * 1024;

// Downscales a user-picked image file to a small square-ish JPEG data URL,
// small enough to store directly as a `profiles.avatar_data_url` text
// column rather than needing a Supabase Storage bucket for one small,
// rarely-changed image.
export async function resizeImageToDataUrl(file: File): Promise<string> {
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error("Image is too large (max 8MB).");
  }

  const sourceUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(sourceUrl);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
    const width = Math.round(img.width * scale);
    const height = Math.round(img.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported.");
    ctx.drawImage(img, 0, 0, width, height);

    return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read image file."));
    img.src = url;
  });
}
