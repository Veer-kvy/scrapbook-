import type { Page } from '../../types';
import { PageCanvas } from './PageCanvas';

export function BlankSheet({
  side,
  label,
}: {
  side: 'left' | 'right' | 'single';
  label?: string;
}) {
  return (
    <div className={`page-sheet ${side} bg-paper-cream`} aria-hidden="true">
      <div className="paper-grain" />
      <div className="page-corner" />
      {label && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="rotate-[-3deg] rounded-sm border border-[#c98c9d]/30 px-5 py-2 font-hand text-2xl text-[#c98c9d]/70">
            {label}
          </span>
        </div>
      )}
    </div>
  );
}

/** Read-only spread or single page, used by the public reader and admin preview. */
export function SpreadView({
  pages,
  start,
  isSpread,
  interactive,
}: {
  pages: Page[];
  start: number;
  isSpread: boolean;
  interactive: boolean;
}) {
  const viewOnly = !interactive;

  if (!isSpread) {
    const page = pages[start];
    if (!page) return <BlankSheet side="single" />;
    return (
      <PageCanvas
        page={page}
        pageNumber={start + 1}
        side="single"
        className="single"
        viewOnly={viewOnly}
        style={{ width: '100%' }}
      />
    );
  }

  const left = pages[start];
  const right = pages[start + 1];

  return (
    <>
      {left ? (
        <PageCanvas
          page={left}
          pageNumber={start + 1}
          side="left"
          viewOnly={viewOnly}
          style={{ width: '50%' }}
        />
      ) : (
        <div style={{ width: '50%' }}>
          <BlankSheet side="left" />
        </div>
      )}
      {right ? (
        <PageCanvas
          page={right}
          pageNumber={start + 2}
          side="right"
          viewOnly={viewOnly}
          style={{ width: '50%' }}
        />
      ) : (
        <div style={{ width: '50%' }}>
          <BlankSheet side="right" label="the end, for now" />
        </div>
      )}
      <div className="book-spine" />
    </>
  );
}
