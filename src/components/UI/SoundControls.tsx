import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../../data/store';
import { audio } from '../../lib/audio';
import { Icon } from '../UI/Icon';

export function SoundControls({ dark = false }: { dark?: boolean }) {
  const settings = useAppStore((state) => state.doc?.settings);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (!settings) return null;
  const muted = !settings.music && !settings.sfx;

  const toggleMusic = () => {
    void audio.unlock();
    updateSettings({ music: !settings.music });
    if (!settings.music) audio.sfx('chime');
  };

  const toggleSfx = () => {
    void audio.unlock();
    updateSettings({ sfx: !settings.sfx });
    if (!settings.sfx) audio.sfx('click');
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        className={`icon-btn ${dark ? 'dark' : ''}`}
        aria-label="Sound settings"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          setOpen((value) => !value);
          void audio.unlock();
        }}
      >
        <Icon name={muted ? 'volume-off' : 'volume'} size={18} />
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Sound settings"
          className="absolute right-0 top-full z-50 mt-2 w-[236px] rounded-2xl border border-[rgba(156,100,116,.2)] bg-[#fffaf0]/95 p-4 text-ink shadow-lift backdrop-blur"
        >
          <p className="text-label mb-3 text-deeprose/70">Sound</p>
          <div className="space-y-2.5">
            <button
              type="button"
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition ${
                settings.music ? 'bg-[#f3dcdc]' : 'bg-[#f6ecdf]'
              }`}
              onClick={toggleMusic}
              aria-pressed={settings.music}
            >
              <span className="flex items-center gap-2">
                <Icon name="music" size={16} /> Ambient music
              </span>
              <span
                className={`h-5 w-9 rounded-full p-0.5 transition ${settings.music ? 'bg-[#9c6474]' : 'bg-[#cbb9b3]'}`}
              >
                <span
                  className={`block h-4 w-4 rounded-full bg-[#fffaf0] transition ${settings.music ? 'translate-x-4' : ''}`}
                />
              </span>
            </button>
            <button
              type="button"
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition ${
                settings.sfx ? 'bg-[#f3dcdc]' : 'bg-[#f6ecdf]'
              }`}
              onClick={toggleSfx}
              aria-pressed={settings.sfx}
            >
              <span className="flex items-center gap-2">
                <Icon name="sparkles" size={16} /> Little sounds
              </span>
              <span
                className={`h-5 w-9 rounded-full p-0.5 transition ${settings.sfx ? 'bg-[#9c6474]' : 'bg-[#cbb9b3]'}`}
              >
                <span
                  className={`block h-4 w-4 rounded-full bg-[#fffaf0] transition ${settings.sfx ? 'translate-x-4' : ''}`}
                />
              </span>
            </button>
            <label className="block pt-1">
              <span className="mb-1 flex items-center justify-between text-[11px] uppercase tracking-[0.12em] text-ink/55">
                Volume <span>{Math.round(settings.volume * 100)}%</span>
              </span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={settings.volume}
                onChange={(event) => updateSettings({ volume: Number(event.target.value) })}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[#e2cec7] accent-[#9c6474]"
                aria-label="Sound volume"
              />
            </label>
          </div>
          <p className="mt-3 text-[10px] leading-relaxed text-ink/45">
            Music plays only when you ask it to, and your choice is remembered.
          </p>
        </div>
      )}
    </div>
  );
}
