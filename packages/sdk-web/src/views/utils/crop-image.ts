import type { Area } from 'react-easy-crop';

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener('load', () => resolve(img));
    img.addEventListener('error', (err) => reject(err));
    img.setAttribute('crossOrigin', 'anonymous');
    img.src = url;
  });
}

function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

// Standard react-easy-crop "getCroppedImg" recipe, adapted to always output
// a fixed targetWidth/targetHeight canvas (matching what resizeImage used to
// produce, so downstream upload code needs no changes): draw the source
// image onto an oversized canvas rotated around its center, read back just
// the cropped rectangle, then scale that into the final target size.
export async function cropToCanvas(
  imageSrc: string,
  croppedAreaPixels: Area,
  rotation: number,
  targetWidth: number,
  targetHeight: number,
): Promise<HTMLCanvasElement> {
  const image = await createImage(imageSrc);
  const rotRad = degreesToRadians(rotation);

  // Bounding box of the rotated source image, so nothing gets clipped when
  // drawing it rotated around its own center.
  const sin = Math.abs(Math.sin(rotRad));
  const cos = Math.abs(Math.cos(rotRad));
  const boundingWidth = image.width * cos + image.height * sin;
  const boundingHeight = image.width * sin + image.height * cos;

  const rotateCanvas = document.createElement('canvas');
  rotateCanvas.width = boundingWidth;
  rotateCanvas.height = boundingHeight;
  const rotateCtx = rotateCanvas.getContext('2d');
  if (!rotateCtx) throw new Error('Canvas 2D context unavailable');

  rotateCtx.translate(boundingWidth / 2, boundingHeight / 2);
  rotateCtx.rotate(rotRad);
  rotateCtx.translate(-image.width / 2, -image.height / 2);
  rotateCtx.drawImage(image, 0, 0);

  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = targetWidth;
  outputCanvas.height = targetHeight;
  const outputCtx = outputCanvas.getContext('2d');
  if (!outputCtx) throw new Error('Canvas 2D context unavailable');

  outputCtx.drawImage(
    rotateCanvas,
    croppedAreaPixels.x,
    croppedAreaPixels.y,
    croppedAreaPixels.width,
    croppedAreaPixels.height,
    0,
    0,
    targetWidth,
    targetHeight,
  );

  return outputCanvas;
}

// Second pass: composites the CSS filter string (presets + brightness/
// contrast/saturation) and a vignette (CSS `filter` has no vignette
// primitive, so this is a separate radial-gradient overlay multiplied in)
// onto a fresh same-size canvas. Kept as a separate pass from the crop/
// rotate above so ctx.filter is only ever applied to the already-cropped
// pixels, not the whole oversized rotated source — filter-during-crop can
// otherwise sample from outside the intended crop area.
export function applyFilterAndVignette(
  source: HTMLCanvasElement,
  filterString: string,
  vignette: number,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  ctx.filter = filterString || 'none';
  ctx.drawImage(source, 0, 0);
  ctx.filter = 'none';

  if (vignette > 0) {
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const outerRadius = Math.sqrt(cx * cx + cy * cy);
    const gradient = ctx.createRadialGradient(cx, cy, outerRadius * 0.4, cx, cy, outerRadius);
    const strength = vignette / 100;
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, `rgba(0,0,0,${strength})`);
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
  }

  return canvas;
}

export function canvasToBlob(canvas: HTMLCanvasElement, quality = 0.92): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas export failed'));
    }, 'image/jpeg', quality);
  });
}
