import { useEffect } from 'react';
import { useAppStore } from '../data/store';
import { audio } from '../lib/audio';

/** Shared audio, save and page-lifecycle behaviour for both app scopes. */
export function useAppEffects(scope: 'public' | 'admin') {
  useEffect(() => {
    const unlock = () => {
      void audio.unlock();
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        audio.suspend();
        const state = useAppStore.getState();
        if (state.scope === 'admin' && (state.saveState === 'saving' || state.dirty)) {
          void state.retrySave();
        }
      } else {
        audio.resume();
      }
    };
    const onPageHide = () => {
      void useAppStore.getState().retrySave();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, []);

  useEffect(() => {
    if (scope !== 'admin') return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      const state = useAppStore.getState();
      const pending =
        state.dirty ||
        state.saveState === 'saving' ||
        state.saveState === 'error' ||
        state.saveState === 'conflict';
      if (!pending) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [scope]);

  useEffect(() => {
    const doc = useAppStore.getState().doc;
    if (doc) document.title = doc.meta.title || "Kabbu's Little Scrapbook";
  }, []);
}
