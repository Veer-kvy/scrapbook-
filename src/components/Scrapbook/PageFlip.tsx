import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import type { Page } from '../../types';
import { PageCanvas } from './PageCanvas';

function BlankPage({ side, number }: { side: 'left' | 'right' | 'single'; number?: number }) {
  return (
    <div className={`page-sheet ${side} bg-paper-cream h-full w-full`} aria-hidden="true">
      <div className="paper-grain" />
      <div className="page-corner" />
      {number && (
        <span className="page-number" style={side === 'left' ? { left: '5%' } : { right: '5%' }}>
          {String(number).padStart(2, '0')}
        </span>
      )}
    </div>
  );
}

export function PageFlip({
  mode,
  dir,
  from,
  to,
  pages,
  onDone,
}: {
  mode: 'spread' | 'single';
  dir: 1 | -1;
  from: number;
  to: number;
  pages: Page[];
  onDone: () => void;
}) {
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const shadowRef = useRef<HTMLDivElement | null>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    const timeline = gsap.timeline({
      onComplete: () => {
        if (doneRef.current) return;
        doneRef.current = true;
        onDone();
      },
    });
    timeline.to(sheet, {
      rotateY: dir === 1 ? -180 : 180,
      duration: 1.05,
      ease: 'power2.inOut',
    });
    if (shadowRef.current) {
      timeline.fromTo(shadowRef.current, { opacity: 0.08 }, { opacity: 0.6, duration: 0.35 }, 0);
      timeline.to(shadowRef.current, { opacity: 0, duration: 0.5 }, 0.58);
    }
    return () => {
      timeline.kill();
    };
  }, [dir, onDone]);

  let frontIndex: number;
  let backIndex: number;
  if (mode === 'spread') {
    frontIndex = dir === 1 ? from + 1 : from;
    backIndex = dir === 1 ? to : to + 1;
  } else {
    frontIndex = from;
    backIndex = to;
  }

  const frontPage = pages[frontIndex];
  const backPage = pages[backIndex];
  const frontSide: 'left' | 'right' | 'single' =
    mode === 'spread' ? (dir === 1 ? 'right' : 'left') : 'single';
  const backSide: 'left' | 'right' | 'single' =
    mode === 'spread' ? (dir === 1 ? 'left' : 'right') : 'single';

  return (
    <div className="pointer-events-none absolute inset-0 z-[60]" style={{ perspective: '2600px' }}>
      <div
        ref={sheetRef}
        className={`book-flip ${mode === 'single' ? 'single' : ''} ${
          dir === 1 ? 'forward' : 'backward'
        }`}
        style={{ transformStyle: 'preserve-3d' }}
      >
        <div className="flip-face">
          {frontPage ? (
            <PageCanvas
              page={frontPage}
              pageNumber={frontIndex + 1}
              side={frontSide}
              viewOnly
              style={{ width: '100%' }}
            />
          ) : (
            <BlankPage side={frontSide} number={frontIndex + 1} />
          )}
          <div ref={shadowRef} className="flip-shadow" />
        </div>
        <div className="flip-face back">
          {backPage ? (
            <PageCanvas
              page={backPage}
              pageNumber={backIndex + 1}
              side={backSide}
              viewOnly
              style={{ width: '100%' }}
            />
          ) : (
            <BlankPage side={backSide} number={backIndex + 1} />
          )}
        </div>
      </div>
    </div>
  );
}
