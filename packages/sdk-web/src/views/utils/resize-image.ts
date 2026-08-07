export async function resizeImage(
  file: File | Blob,
  targetWidth: number,
  targetHeight: number,
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d')!;

  const scale = Math.max(targetWidth / bitmap.width, targetHeight / bitmap.height);
  const drawW = bitmap.width * scale;
  const drawH = bitmap.height * scale;
  const dx = (targetWidth - drawW) / 2;
  const dy = (targetHeight - drawH) / 2;

  ctx.drawImage(bitmap, dx, dy, drawW, drawH);
  bitmap.close();

  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/jpeg', 0.92)
  );
}
