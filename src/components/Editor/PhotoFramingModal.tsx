import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { PhotoElement } from '../../types';
import { useAppStore } from '../../data/store';
import { clamp, round } from '../../lib/utils';
import { Modal } from '../UI/Modal';
import { Icon } from '../UI/Icon';
import { RangeField } from './controls';

export function PhotoFramingModal({
  open,
  pageId,
  element,
  onClose,
}: {
  open: boolean;
  pageId: string;
  element: PhotoElement | null;
  onClose: () => void;
}) {
  const photos = useAppStore((state) => state.doc?.photos);
  const mediaUrls = useAppStore((state) => state.mediaUrls);
  const updateElement = useAppStore((state) => state.updateElement);
  const [crop, setCrop] = useState({ zoom: 1, x: 0, y: 0 });
  const [rotate, setRotate] = useState(0);
  const dragRef = useRef<{ x: number; y: number; cropX: number; cropY: number } | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !element) return;
    setCrop(element.crop);
    setRotate(element.imageRotate);
  }, [open, element]);

  if (!element) return null;
  const photo = photos?.find((item) => item.id === element.photoId);
  const url = photo ? mediaUrls[photo.id] ?? photo.src : undefined;
  const ratio = clamp((element.w * 0.75) / Math.max(1, element.h), 0.55, 1.9);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragRef.current = { x: event.clientX, y: event.clientY, cropX: crop.x, cropY: crop.y };
    const onMove = (moveEvent: PointerEvent) => {
      const start = dragRef.current;
      const box = previewRef.current;
      if (!start || !box) return;
      const rect = box.getBoundingClientRect();
      const x = round(clamp(start.cropX + ((moveEvent.clientX - start.x) / rect.width) * 100, -80, 80), 0.5);
      const y = round(clamp(start.cropY + ((moveEvent.clientY - start.y) / rect.height) * 100, -80, 80), 0.5);
      setCrop((current) => ({ ...current, x, y }));
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  const apply = () => {
    updateElement(pageId, element.id, {
      crop: { zoom: crop.zoom, x: crop.x, y: crop.y },
      imageRotate: rotate,
    });
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Frame this photo"
      subtitle="Drag the photo to shift it, then zoom or tilt to taste."
      size="lg"
      footer={
        <>
          <button
            type="button"
            className="btn btn-secondary min-h-9"
            onClick={() => {
              setCrop({ zoom: 1, x: 0, y: 0 });
              setRotate(0);
            }}
          >
            <Icon name="refresh" size={15} /> Reset
          </button>
          <button type="button" className="btn btn-secondary min-h-9" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary min-h-9" onClick={apply}>
            <Icon name="check" size={16} /> Apply framing
          </button>
        </>
      }
    >
      <div className="px-5 pb-5 pt-4 sm:px-6">
        <div
          ref={previewRef}
          className="checker relative mx-auto w-full max-w-lg cursor-grab touch-none overflow-hidden rounded-xl border border-[rgba(73,58,64,.18)] shadow-paper active:cursor-grabbing"
          style={{ aspectRatio: ratio }}
          onPointerDown={onPointerDown}
          role="img"
          aria-label="Photo framing preview. Drag to reposition."
        >
          {url ? (
            <img
              src={url}
              alt=""
              draggable={false}
              className="pointer-events-none h-full w-full select-none object-cover"
              style={{
                transform: `translate(${crop.x}%, ${crop.y}%) scale(${crop.zoom}) rotate(${rotate}deg)`,
              }}
            />
          ) : (
            <div className="grid h-full w-full place-items-center text-deeprose/60">
              <Icon name="image" size={28} />
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 opacity-40" aria-hidden="true">
            <span className="absolute inset-y-0 left-1/3 w-px bg-white/70" />
            <span className="absolute inset-y-0 left-2/3 w-px bg-white/70" />
            <span className="absolute inset-x-0 top-1/3 h-px bg-white/70" />
            <span className="absolute inset-x-0 top-2/3 h-px bg-white/70" />
          </div>
          <span className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[rgba(48,34,40,.55)] px-2.5 py-1 text-[0.6rem] uppercase tracking-[0.14em] text-[#fff8ec]">
            drag to reposition
          </span>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <RangeField
            label="Zoom"
            value={crop.zoom}
            min={1}
            max={3}
            step={0.05}
            suffix="×"
            onChange={(zoom) => setCrop((current) => ({ ...current, zoom }))}
            format={(value) => value.toFixed(2)}
          />
          <RangeField
            label="Tilt"
            value={rotate}
            min={-180}
            max={180}
            suffix="°"
            onChange={setRotate}
          />
          <RangeField
            label="Shift horizontally"
            value={crop.x}
            min={-80}
            max={80}
            onChange={(x) => setCrop((current) => ({ ...current, x }))}
          />
          <RangeField
            label="Shift vertically"
            value={crop.y}
            min={-80}
            max={80}
            onChange={(y) => setCrop((current) => ({ ...current, y }))}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <button
            type="button"
            className="chip min-h-8 text-[0.68rem]"
            onClick={() => setRotate((value) => value - 90)}
          >
            <Icon name="rotate" size={13} /> Turn left
          </button>
          <button
            type="button"
            className="chip min-h-8 text-[0.68rem]"
            onClick={() => setRotate((value) => value + 90)}
          >
            <Icon name="rotate" size={13} /> Turn right
          </button>
          {photo && (
            <span className="ml-auto self-center text-[0.66rem] muted">
              {photo.width} × {photo.height}px original
            </span>
          )}
        </div>
      </div>
    </Modal>
  );
}
