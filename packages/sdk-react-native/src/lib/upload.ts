import * as ImagePicker from 'expo-image-picker';
import { uploadAsync, getInfoAsync, FileSystemUploadType } from 'expo-file-system/legacy';
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

// Uploads a single local asset (already picked) through the presigned flow.
export async function uploadAsset(
  apiUrl: string,
  forumId: string,
  asset: ImagePicker.ImagePickerAsset,
  purpose: AttachmentPurpose,
  token: string,
): Promise<UploadedMedia> {
  const kind: 'image' | 'video' = asset.type === 'video' ? 'video' : 'image';
  const filename = asset.fileName ?? `upload.${kind === 'video' ? 'mp4' : 'jpg'}`;
  const mimeType = asset.mimeType ?? (kind === 'video' ? 'video/mp4' : 'image/jpeg');

  let byteSize = asset.fileSize ?? 0;
  if (!byteSize) {
    const info = await getInfoAsync(asset.uri);
    byteSize = info.exists && !info.isDirectory ? info.size : 0;
  }

  const { uploadUrl, uploadHeaders, attachmentId } = await requestUploadUrl(
    apiUrl, forumId, { filename, mimeType, byteSize, purpose }, token,
  );
  await uploadAsync(uploadUrl, asset.uri, {
    httpMethod: 'PUT',
    headers: uploadHeaders,
    uploadType: FileSystemUploadType.BINARY_CONTENT,
  });
  const confirmed = await confirmUpload(
    apiUrl, forumId, attachmentId,
    { width: asset.width ?? null, height: asset.height ?? null },
    token,
  );
  return {
    attachmentId,
    downloadUrl: confirmed.downloadUrl,
    kind,
    width: asset.width ?? null,
    height: asset.height ?? null,
  };
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

// Picks image(s)/video from the library and uploads them. `purpose:'attachment'`
// for post/comment media; 'avatar'/'banner' for profile images.
export async function pickAndUploadMedia(
  apiUrl: string,
  forumId: string,
  purpose: AttachmentPurpose,
  token: string,
  opts?: { allowsMultipleSelection?: boolean; videos?: boolean },
): Promise<UploadedMedia[]> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: opts?.videos ? ['images', 'videos'] : ['images'],
    allowsMultipleSelection: opts?.allowsMultipleSelection ?? false,
    quality: 0.9,
    // See pickAndUploadImage above — forces JPEG instead of HEIC on iOS.
    preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
  });
  if (result.canceled) return [];
  const uploaded: UploadedMedia[] = [];
  for (const asset of result.assets) {
    uploaded.push(await uploadAsset(apiUrl, forumId, asset, purpose, token));
  }
  return uploaded;
}
