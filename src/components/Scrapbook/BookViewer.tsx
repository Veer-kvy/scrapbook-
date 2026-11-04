import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useAppStore } from '../../data/store';
import { useElementSize, useMediaQuery } from '../../hooks/useLayout';
import { audio } from '../../lib/audio';
import { PageFlip } from './PageFlip';
import { SpreadView } from './SpreadView';
import { Icon } from '../UI/Icon';
import { SoundControls } from '../UI/SoundControls';

interface FlipState {
  dir: 1 | -1;
  from: number;
  to: number;
}

interface SlideState {
  kind: 'fade' | 'slide';
  dir: 1 | -1;
  from: number;
  to: number;
}

const SPREAD_BREAKPOINT = '(min-width: 900px)';

export function BookViewer({
  chrome = 'viewer',
  onExit,
}: {
  chrome?: 'viewer' | 'preview';
  onExit?: () => void;
}) {
  const doc = useAppStore((state) => state.doc);
  const pageIndex = useAppStore((state) => state.pageIndex);
  const goToPage = useAppStore((state) => state.goToPage);
  const [flip, setFlip] = useState<FlipState | null>(null);
  const [slide, setSlide] = useState<SlideState | null>(null);
  const [stageRef, stageSize] = useElementSize<HTMLDivElement>();
  const isSpread = useMediaQuery(SPREAD_BREAKPOINT);
  const reduce = useReducedMotion();
  const swipeRef = useRef<{ x: number; y: number } | null>(null);
  const suppressClickUntil = useRef(0);
  const slideTimer = useRef<number | null>(null);

  const pages = doc?.pages ?? [];
  const pageCount = pages.length;
  const step = isSpread ? 2 : 1;
  const start = isSpread ? Math.floor(pageIndex / 2) * 2 : pageIndex;
  const maxStart = isSpread ? Math.floor(Math.max(0, pageCount - 1) / 2) * 2 : pageCount - 1;
  const busy = Boolean(flip || slide);

  useEffect(() => {
    if (pageCount > 0 && pageIndex > pageCount - 1) goToPage(pageCount - 1);
  }, [pageCount, pageIndex, goToPage]);

  useEffect(
    () => () => {
      if (slideTimer.current) window.clearTimeout(slideTimer.current);
    },
    [],
  );

  const bookWidth = (() => {
    if (stageSize.width < 40 || stageSize.height < 40) return 0;
    if (isSpread) return Math.min(stageSize.width, stageSize.height * 1.5);
    return Math.min(stageSize.width, stageSize.height * 0.75);
  })();
  const bookHeight = isSpread ? bookWidth / 1.5 : bookWidth / 0.75;

  const navigate = useCallback(
    (dir: 1 | -1) => {
      if (busy || pageCount === 0) return;
      const target = start + dir * step;
      if (target < 0 || target > maxStart) return;
      audio.sfx('page');
      const transition = pages[start]?.transition ?? 'turn';
      if (reduce || transition === 'none') {
        goToPage(target);
        return;
      }
      if (transition === 'turn') {
        setFlip({ dir, from: start, to: target });
        return;
      }
      setSlide({ kind: transition, dir, from: start, to: target });
      slideTimer.current = window.setTimeout(() => {
        goToPage(target);
        setSlide(null);
        slideTimer.current = null;
      }, reduce ? 0 : 430);
    },
    [busy, pageCount, start, step, maxStart, pages, reduce, goToPage],
  );

  useEffect(() => {
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
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        navigate(1);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        navigate(-1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [navigate]);

  if (!doc || pageCount === 0) return null;

  const canPrev = start > 0;
  const canNext = start + step <= maxStart;

  let baseStart = start;
  if (flip) {
    baseStart = isSpread ? (flip.dir === 1 ? flip.from : flip.to) : flip.to;
  }

  const dotCount = isSpread ? Math.ceil(pageCount / 2) : pageCount;
  const activeDot = isSpread ? Math.floor(start / 2) : pageIndex;

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (busy) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    swipeRef.current = { x: event.clientX, y: event.clientY };
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const startPoint = swipeRef.current;
    swipeRef.current = null;
    if (!startPoint || busy) return;
    const dx = event.clientX - startPoint.x;
    const dy = event.clientY - startPoint.y;
    if (Math.abs(dx) > 64 && Math.abs(dx) > Math.abs(dy) * 1.3) {
      suppressClickUntil.current = Date.now() + 400;
      navigate(dx < 0 ? 1 : -1);
    }
  };

  return (
    <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden">
      <div className="app-backdrop" aria-hidden="true" />

      <header className="view-topbar absolute inset-x-0 top-0 z-30 flex items-center justify-between gap-3 px-3 pb-8 pt-3 sm:px-6 sm:pt-4">
        <div className="flex min-w-0 items-center gap-2.5">
          {chrome === 'viewer' && (
            <button
              type="button"
              className="icon-btn"
              onClick={() => {
                audio.sfx('click');
                onExit?.();
              }}
              aria-label="Close the book and return to the cover"
              title="Back to cover"
            >
              <Icon name="book" size={18} />
            </button>
          )}
          {chrome === 'preview' && (
            <button
              type="button"
              className="icon-btn"
              onClick={onExit}
              aria-label="Leave the preview"
              title="Back to the dashboard"
            >
              <Icon name="arrow-left" size={18} />
            </button>
          )}
          <div className="hidden min-w-0 sm:block">
            <p className="truncate font-display text-sm leading-tight text-ink">{doc.meta.title}</p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-deeprose/60">
              {chrome === 'preview' ? 'draft preview · not published' : `for ${doc.meta.recipient}`}
            </p>
          </div>
          {chrome === 'preview' && (
            <span className="admin-tag draft shrink-0">Draft preview</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden rounded-full border border-[rgba(156,100,116,.18)] bg-[rgba(255,248,238,.7)] px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-deeprose/70 sm:inline">
            {isSpread
              ? `pages ${start + 1}–${Math.min(start + 2, pageCount)} of ${pageCount}`
              : `page ${pageIndex + 1} of ${pageCount}`}
          </span>
          <SoundControls />
        </div>
      </header>

      <div
        ref={stageRef}
        className="book-stage relative flex min-h-0 flex-1 items-center justify-center px-3 pb-[92px] pt-[68px] sm:px-16 sm:pb-[104px] sm:pt-[84px]"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onClickCapture={(event) => {
          if (Date.now() < suppressClickUntil.current) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
        style={{ touchAction: 'pan-y' }}
      >
        {bookWidth > 0 && (
          <div className="relative" style={{ width: bookWidth, height: bookHeight }}>
            <div className="absolute inset-0 rounded-[10px] bg-[#8f5f6a]/25 blur-2xl" aria-hidden="true" />
            <div
              className={`book-shell relative h-full w-full ${busy ? 'pointer-events-none' : ''}`}
              style={{ perspective: '2600px' }}
            >
              <SpreadView pages={pages} start={baseStart} isSpread={isSpread} interactive={!busy} />

              {flip && (
                <PageFlip
                  mode={isSpread ? 'spread' : 'single'}
                  dir={flip.dir}
                  from={flip.from}
                  to={flip.to}
                  pages={pages}
                  onDone={() => {
                    goToPage(flip.to);
                    setFlip(null);
                  }}
                />
              )}

              {slide && (
                <div className="pointer-events-none absolute inset-0 z-[60] overflow-hidden rounded-[10px]">
                  <motion.div
                    className="absolute inset-0 flex"
                    initial={
                      slide.kind === 'fade'
                        ? { opacity: 0 }
                        : { x: slide.dir === 1 ? '100%' : '-100%' }
                    }
                    animate={slide.kind === 'fade' ? { opacity: 1 } : { x: 0 }}
                    transition={{ duration: reduce ? 0 : 0.42, ease: [0.22, 1, 0.36, 1] }}
                    style={{ boxShadow: 'inset 0 0 40px rgba(73,58,64,.08)' }}
                  >
                    <SpreadView
                      pages={pages}
                      start={slide.to}
                      isSpread={isSpread}
                      interactive={false}
                    />
                  </motion.div>
                </div>
              )}
            </div>

            <div
              className="pointer-events-none absolute -bottom-5 right-[10%] hidden h-14 w-4 sm:block"
              style={{
                background: 'linear-gradient(180deg,#c98c9d,#965f6d)',
                clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 82%, 0 100%)',
                boxShadow: '0 6px 10px -6px rgba(73,58,64,.6)',
              }}
              aria-hidden="true"
            />
          </div>
        )}

        {!busy && (
          <>
            <button
              type="button"
              className="icon-btn absolute left-2 top-1/2 z-40 hidden h-11 w-11 -translate-y-1/2 sm:grid md:left-5"
              onClick={() => navigate(-1)}
              disabled={!canPrev}
              aria-label="Previous pages"
            >
              <Icon name="chevron-left" size={20} />
            </button>
            <button
              type="button"
              className="icon-btn absolute right-2 top-1/2 z-40 hidden h-11 w-11 -translate-y-1/2 sm:grid md:right-5"
              onClick={() => navigate(1)}
              disabled={!canNext}
              aria-label="Next pages"
            >
              <Icon name="chevron-right" size={20} />
            </button>
          </>
        )}
      </div>

      <footer className="absolute inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 px-3 pb-[calc(0.9rem+env(safe-area-inset-bottom,0px))] sm:px-8">
        <button
          type="button"
          className="btn btn-secondary min-w-0 gap-1.5 px-3.5 max-sm:px-3"
          onClick={() => navigate(-1)}
          disabled={!canPrev || busy}
          aria-label="Previous page"
        >
          <Icon name="chevron-left" size={16} />
          <span className="hidden xs:inline">Back</span>
        </button>

        <div className="flex min-w-0 flex-col items-center gap-1.5">
          <div className="flex max-w-[62vw] items-center justify-center gap-1.5 overflow-x-auto hide-scrollbar">
            {Array.from({ length: dotCount }).map((_, index) => (
              <button
                key={index}
                type="button"
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === activeDot ? 'w-5 bg-deeprose' : 'w-2 bg-deeprose/25 hover:bg-deeprose/45'
                }`}
                onClick={() => {
                  if (busy) return;
                  audio.sfx('click');
                  goToPage(isSpread ? index * 2 : index);
                }}
                aria-label={isSpread ? `Go to pages ${index * 2 + 1}` : `Go to page ${index + 1}`}
                aria-current={index === activeDot}
              />
            ))}
          </div>
          <span className="text-[10px] uppercase tracking-[0.2em] text-deeprose/60">
            {isSpread
              ? `${start + 1}–${Math.min(start + 2, pageCount)} / ${pageCount}`
              : `${pageIndex + 1} / ${pageCount}`}
            <span className="ml-2 hidden normal-case tracking-normal text-ink/35 sm:inline">
              · swipe or use arrow keys
            </span>
          </span>
        </div>

        <button
          type="button"
          className="btn btn-secondary min-w-0 gap-1.5 px-3.5 max-sm:px-3"
          onClick={() => navigate(1)}
          disabled={!canNext || busy}
          aria-label="Next page"
        >
          <span className="hidden xs:inline">Next</span>
          <Icon name="chevron-right" size={16} />
        </button>
      </footer>
    </div>
  );
}
