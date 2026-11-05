import { useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useAppStore } from '../../data/store';
import { useAppEffects } from '../../hooks/useAppEffects';
import { WelcomeScene } from '../Scenes/WelcomeScene';
import { CoverScene } from '../Scenes/CoverScene';
import { BookViewer } from '../Scrapbook/BookViewer';
import { Splash } from '../UI/Splash';
import { MissingLink, ShelfError, ShelfScreen } from './ShelfScreen';

export function PublicApp({ slug }: { slug: string | null }) {
  useAppEffects('public');
  const booted = useAppStore((state) => state.booted);
  const boot = useAppStore((state) => state.boot);
  const bootError = useAppStore((state) => state.bootError);
  const doc = useAppStore((state) => state.doc);
  const scene = useAppStore((state) => state.scene);
  const publicMissing = useAppStore((state) => state.publicMissing);
  const profile = useAppStore((state) => state.profile);
  const reduce = useReducedMotion();

  useEffect(() => {
    void boot('public', { slug: slug ?? undefined });
  }, [boot, slug]);

  useEffect(() => {
    if (doc) {
      document.title = doc.meta.title || "Kabbu's Little Scrapbook";
    } else if (profile?.name) {
      document.title = `${profile.name}’s little scrapbooks`;
    }
  }, [doc, profile?.name]);

  if (!booted) return <Splash />;
  if (bootError) return <ShelfError message={bootError} />;
  if (!slug) return <ShelfScreen />;
  if (publicMissing) return <MissingLink slug={slug} />;
  if (!doc) return <ShelfScreen />;

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
