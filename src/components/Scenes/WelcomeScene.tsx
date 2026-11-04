import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useAppStore } from '../../data/store';
import { audio } from '../../lib/audio';
import { Sticker } from '../Stickers/Sticker';
import { Icon } from '../UI/Icon';
import { SoundControls } from '../UI/SoundControls';

const FLOATERS = [
  { id: 'heart', x: 8, y: 18, w: 6, delay: 0, dur: 9, tilt: -12, hide: false },
  { id: 'daisy', x: 84, y: 12, w: 8, delay: 1.4, dur: 11, tilt: 8, hide: false },
  { id: 'sparkle', x: 16, y: 70, w: 4, delay: 2.2, dur: 8, tilt: 0, hide: true },
  { id: 'butterfly', x: 88, y: 66, w: 7, delay: 0.8, dur: 12, tilt: -6, hide: false },
  { id: 'leaf', x: 6, y: 88, w: 5, delay: 2.8, dur: 10, tilt: 18, hide: true },
  { id: 'heartOutline', x: 74, y: 84, w: 4, delay: 1.1, dur: 9, tilt: 10, hide: true },
  { id: 'star', x: 40, y: 8, w: 3, delay: 0.4, dur: 7, tilt: 0, hide: true },
  { id: 'tulip', x: 93, y: 38, w: 6, delay: 2.0, dur: 13, tilt: 6, hide: true },
] as const;

