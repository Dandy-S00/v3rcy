export const PROFILE_MEDIA_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
};
export const MAX_PROFILE_MEDIA_BYTES = 25 * 1024 * 1024;
export function getProfileMediaKind(mimeType: string) {
  const extension = PROFILE_MEDIA_EXTENSIONS[mimeType];
  return extension
    ? {
        extension,
        mediaType: mimeType.startsWith("image/")
          ? ("image" as const)
          : ("video" as const),
      }
    : null;
}

const hasBytesAt = (content: Uint8Array, offset: number, signature: number[]) =>
  content.length >= offset + signature.length &&
  signature.every((byte, index) => content[offset + index] === byte);

export function hasProfileMediaAttestation(
  value: string | string[] | undefined
) {
  return value === "true";
}

export function hasValidProfileMediaSignature(
  mimeType: string,
  content: Uint8Array
) {
  if (mimeType === "image/jpeg")
    return hasBytesAt(content, 0, [0xff, 0xd8, 0xff]);
  if (mimeType === "image/png")
    return hasBytesAt(
      content,
      0,
      [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
    );
  if (mimeType === "image/gif")
    return (
      hasBytesAt(content, 0, [0x47, 0x49, 0x46, 0x38, 0x37, 0x61]) ||
      hasBytesAt(content, 0, [0x47, 0x49, 0x46, 0x38, 0x39, 0x61])
    );
  if (mimeType === "image/webp")
    return (
      hasBytesAt(content, 0, [0x52, 0x49, 0x46, 0x46]) &&
      hasBytesAt(content, 8, [0x57, 0x45, 0x42, 0x50])
    );
  if (mimeType === "video/mp4")
    return hasBytesAt(content, 4, [0x66, 0x74, 0x79, 0x70]);
  if (mimeType === "video/webm")
    return hasBytesAt(content, 0, [0x1a, 0x45, 0xdf, 0xa3]);
  return false;
}
