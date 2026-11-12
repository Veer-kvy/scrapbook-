import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAppStore } from '../../data/store';
import { Icon } from '../UI/Icon';
import { Input } from '../Admin/ui';
import { ShelfBackdrop } from './ShelfScreen';

export function LockedBook({ slug }: { slug: string }) {
  const unlockPublicBook = useAppStore((state) => state.unlockPublicBook);
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!passcode.trim() || busy) return;
    setBusy(true);
    setError(null);
    const ok = await unlockPublicBook(passcode.trim());
    setBusy(false);
    if (!ok) {
      setError('That passcode is not correct. Ask the sender for the right one.');
      setPasscode('');
    }
  };

  return (
    <div className="relative flex min-h-[100dvh] w-full items-center justify-center overflow-hidden px-5">
      <ShelfBackdrop />
      <div className="relative z-10 w-full max-w-md text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-[#c98c9d]/35 bg-[rgba(255,248,238,.7)] text-deeprose shadow-paper">
          <Icon name="lock" size={26} />
        </span>
        <h1 className="mt-5 font-display text-2xl text-ink">This scrapbook is private</h1>
        <p className="mt-2 font-serif text-sm italic leading-relaxed text-ink/60">
          The sender locked <span className="not-italic">#/s/{slug}</span> with a passcode. Enter it
          to open the book.
        </p>
        <form onSubmit={(event) => void submit(event)} className="mt-5 text-left">
          <label className="block">
            <span className="label">Passcode</span>
            <Input
              type="password"
              value={passcode}
              onChange={(event) => {
                setPasscode(event.target.value);
                setError(null);
              }}
              autoFocus
              autoComplete="off"
              placeholder="The passcode you were given"
            />
          </label>
          {error && (
            <p className="mt-2 text-[0.72rem] leading-snug text-[#8f4a56]" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            className="btn btn-primary mt-3 min-h-10 w-full"
            disabled={!passcode.trim() || busy}
          >
            <Icon name="lock" size={15} /> {busy ? 'Checking…' : 'Open the book'}
          </button>
        </form>
        <a href="#/" className="mt-5 inline-flex items-center gap-1.5 text-[0.68rem] uppercase tracking-[0.18em] text-deeprose/60 transition hover:text-deeprose">
          <Icon name="book" size={12} /> Visit the shelf
        </a>
      </div>
    </div>
  );
}