export function WelcomeScene() {
  const doc = useAppStore((state) => state.doc);
  const setScene = useAppStore((state) => state.setScene);
  const [phase, setPhase] = useState<'closed' | 'opening' | 'letter'>('closed');
  const reduce = useReducedMotion();

  if (!doc) return null;
  const { meta } = doc;

  const openEnvelope = () => {
    if (phase !== 'closed') return;
    void audio.unlock();
    audio.sfx('seal');
    setPhase('opening');
    window.setTimeout(() => audio.sfx('envelope'), 260);
    window.setTimeout(
      () => setPhase('letter'),
      reduce ? 150 : 1250,
    );
  };

  return (
    <div className="relative h-[100dvh] w-full overflow-y-auto overflow-x-hidden">
      <div className="app-backdrop" aria-hidden="true" />

      <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden" aria-hidden="true">
        {FLOATERS.map((floater) => (
          <span
            key={floater.id + floater.x}
            className={`absolute animate-floaty ${floater.hide ? 'hidden sm:block' : ''}`}
            style={{
              left: `${floater.x}%`,
              top: `${floater.y}%`,
              width: `${floater.w}%`,
              maxWidth: 76,
              ['--tilt' as string]: `${floater.tilt}deg`,
              animationDelay: `${floater.delay}s`,
              animationDuration: `${floater.dur}s`,
              opacity: 0.8,
            }}
          >
            <Sticker id={floater.id} />
          </span>
        ))}
      </div>

      <div className="relative z-10 flex min-h-[100dvh] flex-col">
        <header className="flex items-center justify-between px-5 pt-5 sm:px-8 sm:pt-6">
          <div className="flex items-center gap-2 text-deeprose/80">
            <Icon name="book" size={18} />
            <span className="text-label hidden xs:inline">Kabbu&rsquo;s little scrapbook</span>
            <span className="text-label xs:hidden">KABBU</span>
          </div>
          <div className="flex items-center gap-2">
            <SoundControls />
          </div>
        </header>

        <main className="flex flex-1 flex-col items-center justify-center px-5 pb-8 pt-6 text-center sm:px-8">
          <p className="font-serif text-[0.72rem] uppercase tracking-[0.42em] text-deeprose/60">
            A handmade keepsake
          </p>
          <h1 className="mt-4 max-w-[20ch] font-hand text-[2.15rem] leading-[1.15] text-ink text-balance sm:text-[3rem]">
            {meta.welcomeNote}
          </h1>

          <div className="mt-8 w-full max-w-[430px] sm:mt-10">
            <AnimatePresence mode="wait">
              {phase !== 'letter' ? (
                <motion.div
                  key="envelope"
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10, transition: { duration: reduce ? 0 : 0.3 } }}
                  transition={{ duration: reduce ? 0 : 0.7, ease: [0.22, 1, 0.36, 1] }}
                  className="flex flex-col items-center"
                >
                  <button
                    type="button"
                    className="group relative block w-[min(78vw,350px)]"
                    style={{ aspectRatio: '1.55', perspective: '900px' }}
                    onClick={openEnvelope}
                    aria-label="Open the letter"
                  >
                    <div
                      className="absolute inset-x-[7%] top-[8%] bottom-[26%] rounded-[3px] bg-[#fdf4e4] shadow-paper transition-transform duration-700"
                      style={{ transform: phase === 'opening' ? 'translateY(-58%)' : 'translateY(0)' }}
                      aria-hidden="true"
                    >
                      <div className="flex h-full flex-col justify-center gap-2 px-6">
                        <span className="h-[2px] w-4/5 rounded bg-[#d9beb2]/50" />
                        <span className="h-[2px] w-3/5 rounded bg-[#d9beb2]/50" />
                        <span className="h-[2px] w-2/3 rounded bg-[#d9beb2]/50" />
                      </div>
                    </div>
                    <div className={`envelope tone-rose ${phase === 'opening' ? 'opening' : ''}`}>
                      <div className="envelope-paper">
                        <div className="pocket" />
                        <div className="flap" />
                        <div className="address" />
                        <div className="seal" aria-hidden="true">
                          K
                        </div>
                        <div
                          className="label font-hand"
                          style={{ fontSize: 'clamp(1.05rem, 3.4vw, 1.35rem)' }}
                        >
                          for {meta.recipient}
                        </div>
                      </div>
                    </div>
                    <span className="pointer-events-none absolute -bottom-2 left-1/2 h-4 w-[78%] -translate-x-1/2 rounded-full bg-[#9c6474]/15 blur-md transition group-hover:bg-[#9c6474]/25" />
                  </button>

                  <div className="mt-6 flex flex-col items-center gap-3">
                    <button
                      type="button"
                      className="btn btn-primary px-6"
                      onClick={openEnvelope}
                      disabled={phase === 'opening'}
                    >
                      <span>{phase === 'opening' ? 'Opening…' : 'Open Your Scrapbook'}</span>
                      <Icon name="arrow-right" size={17} />
                    </button>
                    <p className="font-serif text-[0.82rem] italic text-ink/55">
                      made for {meta.recipient}, with a lot of love
                    </p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="letter"
                  className="relative w-full"
                  initial={reduce ? { opacity: 0 } : { opacity: 0, scaleY: 0.5, rotateX: -12 }}
                  animate={{ opacity: 1, scaleY: 1, rotateX: 0 }}
                  transition={{ duration: reduce ? 0 : 0.7, ease: [0.22, 1, 0.36, 1] }}
                  style={{ transformOrigin: 'top center' }}
                >
                  <div className="letter-paper relative rounded-[3px] px-6 py-7 text-left sm:px-8 sm:py-9">
                    <p className="relative z-10 whitespace-pre-wrap font-hand text-[1.55rem] leading-[1.45] text-[#4a373d] sm:text-[1.8rem]">
                      Some things are too big for a text message. So I made you a little book — all
                      the moments I never want to forget.
                    </p>
                    <p className="relative z-10 mt-5 font-serif text-[0.98rem] italic leading-relaxed text-ink/65">
                      {meta.coverNote}
                    </p>
                    <div className="relative z-10 mt-7 flex flex-wrap items-center justify-between gap-4">
                      <span className="font-hand text-2xl text-deeprose">for {meta.recipient}</span>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => {
                          audio.sfx('page');
                          setScene('cover');
                        }}
                      >
                        Turn to the cover
                        <Icon name="arrow-right" size={17} />
                      </button>
                    </div>
                    <span className="pointer-events-none absolute -right-3 -top-4 z-20 block h-14 w-14 rotate-6">
                      <Sticker id="stamp" />
                    </span>
                  </div>
                  <p className="mt-4 text-center font-serif text-xs italic text-ink/50">
                    take your time. there&rsquo;s no rush here.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>

        <footer className="flex items-center justify-between px-5 pb-5 text-[10px] uppercase tracking-[0.22em] text-deeprose/50 sm:px-8 sm:pb-6">
          <span>est. in the little things</span>
          <span className="hidden items-center gap-1.5 sm:flex">
            <Icon name="heart" size={12} /> {' '}
            <span>kept by hand</span>
          </span>
        </footer>
      </div>
    </div>
  );
}
