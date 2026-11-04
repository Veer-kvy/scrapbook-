import { useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import gsap from 'gsap';
import { useAppStore } from '../../data/store';
import { audio } from '../../lib/audio';
import { Sticker } from '../Stickers/Sticker';
import { PageCanvas } from '../Scrapbook/PageCanvas';
import { Icon } from '../UI/Icon';
import { SoundControls } from '../UI/SoundControls';

export function CoverScene() {
  const doc = useAppStore((state) => state.doc);
  const setScene = useAppStore((state) => state.setScene);
  const reduce = useReducedMotion();
  const coverRef = useRef<HTMLDivElement | null>(null);
  const revealRef = useRef<HTMLDivElement | null>(null);
  const openingRef = useRef(false);
  const [opening, setOpening] = useState(false);

  if (!doc) return null;
  const { meta, pages } = doc;
  const firstPage = pages[0];

  const openCover = () => {
    if (openingRef.current) return;
    openingRef.current = true;
    setOpening(true);
    void audio.unlock();
    audio.sfx('page');
    if (reduce || !coverRef.current) {
      setScene('book');
      return;
    }
    const timeline = gsap.timeline({
      onComplete: () => setScene('book'),
    });
    timeline
      .to(coverRef.current, {
        rotateY: -112,
        duration: 1.25,
        ease: 'power3.inOut',
      })
      .fromTo(
        revealRef.current,
        { opacity: 0.35, scale: 0.965 },
        { opacity: 1, scale: 1, duration: 0.95, ease: 'power2.out' },
        0.05,
      );
  };

  return (
    <div className="relative h-[100dvh] w-full overflow-y-auto overflow-x-hidden">
      <div className="app-backdrop" aria-hidden="true" />

      <div className="relative z-10 flex min-h-[100dvh] flex-col">
        <header className="flex items-center justify-between px-5 pt-5 sm:px-8">
          <button
            type="button"
            className="flex items-center gap-2 text-deeprose/80 transition hover:text-deeprose"
            onClick={() => setScene('welcome')}
            aria-label="Back to the invitation"
          >
            <Icon name="chevron-left" size={18} />
            <span className="text-label">the invitation</span>
          </button>
          <div className="flex items-center gap-2">
            <SoundControls />
          </div>
        </header>

        <main className="flex flex-1 flex-col items-center justify-center px-5 py-7 sm:py-8">
          <p className="mb-5 font-serif text-[0.7rem] uppercase tracking-[0.38em] text-deeprose/55">
            for {meta.recipient}
          </p>

          <div
            className="relative w-[min(86vw,340px)] sm:w-[min(58vw,390px)]"
            style={{ perspective: '2000px' }}
          >
            <div
              ref={revealRef}
              className="pointer-events-none absolute inset-0 overflow-hidden rounded-[7px] bg-cream shadow-lift"
              style={{ opacity: 0.999 }}
              aria-hidden="true"
            >
              <PageCanvas
                page={firstPage}
                pageNumber={1}
                side="single"
                viewOnly
                className="h-full w-full"
              />
            </div>

            <div
              ref={coverRef}
              role="button"
              tabIndex={0}
              aria-label="Open the scrapbook cover"
              className={`cover-board relative aspect-[3/4] w-full ${
                opening ? 'pointer-events-none' : 'cursor-pointer'
              }`}
              style={{
                transformOrigin: 'left center',
                transformStyle: 'preserve-3d',
                backfaceVisibility: 'hidden',
                willChange: 'transform',
              }}
              onClick={openCover}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  openCover();
                }
              }}
            >
              <div className="pointer-events-none absolute inset-[5.5%] rounded-[2px] border border-[#fff7e9]/25" />
              <div className="pointer-events-none absolute inset-[6.5%] rounded-[1px] border border-[#2f2226]/20" />
              <div className="cover-ribbon pointer-events-none" style={{ left: '11%' }} aria-hidden="true" />

              <span
                className="pointer-events-none absolute top-[4%] z-10 block w-[19%] -rotate-6"
                style={{ left: '6.5%' }}
                aria-hidden="true"
              >
                <span className="block aspect-square">
                  <Sticker id="bow" />
                </span>
              </span>

              <div className="cover-label pointer-events-none absolute bottom-[13%] left-[20%] right-[8%] top-[12%] z-[5] flex -rotate-1 flex-col items-center justify-between rounded-[2px] px-4 py-6 text-center sm:px-6 sm:py-8">
                <span className="text-[0.52rem] uppercase tracking-[0.34em] text-deeprose/60 sm:text-[0.6rem]">
                  a keepsake, kept by hand
                </span>
                <h1 className="w-full font-display text-[clamp(1.38rem,6.2vw,2.15rem)] leading-[1.14] text-ink">
                  {meta.title}
                </h1>
                <span className="flex items-center gap-2 text-deeprose/70" aria-hidden="true">
                  <span className="h-px w-7 bg-current opacity-50" />
                  <span className="block w-4">
                    <Sticker id="heart" />
                  </span>
                  <span className="h-px w-7 bg-current opacity-50" />
                </span>
                <p className="max-w-[24ch] font-serif text-[0.95rem] italic leading-snug text-ink/65">
                  {meta.subtitle}
                </p>
                <p className="font-hand text-[1.6rem] text-deeprose">for {meta.recipient}</p>
                <span className="flex flex-col items-center gap-1">
                  <span className="text-[0.5rem] uppercase tracking-[0.28em] text-ink/45">
                    {pages.length} little pages · est. 2025
                  </span>
                  <span className="h-px w-8 bg-ink/20" />
                  <span className="font-serif text-[0.62rem] uppercase tracking-[0.24em] text-ink/50">
                    from {meta.sender}
                  </span>
                </span>
              </div>

              <span
                className="pointer-events-none absolute bottom-[5%] right-[7%] z-[6] block w-[15%] rotate-6"
                aria-hidden="true"
              >
                <span className="block aspect-square">
                  <Sticker id="daisy" />
                </span>
              </span>
              <span
                className="pointer-events-none absolute bottom-[6%] left-[3%] z-[6] block w-[12%] -rotate-12"
                aria-hidden="true"
              >
                <span className="block aspect-square">
                  <Sticker id="rose" />
                </span>
              </span>
              <span
                className="pointer-events-none absolute right-[4%] top-[30%] z-[6] block w-[20%] rotate-6"
                aria-hidden="true"
              >
                <span className="block h-full w-full" style={{ aspectRatio: '3 / 1' }}>
                  <Sticker id="washiCream" />
                </span>
              </span>

              <span className="absolute bottom-[3.5%] left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap font-serif text-[0.6rem] uppercase tracking-[0.28em] text-[#f7e6d7]/70">
                tap to open <Icon name="chevron-right" size={11} />
              </span>
            </div>
          </div>

          <div className="mt-7 flex flex-col items-center gap-2 sm:mt-8">
            <button
              type="button"
              className="btn btn-primary px-6"
              onClick={openCover}
              disabled={opening}
            >
              {opening ? 'Opening…' : 'Open the scrapbook'}
              <Icon name="arrow-right" size={17} />
            </button>
            <p className="font-serif text-xs italic text-ink/50">
              every page has a little something hidden in it
            </p>
          </div>
        </main>

        <footer className="flex items-center justify-between px-5 pb-5 text-[10px] uppercase tracking-[0.22em] text-deeprose/50 sm:px-8 sm:pb-6">
          <span>{pages.length} pages · one person</span>
          <span className="hidden items-center gap-1.5 sm:flex">
            <Icon name="heart" size={12} /> made with love
          </span>
        </footer>
      </div>
    </div>
  );
}
