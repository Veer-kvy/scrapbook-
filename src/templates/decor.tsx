import type { CSSProperties } from 'react';
import type { Page } from '../types';
import { pageStyle } from './registry';

/**
 * Chrome that belongs to a template rather than to its content: washes, frames,
 * rules, tape and doodles. Everything here is decorative and non-interactive, so
 * authors can still move and delete every real element on the page.
 */
export function TemplateDecor({ page }: { page: Page }) {
  const style = pageStyle(page);
  const vars = { '--tpl-accent': style.accent } as CSSProperties;

  return (
    <>
      <div
        className={`tpl-decor tpl-decor-${page.template}`}
        style={vars}
        aria-hidden="true"
        data-active={style.decor ? 'true' : 'false'}
      >
        {style.tint !== 'none' && <span className={`tpl-tint tpl-tint-${style.tint}`} />}
        {style.decor && <TemplateChrome template={page.template} />}
      </div>
      {style.border !== 'none' && (
        <span className={`tpl-border tpl-border-${style.border}`} style={vars} aria-hidden="true" />
      )}
    </>
  );
}

function TemplateChrome({ template }: { template: Page['template'] }) {
  switch (template) {
    case 'classic-polaroid':
      return (
        <>
          <span className="tpl-glow tpl-glow-warm" />
          <span className="tpl-tape tpl-tape-a" />
          <span className="tpl-tape tpl-tape-b" />
          <span className="tpl-vignette" />
        </>
      );

    case 'vintage-journal':
      return (
        <>
          <span className="tpl-ornament tpl-ornament-tl" />
          <span className="tpl-ornament tpl-ornament-tr" />
          <span className="tpl-ornament tpl-ornament-bl" />
          <span className="tpl-ornament tpl-ornament-br" />
          <span className="tpl-rule tpl-rule-top" />
          <span className="tpl-rule tpl-rule-bottom" />
          <span className="tpl-vignette tpl-vignette-sepia" />
        </>
      );

    case 'floral-garden':
      return (
        <>
          <svg className="tpl-vine tpl-vine-tl" viewBox="0 0 120 120" fill="none" aria-hidden="true">
            <path
              d="M6 118C8 64 26 24 74 6"
              stroke="var(--tpl-accent)"
              strokeWidth="1.3"
              strokeLinecap="round"
              opacity=".55"
            />
            <ellipse cx="22" cy="86" rx="10" ry="4" fill="var(--tpl-accent)" opacity=".28" transform="rotate(-38 22 86)" />
            <ellipse cx="43" cy="55" rx="9" ry="3.6" fill="var(--tpl-accent)" opacity=".24" transform="rotate(-52 43 55)" />
            <ellipse cx="72" cy="28" rx="8" ry="3.2" fill="var(--tpl-accent)" opacity=".22" transform="rotate(-70 72 28)" />
            <circle cx="64" cy="12" r="4" fill="#E8B8A7" opacity=".65" />
            <circle cx="80" cy="24" r="3" fill="#F3C9CF" opacity=".7" />
          </svg>
          <svg className="tpl-vine tpl-vine-br" viewBox="0 0 120 120" fill="none" aria-hidden="true">
            <path
              d="M6 118C8 64 26 24 74 6"
              stroke="var(--tpl-accent)"
              strokeWidth="1.3"
              strokeLinecap="round"
              opacity=".5"
            />
            <ellipse cx="22" cy="86" rx="10" ry="4" fill="var(--tpl-accent)" opacity=".26" transform="rotate(-38 22 86)" />
            <ellipse cx="43" cy="55" rx="9" ry="3.6" fill="var(--tpl-accent)" opacity=".22" transform="rotate(-52 43 55)" />
            <ellipse cx="72" cy="28" rx="8" ry="3.2" fill="var(--tpl-accent)" opacity=".2" transform="rotate(-70 72 28)" />
            <circle cx="64" cy="12" r="4" fill="#D9A0B0" opacity=".6" />
          </svg>
          <span className="tpl-floral-speckle" />
        </>
      );

    case 'photo-collage':
      return (
        <>
          <span className="tpl-scrap tpl-scrap-a" />
          <span className="tpl-scrap tpl-scrap-b" />
          <span className="tpl-scrap tpl-scrap-c" />
          <span className="tpl-doodle" />
        </>
      );

    case 'love-letter':
      return (
        <>
          <span className="tpl-ruled" />
          <span className="tpl-postmark">
            <span>LOVE</span>
            <span>14 · 02</span>
          </span>
          <span className="tpl-stamp-edge" />
          <span className="tpl-vignette tpl-vignette-soft" />
        </>
      );

    case 'open-when':
      return (
        <>
          <svg className="tpl-paths" viewBox="0 0 100 100" fill="none" aria-hidden="true">
            <path
              d="M50 17C34 22 26 27 26 34M50 17c18 5 27 11 27 18M50 49C36 54 28 58 28 64M50 49c16 5 25 10 25 16"
              stroke="var(--tpl-accent)"
              strokeWidth=".5"
              strokeDasharray="1.6 2.6"
              strokeLinecap="round"
              opacity=".45"
            />
            <circle cx="50" cy="17" r="1" fill="var(--tpl-accent)" opacity=".7" />
          </svg>
          <span className="tpl-glow tpl-glow-pink" />
        </>
      );

    case 'minimal-memory':
      return (
        <>
          <span className="tpl-cross tpl-cross-tl" />
          <span className="tpl-cross tpl-cross-tr" />
          <span className="tpl-cross tpl-cross-bl" />
          <span className="tpl-cross tpl-cross-br" />
        </>
      );

    case 'kawaii':
      return (
        <>
          <span className="tpl-kawaii-dots" />
          <span className="tpl-kawaii-arc" />
          <span className="tpl-kawaii-glitter" />
        </>
      );

    case 'editorial':
      return (
        <>
          <span className="tpl-editorial-top" />
          <span className="tpl-editorial-mid" />
          <span className="tpl-editorial-side" />
          <span className="tpl-editorial-folio">04</span>
        </>
      );

    case 'timeline':
      return (
        <>
          <span className="tpl-timeline-spine" />
          <span className="tpl-timeline-ticks" />
        </>
      );

    case 'photo-gallery':
      return (
        <>
          <span className="tpl-gallery-spot" />
          <span className="tpl-gallery-hairlines" />
          <span className="tpl-gallery-caption">A SMALL EXHIBITION · MMXXIV</span>
          <span className="tpl-vignette tpl-vignette-night" />
        </>
      );

    case 'secret-surprise':
      return (
        <>
          <span className="tpl-stars" />
          <span className="tpl-stars tpl-stars-soft" />
          <span className="tpl-glow tpl-glow-night" />
          <span className="tpl-secret-seal">✦</span>
        </>
      );

    default:
      return null;
  }
}
