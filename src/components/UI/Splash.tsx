import { motion, useReducedMotion } from 'framer-motion';
import { Icon } from './Icon';
import { Sticker } from '../Stickers/Sticker';

export function Splash({ label = 'opening the scrapbook…' }: { label?: string }) {
  const reduce = useReducedMotion();
  return (
    <div className="relative flex h-[100dvh] w-full flex-col items-center justify-center gap-6 overflow-hidden">
      <div className="app-backdrop" aria-hidden="true" />
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 flex flex-col items-center gap-5"
      >
        <span className="relative grid h-20 w-20 place-items-center rounded-full border border-[#c98c9d]/40 bg-[rgba(255,248,238,.7)] text-deeprose shadow-paper">
          <Icon name="book" size={30} />
          <span className="absolute -right-1 -top-1 block w-7 rotate-12">
            <Sticker id="heart" />
          </span>
        </span>
        <div className="text-center">
          <p className="font-serif text-[0.66rem] uppercase tracking-[0.42em] text-deeprose/60">
            a handmade keepsake
          </p>
          <p className="mt-2 font-hand text-3xl text-ink">{label}</p>
        </div>
        <span className="flex items-center gap-1.5" aria-hidden="true">
          {[0, 1, 2].map((index) => (
            <span
              key={index}
              className="h-1.5 w-1.5 animate-pulse rounded-full bg-deeprose/50"
              style={{ animationDelay: `${index * 0.18}s` }}
            />
          ))}
        </span>
        <span className="sr-only" role="status">
          Loading
        </span>
      </motion.div>
    </div>
  );
}
