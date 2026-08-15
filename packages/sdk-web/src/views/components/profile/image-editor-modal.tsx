import { useState, useCallback, useRef } from 'react';
import Cropper from 'react-easy-crop';
import type { Area, Point } from 'react-easy-crop';
import Modal from '../shared/modal';
import PillButton from '../shared/pill-button';
import { CloseIcon, CameraIcon } from '../shared/icons';
import { cropToCanvas, applyFilterAndVignette, canvasToBlob } from '../../utils/crop-image';
import { IMAGE_ACCEPT } from '../../lib/accepted-media-types';
// Reuses the drafts modal's close-button class rather than a near-identical
// duplicate.
import '../composer/drafts-list-modal.css';
import './image-editor-modal.css';

type FilterPreset = { key: string; label: string; css: string };

const FILTER_PRESETS: FilterPreset[] = [
  { key: 'none', label: 'None', css: '' },
  { key: 'grayscale', label: 'Grayscale', css: 'grayscale(1)' },
  { key: 'sepia', label: 'Sepia', css: 'sepia(0.8)' },
  { key: 'vivid', label: 'Vivid', css: 'saturate(1.6) contrast(1.15)' },
  { key: 'cool', label: 'Cool', css: 'saturate(1.15) hue-rotate(150deg)' },
  { key: 'warm', label: 'Warm', css: 'sepia(0.35) saturate(1.3) hue-rotate(-8deg)' },
];

type ImageEditorModalProps = {
  file: File;
  aspect: number;
  targetWidth: number;
  targetHeight: number;
  onCancel: () => void;
  // May return a Promise — awaited before the editor closes, so a caller
  // that actually saves the image over the network (rather than just
  // stashing the blob locally, as EditProfileModal's own usage does) can
  // keep the editor open with its own error message on failure instead of
  // closing optimistically and losing the failure.
  onConfirm: (blob: Blob) => void | Promise<void>;
};

/**
 * Crop/zoom/rotate/filter/adjust editor for avatar and banner uploads,
 * opened in place of the old immediate auto-crop. react-easy-crop handles
 * the crop/pan/zoom/rotate mechanics and live preview; filters and
 * adjustments (brightness/contrast/saturation/vignette) are hand-rolled —
 * a CSS `filter` string for the live preview, then baked into the exported
 * image via a second canvas pass (see utils/crop-image.ts) since CSS
 * filters can't be read back out of a canvas otherwise.
 */
