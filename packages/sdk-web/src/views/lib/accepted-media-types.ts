// Kept in sync with the backend's default STORAGE_ALLOWED_MIME_TYPES
// (packages/api/src/config.ts) — deliberately explicit rather than
// "image/*"/"video/*" wildcards, so formats the server will reject (SVG in
// particular, a stored-XSS vector when opened as a raw document) never even
// show up as selectable in the OS file picker in the first place.
export const IMAGE_ACCEPT = 'image/png,image/jpeg,image/gif,image/webp';
export const IMAGE_VIDEO_ACCEPT = `${IMAGE_ACCEPT},video/mp4,video/webm`;
