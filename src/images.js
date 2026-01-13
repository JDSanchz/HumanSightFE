import { API_URL } from "./constants.js";

const resizeImageForUpload = async (file, scale = 0.5, maxBytes = 200 * 1024) => {
  if (!file.type.startsWith("image/")) {
    return file;
  }

  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    bitmap = null;
  }

  if (!bitmap) {
    return file;
  }

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    bitmap.close();
    return file;
  }

  const targetType =
    file.type === "image/jpeg" || file.type === "image/webp"
      ? file.type
      : "image/jpeg";

  const toBlobWithQuality = (quality, width, height) => {
    canvas.width = Math.max(1, Math.round(width));
    canvas.height = Math.max(1, Math.round(height));
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    return new Promise((resolve) => {
      canvas.toBlob(
        (result) => resolve(result || file),
        targetType,
        quality,
      );
    });
  };

  let currentScale = scale;
  let currentQuality = targetType === "image/jpeg" ? 0.9 : 0.92;
  let blob = await toBlobWithQuality(
    currentQuality,
    bitmap.width * currentScale,
    bitmap.height * currentScale,
  );

  const minQuality = 0.5;
  const minScale = 0.2;
  const maxAttempts = 8;
  let attempts = 0;

  while (blob.size > maxBytes && attempts < maxAttempts) {
    attempts += 1;
    if (currentQuality > minQuality) {
      currentQuality = Math.max(minQuality, currentQuality - 0.1);
    } else {
      currentScale = Math.max(minScale, currentScale * 0.85);
    }

    blob = await toBlobWithQuality(
      currentQuality,
      bitmap.width * currentScale,
      bitmap.height * currentScale,
    );
  }

  bitmap.close();
  return new File([blob], file.name, { type: blob.type || file.type });
};

const analyzeImage = async (file, resizedFile = null) => {
  const formData = new FormData();
  const uploadFile = resizedFile || (await resizeImageForUpload(file));
  formData.append("file", uploadFile);

  const response = await fetch(`${API_URL}/analyze`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Failed to analyze image.");
  }

  return response.json();
};

export { analyzeImage, resizeImageForUpload };
