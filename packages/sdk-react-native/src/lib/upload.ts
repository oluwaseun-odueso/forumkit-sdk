import * as ImagePicker from 'expo-image-picker';
import { uploadAsync, getInfoAsync, FileSystemUploadType } from 'expo-file-system/legacy';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { requestUploadUrl, confirmUpload } from '@forumkit/shared';
import type { AttachmentPurpose } from '@forumkit/types';

// Mobile media upload: pick an image/video, then run the same presigned-upload
// flow the web composer uses (requestUploadUrl → PUT the bytes → confirmUpload).
// The raw byte PUT is the one platform-specific step — web uses fetch(File),
// mobile uses expo-file-system's uploadAsync (BINARY_CONTENT) against the local
// file URI. Everything else is the shared client.

export type UploadedMedia = {
  attachmentId: string;
  downloadUrl: string;
  kind: 'image' | 'video';
  width: number | null;
  height: number | null;
};

// A picked-but-not-yet-necessarily-uploaded attachment, as tracked by the
// composer's own state — mirrors sdk-web's AttachmentFile (uploadStatus +
// a local url shown immediately, before the network round-trip finishes).
// localUri lets the thumbnail render the instant the OS picker returns,
// rather than waiting for requestUploadUrl → PUT → confirmUpload.
export type ComposerAttachment = {
  localId: string;
  localUri: string;
  kind: 'image' | 'video';
  status: 'uploading' | 'uploaded' | 'error';
  attachmentId: string | null;
  downloadUrl: string | null;
  width: number | null;
  height: number | null;
};

function makeLocalId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function makeLocalAttachment(asset: ImagePicker.ImagePickerAsset): ComposerAttachment {
  return {
    localId: makeLocalId(),
    localUri: asset.uri,
    kind: asset.type === 'video' ? 'video' : 'image',
    status: 'uploading',
    attachmentId: null,
    downloadUrl: null,
    width: asset.width ?? null,
    height: asset.height ?? null,
  };
}

// Long edge, px, after resize — a modern phone photo is routinely 3000-4000px
// and several MB; this is what actually makes mobile uploads feel slow next
// to web (where picked files are typically already screen-sized). Chosen to
// comfortably exceed anything the feed/thread views ever display at.
const MAX_DIMENSION = 1600;
const JPEG_COMPRESS = 0.8;

async function compressImage(asset: ImagePicker.ImagePickerAsset): Promise<{ uri: string; width: number; height: number }> {
  const longEdge = Math.max(asset.width, asset.height);
  if (longEdge <= MAX_DIMENSION) return { uri: asset.uri, width: asset.width, height: asset.height };

  const scale = MAX_DIMENSION / longEdge;
  const context = ImageManipulator.manipulate(asset.uri);
  context.resize({ width: Math.round(asset.width * scale), height: Math.round(asset.height * scale) });
  const rendered = await context.renderAsync();
  // PNGs keep their format (screenshots/graphics may rely on transparency);
  // everything else compresses to JPEG, matching the HEIC->JPEG normalisation
  // already done at pick time.
  const format = asset.mimeType === 'image/png' ? SaveFormat.PNG : SaveFormat.JPEG;
  const saved = await rendered.saveAsync({ format, compress: JPEG_COMPRESS });
  return { uri: saved.uri, width: saved.width, height: saved.height };
}

// Uploads a single already-picked asset through the presigned flow. Images are
// downscaled/compressed first (see compressImage); video is uploaded as-is —
// video compression is a much bigger job and out of scope here.
export async function uploadAsset(
  apiUrl: string,
  forumId: string,
  asset: ImagePicker.ImagePickerAsset,
  purpose: AttachmentPurpose,
  token: string,
): Promise<UploadedMedia> {
  const kind: 'image' | 'video' = asset.type === 'video' ? 'video' : 'image';

  let uri = asset.uri;
  let width = asset.width;
  let height = asset.height;
  if (kind === 'image') {
    const compressed = await compressImage(asset);
    uri = compressed.uri;
    width = compressed.width;
    height = compressed.height;
  }

  const filename = asset.fileName ?? `upload.${kind === 'video' ? 'mp4' : 'jpg'}`;
  const mimeType = kind === 'image'
    ? (asset.mimeType === 'image/png' ? 'image/png' : 'image/jpeg')
    : (asset.mimeType ?? 'video/mp4');

  // Compression produces a new file, so asset.fileSize (the original) can't
  // be trusted for images — always re-probe. Video's uri is untouched, so
  // the OS-reported size is still valid and cheaper to use when present.
  let byteSize: number;
  if (kind === 'image') {
    const info = await getInfoAsync(uri);
    byteSize = info.exists && !info.isDirectory ? info.size : 0;
  } else {
    byteSize = asset.fileSize ?? 0;
    if (!byteSize) {
      const info = await getInfoAsync(uri);
      byteSize = info.exists && !info.isDirectory ? info.size : 0;
    }
  }

  const { uploadUrl, uploadHeaders, attachmentId } = await requestUploadUrl(
    apiUrl, forumId, { filename, mimeType, byteSize, purpose }, token,
  );
  await uploadAsync(uploadUrl, uri, {
    httpMethod: 'PUT',
    headers: uploadHeaders,
    uploadType: FileSystemUploadType.BINARY_CONTENT,
  });
  const confirmed = await confirmUpload(apiUrl, forumId, attachmentId, { width, height }, token);
  return { attachmentId, downloadUrl: confirmed.downloadUrl, kind, width, height };
}

