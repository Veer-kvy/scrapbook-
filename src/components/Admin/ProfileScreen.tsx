import { useEffect, useState } from 'react';
import { useAppStore } from '../../data/store';
import { publicLink, shelfLink } from '../../lib/slug';
import { copyText } from '../../lib/utils';
import { Icon } from '../UI/Icon';
import { Sticker } from '../Stickers/Sticker';
import { AdminHeader, Field, Input, Textarea } from './ui';

export function ProfileScreen() {
  const profile = useAppStore((state) => state.profile);
  const books = useAppStore((state) => state.books);
  const saveProfile = useAppStore((state) => state.saveProfile);
  const notify = useAppStore((state) => state.notify);
  const backendMode = useAppStore((state) => state.backendMode);

  const [name, setName] = useState(profile?.name ?? '');
  const [note, setNote] = useState(profile?.note ?? '');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setName(profile?.name ?? '');
    setNote(profile?.note ?? '');
  }, [profile?.name, profile?.note]);

  const published = books.filter((book) => book.publishedAt);

  const submit = async () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    await saveProfile({ ...(profile ?? { name: '', note: '' }), name: name.trim(), note: note.trim() });
    setBusy(false);
  };

  const copyShelf = async () => {
    const link = shelfLink();
    const copied = await copyText(link);
    notify(copied ? 'Shelf link copied.' : `Copy this link: ${link}`, copied ? 'success' : 'info');
  };

  return (
    <div>
      <AdminHeader
        title="Profile"
        subtitle="Your name and a small note sit at the top of the public shelf, above every scrapbook you publish."
        actions={
          <a
            href="#/"
            target="_blank"
            rel="noreferrer"
            className="builder-tool min-h-10 px-3"
          >
            <Icon name="eye" size={14} /> View public shelf
          </a>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <section className="admin-card min-w-0 p-4 sm:p-5">
          <h2 className="font-display text-lg text-ink">Who is making these?</h2>
          <p className="mb-3 mt-1 text-[0.72rem] leading-relaxed text-ink/50">
            This is what people see when they open your shelf. Keep it as warm as the book itself.
          </p>
          <div className="space-y-3">
            <Field label="Your name or nickname">
              <Input
                value={name}
                maxLength={48}
                placeholder="Kabbu"
                onChange={(event) => setName(event.target.value)}
              />
            </Field>
            <Field
              label="A short note"
              hint={`${Math.max(0, 160 - note.length)} characters left · shown under your name.`}
            >
              <Textarea
                rows={3}
                value={note}
                maxLength={160}
                placeholder="Making small books for the people I love."
                onChange={(event) => setNote(event.target.value)}
              />
            </Field>
            <button
              type="button"
              className="btn btn-primary min-h-10 w-full"
              disabled={!name.trim() || busy}
              onClick={() => void submit()}
            >
              <Icon name="check" size={14} /> {busy ? 'Saving…' : 'Save profile'}
            </button>
          </div>
        </section>

        <div className="min-w-0 space-y-4">
          <section className="admin-card p-4 sm:p-5">
            <p className="font-serif text-[0.62rem] uppercase tracking-[0.22em] text-deeprose/60">
              Preview
            </p>
            <div className="relative mt-3 overflow-hidden rounded-2xl border border-[rgba(156,100,116,.18)] bg-[linear-gradient(135deg,#fbf3e6,#f5dfda_60%,#eed6c9)] px-5 py-6">
              <span className="pointer-events-none absolute right-4 top-4 w-9 rotate-12 opacity-40" aria-hidden="true">
                <Sticker id="rose" />
              </span>
              <span className="grid h-14 w-14 place-items-center rounded-full border border-white/70 bg-[rgba(255,250,240,.85)] font-display text-xl text-deeprose shadow-sm">
                {(name.trim() || 'K').slice(0, 1).toUpperCase()}
              </span>
              <p className="mt-3 font-display text-2xl leading-tight text-ink">
                {name.trim() || 'Your name here'}
              </p>
              <p className="mt-1 max-w-[34ch] font-serif text-sm italic leading-relaxed text-ink/60">
                {note.trim() || 'A short note about you will appear here.'}
              </p>
              <p className="mt-4 text-[0.62rem] uppercase tracking-[0.16em] text-deeprose/60">
                {published.length} scrapbook{published.length === 1 ? '' : 's'} on the shelf
              </p>
            </div>
          </section>

          <section className="admin-card p-4 sm:p-5">
            <h2 className="font-display text-lg text-ink">The shelf link</h2>
            <p className="mt-1 text-[0.72rem] leading-relaxed text-ink/50">
              One link shows your profile and every published scrapbook. Single books keep their own
              link too — send whichever feels right.
            </p>
            <div className="mt-3 flex items-center gap-1.5 rounded-xl border border-[rgba(156,100,116,.14)] bg-[rgba(255,251,243,.6)] px-2 py-1.5">
              <span className="min-w-0 flex-1 truncate font-mono text-[0.68rem] text-ink/55">
                {shelfLink()}
              </span>
              <button
                type="button"
                className="icon-btn h-7 w-7"
                title="Copy shelf link"
                aria-label="Copy shelf link"
                onClick={() => void copyShelf()}
              >
                <Icon name="copy" size={13} />
              </button>
            </div>
            {published[0] && (
              <div className="mt-2 text-[0.66rem] leading-relaxed text-ink/40">
                <p className="truncate">Newest book: {published[0].title}</p>
                <p className="break-all">{publicLink(published[0].slug)}</p>
              </div>
            )}
            {backendMode === 'local' && (
              <p className="mt-2 text-[0.64rem] leading-relaxed text-ink/40">
                Local mode: this shelf lives in this browser only. Configure Supabase to open it on
                another device.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
