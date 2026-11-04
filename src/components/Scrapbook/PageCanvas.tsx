import { useEffect, useRef, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import type { BackgroundId, Page, ScrapbookElement, StickerId } from '../../types';
import { useAppStore } from '../../data/store';
import { clamp, round } from '../../lib/utils';
import { ElementView } from './Elements';
import { Icon } from '../UI/Icon';
import { Sticker } from '../Stickers/Sticker';

const BG_CLASS: Record<BackgroundId, string> = {
  cream: 'bg-paper-cream',
  blush: 'bg-paper-blush',
  dots: 'bg-paper-dots',
  grid: 'bg-paper-grid',
  sprinkle: 'bg-paper-sprinkle',
  linen: 'bg-paper-linen',
  ombre: 'bg-paper-ombre',
};

const KIND_LABEL: Record<ScrapbookElement['kind'], string> = {
  text: 'text',
  photo: 'photo',
  sticker: 'sticker',
  envelope: 'envelope',
  hidden: 'hidden note',
  button: 'button',
  custom: 'decoration',
};

const MARGIN = 6;

function snappedPosition(value: number, size: number) {
  let next = Math.round(value);
  const candidates = [MARGIN, (100 - size) / 2, 100 - MARGIN - size];
  for (const candidate of candidates) {
    if (Math.abs(value - candidate) < 1.4) {
      next = candidate;
      break;
    }
  }
  return round(clamp(next, -size * 0.4, 100 - size * 0.6), 0.1);
}

const FINAL_DECOR: { sticker: StickerId; x: number; y: number; w: number; delay: number }[] = [  { sticker: 'heart', x: 12, y: 16, w: 4, delay: 0 },
  { sticker: 'sparkle', x: 30, y: 8, w: 3, delay: 1.4 },
  { sticker: 'daisy', x: 88, y: 22, w: 5, delay: 2.6 },
  { sticker: 'heart', x: 8, y: 56, w: 3.6, delay: 0.8 },
  { sticker: 'sparkle', x: 92, y: 56, w: 3.4, delay: 3.2 },
  { sticker: 'butterfly', x: 84, y: 42, w: 5, delay: 1.9 },
  { sticker: 'leaf', x: 16, y: 88, w: 4, delay: 2.2 },
  { sticker: 'star', x: 62, y: 12, w: 3, delay: 3.6 },
];

export function PageCanvas({
  page,
  pageNumber,
  side,
  interactive = false,
  viewOnly = false,
  className = '',
  style,
  snap = false,
  onActivate,
}: {
  page: Page;
  pageNumber: number;
  side: 'left' | 'right' | 'single';
  interactive?: boolean;
  viewOnly?: boolean;
  className?: string;
  style?: CSSProperties;
  snap?: boolean;
  onActivate?: () => void;
}) {
  const pageRef = useRef<HTMLDivElement | null>(null);
  const editor = useAppStore((state) => state.editor);
  const preview = useAppStore((state) => state.preview);
  const selectedId = useAppStore((state) => state.selectedId);
  const select = useAppStore((state) => state.select);
  const updateElement = useAppStore((state) => state.updateElement);
  const removeElement = useAppStore((state) => state.removeElement);
  const duplicateElement = useAppStore((state) => state.duplicateElement);
  const beginGesture = useAppStore((state) => state.beginGesture);
  const endGesture = useAppStore((state) => state.endGesture);

  const canEdit = interactive && editor && !preview && !viewOnly;
  const selected = canEdit ? page.elements.find((el) => el.id === selectedId) : undefined;
  const sorted = [...page.elements].sort((a, b) => a.z - b.z);

  useEffect(() => {
    if (!canEdit || !selected) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (event.key === 'Escape') {
        select(null);
        return;
      }
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        removeElement(page.id, selected.id);
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        duplicateElement(page.id, selected.id);
        return;
      }
      if (event.key.startsWith('Arrow') && !selected.locked) {
        event.preventDefault();
        const step = event.shiftKey ? 2 : 0.4;
        const dx = event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0;
        const dy = event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0;
        updateElement(page.id, selected.id, {
          x: round(clamp(selected.x + dx, -selected.w * 0.4, 100 - selected.w * 0.6), 0.1),
          y: round(clamp(selected.y + dy, -selected.h * 0.4, 100 - selected.h * 0.6), 0.1),
        });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [canEdit, selected, page.id, select, removeElement, duplicateElement, updateElement]);

  const startDrag = (event: ReactPointerEvent<HTMLDivElement>, element: ScrapbookElement) => {
    if (!canEdit) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.stopPropagation();
    onActivate?.();
    select(element.id);
    if (element.locked) return;
    const pageEl = pageRef.current;
    if (!pageEl) return;
    const rect = pageEl.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    let active = false;
    beginGesture();

    const onMove = (moveEvent: PointerEvent) => {
      const dxPx = moveEvent.clientX - startX;
      const dyPx = moveEvent.clientY - startY;
      if (!active && Math.abs(dxPx) + Math.abs(dyPx) < 3) return;
      active = true;
      const dx = (dxPx / rect.width) * 100;
      const dy = (dyPx / rect.height) * 100;
      const nextX = element.x + dx;
      const nextY = element.y + dy;
      updateElement(page.id, element.id, {
        x: snap
          ? snappedPosition(nextX, element.w)
          : round(clamp(nextX, -element.w * 0.4, 100 - element.w * 0.6), 0.1),
        y: snap
          ? snappedPosition(nextY, element.h)
          : round(clamp(nextY, -element.h * 0.4, 100 - element.h * 0.6), 0.1),
      });
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      endGesture();
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  const startResize = (event: ReactPointerEvent<HTMLButtonElement>, element: ScrapbookElement) => {
    event.stopPropagation();
    event.preventDefault();
    const pageEl = pageRef.current;
    if (!pageEl) return;
    const rect = pageEl.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    beginGesture();
    const onMove = (moveEvent: PointerEvent) => {
      const dx = ((moveEvent.clientX - startX) / rect.width) * 100;
      const dy = ((moveEvent.clientY - startY) / rect.height) * 100;
      const w = clamp(element.w + dx, 4, 110);
      const h = clamp(element.h + dy, 4, 110);
      updateElement(page.id, element.id, {
        w: snap ? Math.round(w) : round(w, 0.1),
        h: snap ? Math.round(h) : round(h, 0.1),
      });
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      endGesture();
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  const startRotate = (event: ReactPointerEvent<HTMLButtonElement>, element: ScrapbookElement) => {
    event.stopPropagation();
    event.preventDefault();
    const pageEl = pageRef.current;
    if (!pageEl) return;
    const rect = pageEl.getBoundingClientRect();
    const centerX = rect.left + ((element.x + element.w / 2) / 100) * rect.width;
    const centerY = rect.top + ((element.y + element.h / 2) / 100) * rect.height;
    const startAngle = Math.atan2(event.clientY - centerY, event.clientX - centerX);
    beginGesture();
    const onMove = (moveEvent: PointerEvent) => {
      const angle = Math.atan2(moveEvent.clientY - centerY, moveEvent.clientX - centerX);
      const delta = ((angle - startAngle) * 180) / Math.PI;
      let next = element.rot + delta;
      if (!moveEvent.shiftKey) next = Math.round(next);
      next = ((next + 180) % 360 + 360) % 360 - 180;
      updateElement(page.id, element.id, { rot: next });
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      endGesture();
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  return (
    <div
      ref={pageRef}
      className={`page-sheet ${BG_CLASS[page.bg]} ${side} ${className} ${
        canEdit ? 'select-none' : ''
      }`}
      style={{ containerType: 'size', ...style }}
      role="group"
      aria-label={`Page ${pageNumber}: ${page.name}`}
      onPointerDown={
        canEdit
          ? () => {
              onActivate?.();
              select(null);
            }
          : undefined
      }
    >
      <div className="page-sheet-inner">
        {page.template === 'final' && (
          <div className="pointer-events-none absolute inset-0 z-[2]" aria-hidden="true">
            {FINAL_DECOR.map((petal, index) => (
              <span
                key={index}
                className="absolute animate-drift opacity-70"
                style={{
                  left: `${petal.x}%`,
                  top: `${petal.y}%`,
                  width: `${petal.w}%`,
                  animationDelay: `${petal.delay}s`,
                  animationDuration: `${11 + index}s`,
                }}
              >
                <Sticker id={petal.sticker} />
              </span>
            ))}
          </div>
        )}

        {sorted.map((element) => (
          <div
            key={element.id}
            data-element-id={element.id}
            className={`absolute ${
              canEdit
                ? element.locked
                  ? 'cursor-default'
                  : 'cursor-grab active:cursor-grabbing'
                : ''
            } ${viewOnly ? 'pointer-events-none' : ''}`}
            style={{
              left: `${element.x}%`,
              top: `${element.y}%`,
              width: `${element.w}%`,
              height: `${element.h}%`,
              transform: `rotate(${element.rot}deg)`,
              zIndex: 10 + element.z,
              opacity: element.opacity ?? 1,
              touchAction: canEdit ? 'none' : undefined,
            }}
            onPointerDown={canEdit ? (event) => startDrag(event, element) : undefined}
          >
            <ElementView element={element} editorMode={canEdit} inactive={viewOnly} />
            {canEdit && element.locked && (
              <span className="pointer-events-none absolute -left-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-[#8f5a68] text-[#fff8ec]">
                <Icon name="lock" size={11} />
              </span>
            )}
          </div>
        ))}

        {canEdit && selected && (
          <div
            className="pointer-events-none absolute"
            style={{
              left: `${selected.x}%`,
              top: `${selected.y}%`,
              width: `${selected.w}%`,
              height: `${selected.h}%`,
              transform: `rotate(${selected.rot}deg)`,
              zIndex: 90,
            }}
          >
            <div className="absolute inset-0 border border-dashed border-[#8f5a68] shadow-[0_0_0_1px_rgba(255,248,236,.9)]" />
            <span className="absolute -top-6 left-0 rounded-sm bg-[#8f5a68] px-1.5 py-0.5 text-[9px] uppercase tracking-[0.12em] text-[#fff8ec]">
              {KIND_LABEL[selected.kind]}
            </span>
            {!selected.locked && (
              <>
                <button
                  type="button"
                  className="pointer-events-auto absolute left-1/2 grid h-7 w-7 -translate-x-1/2 place-items-center rounded-full border border-[#fff8ec] bg-[#8f5a68] text-[#fff8ec] shadow-md"
                  style={{ top: -38 }}
                  aria-label="Rotate element"
                  onPointerDown={(event) => startRotate(event, selected)}
                >
                  <Icon name="rotate" size={14} />
                </button>
                <button
                  type="button"
                  className="pointer-events-auto absolute grid h-7 w-7 place-items-center rounded-full border-2 border-[#8f5a68] bg-[#fff8ec] text-[#8f5a68] shadow-md"
                  style={{ right: -14, bottom: -14, cursor: 'nwse-resize' }}
                  aria-label="Resize element"
                  onPointerDown={(event) => startResize(event, selected)}
                >
                  <Icon name="crop" size={13} />
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="paper-grain" />
      <div className="page-corner" />
      <span
        className="page-number"
        style={side === 'left' ? { left: '5%' } : { right: '5%' }}
        aria-hidden="true"
      >
        {String(pageNumber).padStart(2, '0')}
      </span>
    </div>
  );
}