// Picks a single image with the native crop UI (aspect-locked) and uploads it —
// used for avatar/banner (the native cropper stands in for web's crop/zoom/
// rotate editor; artistic color filters aren't reproduced). `aspect` is [w,h].
export async function pickAndUploadImage(
  apiUrl: string,
  forumId: string,
  purpose: AttachmentPurpose,
  token: string,
  aspect: [number, number],
): Promise<UploadedMedia | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect,
    quality: 0.9,
    // iOS's photo library defaults to HEIC, which isn't in the backend's
    // storageAllowedMimeTypes allowlist (image/png,jpeg,gif,webp + mp4,webm —
    // same list web's file input accepts) and got rejected with a 422. This
    // asks the OS to hand back the widely-compatible representation (JPEG)
    // instead of transcoding server-side.
    preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
  });
  if (result.canceled || result.assets.length === 0) return null;
  const asset = result.assets[0];
  if (!asset) return null;
  return uploadAsset(apiUrl, forumId, asset, purpose, token);
}

// Just the OS picker call — no upload. Returns as soon as the user finishes
// picking, so callers can render a local preview (via makeLocalAttachment)
// before any network request starts.
export async function pickMedia(opts?: {
  allowsMultipleSelection?: boolean;
  videos?: boolean;
}): Promise<ImagePicker.ImagePickerAsset[]> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: opts?.videos ? ['images', 'videos'] : ['images'],
    allowsMultipleSelection: opts?.allowsMultipleSelection ?? false,
    quality: 0.9,
    // See pickAndUploadImage above — forces JPEG instead of HEIC on iOS.
    preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
  });
  return result.canceled ? [] : result.assets;
}

// Fire-and-forget upload of already-picked assets, reporting each one back to
// the caller as it settles (never as a batch) — callers create the matching
// ComposerAttachment placeholders themselves (via makeLocalAttachment) before
// calling this, for an instant local preview, then patch each entry in place
// as its upload finishes or fails. Uploads run fully in parallel (no
// await-in-loop), and a second pick can be started before earlier uploads
// finish — nothing here blocks on the whole batch.
export function uploadPickedAssets(
  apiUrl: string,
  forumId: string,
  purpose: AttachmentPurpose,
  token: string,
  assets: ImagePicker.ImagePickerAsset[],
  localIds: string[],
  onSettled: (localId: string, result: { ok: true; media: UploadedMedia } | { ok: false }) => void,
): void {
  assets.forEach((asset, i) => {
    const localId = localIds[i];
    if (!localId) return;
    uploadAsset(apiUrl, forumId, asset, purpose, token)
      .then(media => onSettled(localId, { ok: true, media }))
      .catch(() => onSettled(localId, { ok: false }));
  });
}

// Picks image(s)/video from the library and uploads them, waiting for the
// whole batch — used by callers that don't need the optimistic-local-preview
// treatment (currently none in the composer; kept for symmetry/potential
// non-UI callers). Prefer pickMedia + uploadPickedAssets for anything that
// renders a thumbnail.
export async function pickAndUploadMedia(
  apiUrl: string,
  forumId: string,
  purpose: AttachmentPurpose,
  token: string,
  opts?: { allowsMultipleSelection?: boolean; videos?: boolean },
): Promise<UploadedMedia[]> {
  const assets = await pickMedia(opts);
  if (assets.length === 0) return [];
  return Promise.all(assets.map(asset => uploadAsset(apiUrl, forumId, asset, purpose, token)));
}
