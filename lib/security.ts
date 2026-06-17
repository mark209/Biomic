const INTERNAL_PATH_PATTERN = /^\/(?!\/)/;
const MAX_INQUIRY_PHOTO_BYTES = 5 * 1024 * 1024;
const ALLOWED_INQUIRY_PHOTO_TYPES = new Map([
  ["image/jpeg", new Set(["jpg", "jpeg"])],
  ["image/png", new Set(["png"])],
  ["image/webp", new Set(["webp"])]
]);

export function safeInternalRedirect(value: string | null, fallback = "/admin") {
  if (!value || !INTERNAL_PATH_PATTERN.test(value)) {
    return fallback;
  }

  try {
    const parsed = new URL(value, "https://local.invalid");
    const path = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    return path.startsWith("/admin") ? path : fallback;
  } catch {
    return fallback;
  }
}

export function getSafeErrorMessage(action = "complete this request") {
  return `Unable to ${action}. Please try again or contact an administrator.`;
}

export function getInquiryPhotoExtension(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

export async function validateInquiryPhoto(file: File) {
  const extension = getInquiryPhotoExtension(file.name);
  const allowedExtensions = ALLOWED_INQUIRY_PHOTO_TYPES.get(file.type);

  if (!allowedExtensions?.has(extension)) {
    return "Upload a JPG, PNG, or WebP image.";
  }

  if (file.size <= 0 || file.size > MAX_INQUIRY_PHOTO_BYTES) {
    return "Upload an image smaller than 5 MB.";
  }

  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng =
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a;
  const isWebp =
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50;

  if (
    (file.type === "image/jpeg" && !isJpeg) ||
    (file.type === "image/png" && !isPng) ||
    (file.type === "image/webp" && !isWebp)
  ) {
    return "The selected file does not match its image type.";
  }

  return null;
}