export default function ImageEditorModal({ file, aspect, targetWidth, targetHeight, onCancel, onConfirm }: ImageEditorModalProps) {
  // The source file is local state, not derived straight from the `file`
  // prop, so "Change photo" can swap it without unmounting/remounting
  // the whole modal (which would otherwise be the only way to change it —
  // exactly what this button exists to avoid).
  const [imageSrc, setImageSrc] = useState(() => URL.createObjectURL(file));
  const pickAnotherInputRef = useRef<HTMLInputElement>(null);

  // Deliberately NOT a useEffect cleanup keyed on imageSrc: React 18
  // StrictMode's dev-only mount->cleanup->mount double-invoke would run
  // that cleanup once immediately after the very first mount, revoking the
  // object URL while it's still the live <img> src inside react-easy-crop's
  // Cropper — the image would never render. Kept in sync with a plain
  // render-time assignment instead (no effect involved) and revoked only at
  // real exit points (close/confirm/replace) below.
  const imageSrcRef = useRef(imageSrc);
  imageSrcRef.current = imageSrc;

  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const [filterKey, setFilterKey] = useState('none');
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [vignette, setVignette] = useState(0);

  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filterPreset = FILTER_PRESETS.find(f => f.key === filterKey) ?? FILTER_PRESETS[0]!;
  const filterString = [filterPreset.css, `brightness(${brightness}%)`, `contrast(${contrast}%)`, `saturate(${saturation}%)`]
    .filter(Boolean)
    .join(' ');

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  function rotate90(direction: 1 | -1) {
    setRotation(r => (r + direction * 90 + 360) % 360);
  }

  function handleClose() {
    URL.revokeObjectURL(imageSrcRef.current);
    onCancel();
  }

  // Swaps the source image in place — resets every crop/rotate/filter/
  // adjust control back to its default, since none of it carries over
  // meaningfully onto a different photo.
  function handlePickAnother(e: React.ChangeEvent<HTMLInputElement>) {
    const newFile = e.target.files?.[0];
    e.target.value = '';
    if (!newFile) return;
    URL.revokeObjectURL(imageSrcRef.current);
    setImageSrc(URL.createObjectURL(newFile));
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setCroppedAreaPixels(null);
    setFilterKey('none');
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setVignette(0);
    setError(null);
  }

  async function handleConfirm() {
    if (!croppedAreaPixels || exporting) return;
    setExporting(true);
    setError(null);
    try {
      const cropped = await cropToCanvas(imageSrc, croppedAreaPixels, rotation, targetWidth, targetHeight);
      const filtered = applyFilterAndVignette(cropped, filterString, vignette);
      const blob = await canvasToBlob(filtered);
      await onConfirm(blob);
      URL.revokeObjectURL(imageSrcRef.current);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not process this image. Try again.');
      setExporting(false);
    }
  }

  return (
    <Modal onClose={handleClose} maxWidth={860} blurBackground>
      <div className="fk-image-editor">
        <div className="fk-image-editor-header">
          <h3 className="fk-image-editor-title">Edit image</h3>
          <button type="button" className="fk-drafts-modal-close" onClick={handleClose}>
            <CloseIcon size={18} />
          </button>
        </div>

        <div className="fk-image-editor-body">
          <div className="fk-image-editor-preview">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={aspect}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onRotationChange={setRotation}
              onCropComplete={onCropComplete}
              style={{ mediaStyle: { filter: filterString } }}
            />
            {vignette > 0 && (
              <div
                className="fk-image-editor-vignette"
                style={{ background: `radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,${vignette / 100}) 100%)` }}
              />
            )}
          </div>

          <div className="fk-image-editor-controls">
            <section className="fk-image-editor-section">
              <div className="fk-image-editor-section-label">Crop &amp; Zoom</div>
              <div className="fk-image-editor-rotate90-row">
                <button type="button" className="fk-image-editor-rotate90-btn" onClick={() => rotate90(-1)} aria-label="Rotate 90° counter-clockwise">
                  <RotateCcwIcon />
                </button>
                <button type="button" className="fk-image-editor-rotate90-btn" onClick={() => rotate90(1)} aria-label="Rotate 90° clockwise">
                  <RotateCwIcon />
                </button>
              </div>
              <label className="fk-image-editor-slider-label">Zoom</label>
              <input
                type="range" min={1} max={3} step={0.01} value={zoom}
                onChange={e => setZoom(Number(e.target.value))}
                className="fk-image-editor-slider"
              />
            </section>

            <section className="fk-image-editor-section">
              <div className="fk-image-editor-section-label">Rotate</div>
              <input
                type="range" min={0} max={359} step={1} value={rotation}
                onChange={e => setRotation(Number(e.target.value))}
                className="fk-image-editor-slider"
              />
            </section>

            <section className="fk-image-editor-section">
              <div className="fk-image-editor-section-label">Filter</div>
              <div className="fk-image-editor-filter-row">
                {FILTER_PRESETS.map(f => (
                  <button
                    key={f.key}
                    type="button"
                    className={`fk-image-editor-filter-swatch${filterKey === f.key ? ' fk-image-editor-filter-swatch--active' : ''}`}
                    onClick={() => setFilterKey(f.key)}
                  >
                    <span
                      className="fk-image-editor-filter-thumb"
                      style={{ backgroundImage: `url(${imageSrc})`, filter: f.css || undefined }}
                    />
                    <span className="fk-image-editor-filter-name">{f.label}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="fk-image-editor-section">
              <div className="fk-image-editor-section-label">Adjust</div>
              <label className="fk-image-editor-slider-label">Brightness</label>
              <input type="range" min={0} max={200} value={brightness} onChange={e => setBrightness(Number(e.target.value))} className="fk-image-editor-slider" />
              <label className="fk-image-editor-slider-label">Contrast</label>
              <input type="range" min={0} max={200} value={contrast} onChange={e => setContrast(Number(e.target.value))} className="fk-image-editor-slider" />
              <label className="fk-image-editor-slider-label">Saturation</label>
              <input type="range" min={0} max={200} value={saturation} onChange={e => setSaturation(Number(e.target.value))} className="fk-image-editor-slider" />
              <label className="fk-image-editor-slider-label">Vignette</label>
              <input type="range" min={0} max={100} value={vignette} onChange={e => setVignette(Number(e.target.value))} className="fk-image-editor-slider" />
            </section>

            {error && <p className="fk-edit-modal-save-error">{error}</p>}
          </div>
        </div>

        <div className="fk-image-editor-footer">
          <PillButton
            variant="surface"
            icon={<CameraIcon size={14} />}
            onClick={() => pickAnotherInputRef.current?.click()}
            disabled={exporting}
          >
            Change photo
          </PillButton>
          <input
            ref={pickAnotherInputRef}
            type="file"
            accept={IMAGE_ACCEPT}
            className="fk-image-editor-file-input"
            onChange={handlePickAnother}
            onClick={e => e.stopPropagation()}
          />
          <div className="fk-image-editor-footer-actions">
            <PillButton variant="surface" onClick={handleClose} disabled={exporting}>Cancel</PillButton>
            <PillButton variant="accent" onClick={() => void handleConfirm()} disabled={exporting || !croppedAreaPixels}>
              {exporting ? 'Saving…' : 'Save'}
            </PillButton>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function RotateCcwIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10a8 8 0 1 1 2.5 6.5" />
      <path d="M3 4v6h6" />
    </svg>
  );
}

function RotateCwIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10a8 8 0 1 0-2.5 6.5" />
      <path d="M21 4v6h-6" />
    </svg>
  );
}
