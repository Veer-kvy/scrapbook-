import { useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useAppStore } from '../../data/store';
import { useAppEffects } from '../../hooks/useAppEffects';
import { WelcomeScene } from '../Scenes/WelcomeScene';
import { CoverScene } from '../Scenes/CoverScene';
import { BookViewer } from '../Scrapbook/BookViewer';
import { Splash } from '../UI/Splash';
import { Icon } from '../UI/Icon';
import { Sticker } from '../Stickers/Sticker';

function NotPublished() {
  return (
    <div className="relative flex h-[100dvh] w-full items-center justify-center overflow-hidden px-5">
      <div className="app-backdrop" aria-hidden="true" />
      <div className="relative z-10 max-w-sm text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-[#c98c9d]/35 bg-[rgba(255,248,238,.7)] text-deeprose shadow-paper">
          <Icon name="book" size={26} />
        </span>
        <h1 className="mt-5 font-display text-2xl text-ink">Nothing is live just yet</h1>
        <p className="mt-2 font-serif text-sm italic leading-relaxed text-ink/60">
          This scrapbook has not been published from the studio yet. When it is, the whole book
          will appear here — envelopes, pages, letters and all.
        </p>
        <a
          href="#/admin/login"
          className="btn btn-secondary mt-6 inline-flex min-h-10"
        >
          <Icon name="lock" size={15} /> Open the studio
        </a>
      </div>
      <span className="pointer-events-none absolute bottom-8 right-8 block w-10 rotate-12 opacity-60" aria-hidden="true">
        <Sticker id="heart" />
      </span>
    </div>
  );
}

export function PublicApp() {
  useAppEffects('public');
  const booted = useAppStore((state) => state.booted);
  const boot = useAppStore((state) => state.boot);
  const doc = useAppStore((state) => state.doc);
  const scene = useAppStore((state) => state.scene);
  const reduce = useReducedMotion();

  useEffect(() => {
    void boot('public');
  }, [boot]);

  useEffect(() => {
    if (doc) document.title = doc.meta.title || "Kabbu's Little Scrapbook";
  }, [doc]);

  if (!booted) return <Splash />;
  if (!doc) return <NotPublished />;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={scene}
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.995 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.998 }}
        transition={{ duration: reduce ? 0.12 : 0.42, ease: [0.22, 1, 0.36, 1] }}
        className="h-[100dvh] w-full overflow-hidden"
      >
        {scene === 'welcome' && <WelcomeScene />}
        {scene === 'cover' && <CoverScene />}
        {scene === 'book' && <BookViewer />}
      </motion.div>
    </AnimatePresence>
  );
}
