import { requestUploadUrl, putFile, confirmUpload } from '../../../api/attachments';

// Shared by the post composer's RichTextEditor and the comment composer's
// image/video buttons — both embed the uploaded file inline into the
// TipTap document the same way, so they share the same upload sequence
// (generic attachment pipeline: request a URL, PUT the file, confirm) and
// return both the URL to embed and the attachmentId for the content's
// attachmentIds field.
export async function uploadInline(
  forumId: string,
  sessionToken: string | undefined,
  file: File,
): Promise<{ url: string; attachmentId: string }> {
  const upload = await requestUploadUrl({ forumId, filename: file.name, mimeType: file.type, byteSize: file.size, purpose: 'attachment', token: sessionToken });
  await putFile(upload.uploadUrl, upload.uploadHeaders, file);
  let width: number | null = null;
  let height: number | null = null;
  if (file.type.startsWith('image/')) {
    try {
      const bitmap = await createImageBitmap(file);
      width = bitmap.width;
      height = bitmap.height;
      bitmap.close();
    } catch {
      // dimensions are a display hint only — safe to skip if unsupported
    }
  }
  const attachment = await confirmUpload(forumId, upload.attachmentId, { width, height }, sessionToken);
  return { url: attachment.downloadUrl, attachmentId: upload.attachmentId };
}
