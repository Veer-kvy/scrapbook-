import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useHashRoute } from './hooks/useHashRoute';
import { isAdminRoute } from './lib/router';
import { useAppStore } from './data/store';
import { PublicApp } from './components/Public/PublicApp';
import { AdminApp } from './components/Admin/AdminApp';
import { Icon } from './components/UI/Icon';
import { Toast } from './components/UI/Toast';
import { NoteDialog } from './components/UI/NoteDialog';

function BootNotice() {
  const bootError = useAppStore((state) => state.bootError);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (bootError) setOpen(true);
  }, [bootError]);

  return (
    <AnimatePresence>
      {bootError && open && (
        <motion.div
          key="boot-error"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          role="alert"
          className="fixed inset-x-3 top-3 z-[110] flex items-start gap-3 rounded-2xl border border-[#9c6474]/25 bg-[#fff8ec]/95 px-4 py-3 text-sm text-ink shadow-lift backdrop-blur sm:left-1/2 sm:max-w-lg sm:-translate-x-1/2"
        >
          <span className="mt-0.5 shrink-0 text-[#9c6474]">
            <Icon name="warning" size={18} />
          </span>
          <p className="min-w-0 flex-1 leading-snug">{bootError}</p>
          <button
            type="button"
            className="shrink-0 rounded-full p-1 text-ink/50 transition hover:bg-ink/5 hover:text-ink"
            onClick={() => setOpen(false)}
            aria-label="Dismiss notice"
          >
            <Icon name="close" size={15} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function App() {
  const route = useHashRoute();
  const admin = isAdminRoute(route);

  return (
    <div className="relative min-h-[100dvh] w-full">
      {admin ? <AdminApp route={route} /> : <PublicApp />}
      <BootNotice />
      <NoteDialog />
      <Toast />
    </div>
  );
}
