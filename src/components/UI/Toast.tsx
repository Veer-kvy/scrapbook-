import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppStore } from '../../data/store';
import { Icon } from './Icon';

export function Toast() {
  const toast = useAppStore((state) => state.toast);
  const clearToast = useAppStore((state) => state.clearToast);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(clearToast, 3800);
    return () => window.clearTimeout(timer);
  }, [toast, clearToast]);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] z-[120] flex justify-center px-4"
      role="status"
      aria-live="polite"
    >
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className={`pointer-events-auto flex max-w-md items-center gap-2.5 rounded-full px-4 py-2.5 text-sm shadow-lift ${
              toast.tone === 'error'
                ? 'bg-[#8f4a56] text-[#fff4ef]'
                : toast.tone === 'success'
                  ? 'bg-[#4d3a40] text-[#fdf1e4]'
                  : 'bg-[#fff8ec] text-ink'
            }`}
          >
            <Icon
              name={toast.tone === 'error' ? 'warning' : toast.tone === 'success' ? 'check' : 'info'}
              size={16}
            />
            <span className="leading-snug">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
