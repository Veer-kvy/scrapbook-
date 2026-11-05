import { useEffect, useState } from 'react';
import type { BookSummary } from '../../types';
import { useAppStore } from '../../data/store';
import { navigate } from '../../lib/router';
import { isValidSlug, publicLink } from '../../lib/slug';
import { copyText, relativeTime } from '../../lib/utils';
import { Icon } from '../UI/Icon';
import { Modal } from '../UI/Modal';
import { Sticker } from '../Stickers/Sticker';
import { AdminHeader, EmptyState, Field, Input } from './ui';

function NewBookModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createBook = useAppStore((state) => state.createBook);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setTitle('');
  }, [open]);

  const create = async () => {
    const trimmed = title.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    const book = await createBook(trimmed);
    setBusy(false);
    if (book) {
      onClose();
      navigate('/admin/dashboard');
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Start a new scrapbook"
      subtitle="Every scrapbook is its own little book, with its own link to share."
      footer={
        <>
          <button type="button" className="chip min-h-10 px-4" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary min-h-10"
            disabled={!title.trim() || busy}
            onClick={() => void create()}
          >
            <Icon name="plus" size={14} /> {busy ? 'Creating…' : 'Create scrapbook'}
          </button>
        </>
      }
    >
      <div className="space-y-3 px-5 pb-5 pt-4 sm:px-6">
        <Field
          label="What should the cover say?"
          hint="You can change this any time. Pages and photos start empty until you add them."
        >
          <Input
            value={title}
            maxLength={60}
            autoFocus
            placeholder="For Kabbu, with love"
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void create();
            }}
          />
        </Field>
      </div>
    </Modal>
  );
}

function DetailsModal({
  book,
  onClose,
}: {
  book: BookSummary | null;
  onClose: () => void;
}) {
  const updateBook = useAppStore((state) => state.updateBook);
  const [title, setTitle] = useState('');
  const [recipient, setRecipient] = useState('');
  const [slug, setSlug] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!book) return;
    setTitle(book.title);
    setRecipient(book.recipient);
    setSlug(book.slug);
  }, [book]);

  if (!book) return null;

  const trimmedSlug = slug.trim();
  const slugProblem = isValidSlug(trimmedSlug)
    ? null
    : 'Use 3–40 lowercase letters, numbers or single dashes.';

  const save = async () => {
    if (slugProblem || !title.trim() || busy) return;
    setBusy(true);
    const saved = await updateBook(book.id, {
      title: title.trim(),
      recipient: recipient.trim(),
      slug: trimmedSlug,
    });
    setBusy(false);
    if (saved) onClose();
  };

  return (
    <Modal
      open={Boolean(book)}
      onClose={onClose}
      title="Scrapbook details"
      subtitle="The title, who it is for, and the address people open."
      footer={
        <>
          <button type="button" className="chip min-h-10 px-4" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary min-h-10"
            disabled={Boolean(slugProblem) || !title.trim() || busy}
            onClick={() => void save()}
          >
            <Icon name="check" size={14} /> {busy ? 'Saving…' : 'Save details'}
          </button>
        </>
      }
    >
      <div className="space-y-3 px-5 pb-5 pt-4 sm:px-6">
        <Field label="Title">
          <Input
            value={title}
            maxLength={60}
            onChange={(event) => setTitle(event.target.value)}
          />
        </Field>
        <Field label="For (recipient)">
          <Input
            value={recipient}
            maxLength={60}
            placeholder="Someone lovely"
            onChange={(event) => setRecipient(event.target.value)}
          />
        </Field>
        <Field
          label="Public link"
          hint="Lowercase letters, numbers and dashes. Changing it breaks any link you already shared."
        >
          <Input
            value={slug}
            maxLength={40}
            spellCheck={false}
            autoCapitalize="none"
            onChange={(event) => setSlug(event.target.value)}
          />
        </Field>
        <p
          className={`break-all rounded-xl border px-3 py-2 text-[0.7rem] leading-relaxed ${
            slugProblem
              ? 'border-[rgba(155,79,93,.3)] bg-[rgba(155,79,93,.08)] text-[#8f4a56]'
              : 'border-[rgba(156,100,116,.16)] bg-[rgba(255,251,243,.6)] text-ink/55'
          }`}
        >
          {slugProblem ?? publicLink(trimmedSlug)}
        </p>
        {book.publishedAt && trimmedSlug !== book.slug && (
          <p className="flex items-start gap-1.5 text-[0.7rem] leading-relaxed text-[#8f4a56]">
            <Icon name="warning" size={13} className="mt-0.5 shrink-0" />
            This scrapbook is already live on its old link. The new link works as soon as you save.
          </p>
        )}
      </div>
    </Modal>
  );
}

export function BooksScreen() {
  const books = useAppStore((state) => state.books);
  const booksLoading = useAppStore((state) => state.booksLoading);
  const activeBookId = useAppStore((state) => state.activeBookId);
  const loadBooks = useAppStore((state) => state.loadBooks);
  const openBook = useAppStore((state) => state.openBook);
  const duplicateBook = useAppStore((state) => state.duplicateBook);
  const deleteBook = useAppStore((state) => state.deleteBook);
  const notify = useAppStore((state) => state.notify);
  const backendMode = useAppStore((state) => state.backendMode);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<BookSummary | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);

  useEffect(() => {
    void loadBooks();
  }, [loadBooks]);

  const open = async (book: BookSummary) => {
    if (openingId) return;
    setOpeningId(book.id);
    await openBook(book.id);
    setOpeningId(null);
    navigate('/admin/dashboard');
  };

  const copy = async (book: BookSummary) => {
    const link = publicLink(book.slug);
    const copied = await copyText(link);
    notify(copied ? 'Public link copied — send it to anyone.' : `Copy this link: ${link}`, copied ? 'success' : 'info');
  };

  const remove = async (book: BookSummary) => {
    if (
      !window.confirm(
        `Delete “${book.title}”? Its public link stops working and every saved version of this scrapbook is removed. This cannot be undone.`,
      )
    ) {
      return;
    }
    await deleteBook(book.id);
  };

  return (
    <div>
      <AdminHeader
        title="My scrapbooks"
        subtitle="Each scrapbook you make has its own pages, photos and a private-to-share link. Open one to edit it, or start something new."
        actions={
          <button type="button" className="btn btn-primary min-h-10" onClick={() => setCreating(true)}>
            <Icon name="plus" size={15} /> New scrapbook
          </button>
        }
      />

      {booksLoading && !books.length ? (
        <div className="admin-card px-6 py-12 text-center text-sm text-ink/50">
          Gathering your scrapbooks…
        </div>
      ) : !books.length ? (
        <EmptyState
          icon="book"
          title="No scrapbooks yet"
          body="Start your first one — it takes a title and a little courage. You can add pages and photos right after."
          action={
            <button type="button" className="btn btn-primary min-h-10" onClick={() => setCreating(true)}>
              <Icon name="plus" size={15} /> Create the first scrapbook
            </button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {books.map((book) => {
            const active = book.id === activeBookId;
            return (
              <article key={book.id} className="admin-card flex flex-col overflow-hidden">
                <button
                  type="button"
                  onClick={() => void open(book)}
                  className="group relative block w-full text-left"
                  aria-label={`Open ${book.title}`}
                >
                  <span className="relative block aspect-[16/9] w-full overflow-hidden bg-[linear-gradient(135deg,#f9efdf_0%,#f2dcd8_52%,#e7d3c6_100%)]">
                    <span className="absolute inset-y-0 left-0 w-2.5 bg-[rgba(156,100,116,.16)]" />
                    <span className="absolute inset-y-0 left-2.5 w-px bg-[rgba(255,255,255,.6)]" />
                    <span className="absolute inset-0 flex flex-col justify-center pl-7 pr-20">
                      <span className="font-serif text-[0.56rem] uppercase tracking-[0.22em] text-deeprose/70">
                        A scrapbook for {book.recipient || 'someone lovely'}
                      </span>
                      <span className="mt-1 line-clamp-2 font-display text-xl leading-tight text-ink">
                        {book.title}
                      </span>
                      <span className="mt-2 font-hand text-base text-ink/55">
                        {book.pageCount} page{book.pageCount === 1 ? '' : 's'} · {book.photoCount} photo
                        {book.photoCount === 1 ? '' : 's'}
                      </span>
                    </span>
                    <span className="absolute right-3 top-3 w-8 rotate-12 opacity-70" aria-hidden="true">
                      <Sticker id="heart" />
                    </span>
                    <span className="absolute bottom-2 right-3 text-[0.6rem] uppercase tracking-[0.14em] text-ink/35">
                      {openingId === book.id ? 'opening…' : 'open'}
                    </span>
                  </span>
                </button>

                <div className="flex flex-1 flex-col gap-3 p-4">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {book.publishedAt ? (
                      <span className="admin-tag live">
                        <Icon name="check" size={11} /> v{book.versionNumber} live
                      </span>
                    ) : (
                      <span className="admin-tag draft">
                        <Icon name="info" size={11} /> Draft only
                      </span>
                    )}
                    {active && <span className="admin-tag">Editing now</span>}
                    <span className="ml-auto text-[0.64rem] text-ink/40">
                      {relativeTime(book.updatedAt)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 rounded-xl border border-[rgba(156,100,116,.14)] bg-[rgba(255,251,243,.6)] px-2 py-1.5">
                    <span className="min-w-0 flex-1 truncate font-mono text-[0.68rem] text-ink/55">
                      #/s/{book.slug}
                    </span>
                    <button
                      type="button"
                      className="icon-btn h-7 w-7"
                      title="Copy public link"
                      aria-label={`Copy the link for ${book.title}`}
                      onClick={() => void copy(book)}
                    >
                      <Icon name="copy" size={13} />
                    </button>
                    <a
                      href={`#/s/${book.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="icon-btn h-7 w-7"
                      title="Open the public link"
                      aria-label={`Open the public link for ${book.title}`}
                    >
                      <Icon name="arrow-right" size={13} />
                    </a>
                  </div>

                  <div className="mt-auto flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      className="chip min-h-8 px-2.5 text-[0.68rem]"
                      onClick={() => void open(book)}
                      disabled={Boolean(openingId)}
                    >
                      <Icon name="edit" size={12} /> Edit
                    </button>
                    <button
                      type="button"
                      className="chip min-h-8 px-2.5 text-[0.68rem]"
                      onClick={() => setEditing(book)}
                    >
                      <Icon name="sliders" size={12} /> Details
                    </button>
                    <button
                      type="button"
                      className="chip min-h-8 px-2.5 text-[0.68rem]"
                      onClick={() => void duplicateBook(book.id)}
                    >
                      <Icon name="copy" size={12} /> Duplicate
                    </button>
                    <button
                      type="button"
                      className="chip min-h-8 px-2.5 text-[0.68rem] text-[#8f4a56]"
                      onClick={() => void remove(book)}
                    >
                      <Icon name="trash" size={12} /> Delete
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <p className="mt-5 rounded-xl border border-[rgba(156,100,116,.14)] bg-[rgba(255,251,243,.55)] px-3 py-2.5 text-[0.68rem] leading-relaxed text-ink/50">
        <strong className="font-medium text-ink/70">How sharing works:</strong> a scrapbook only
        appears on its link after you publish it. Until then the link shows a quiet “nothing is live
        yet” page, so you can build in peace.
        {backendMode === 'local' && (
          <>
            {' '}
            Right now this browser is the server, so links open on this device. Connect Supabase in
            the studio settings to send a link to someone else’s phone.
          </>
        )}
      </p>

      <NewBookModal open={creating} onClose={() => setCreating(false)} />
      <DetailsModal book={editing} onClose={() => setEditing(null)} />
    </div>
  );
}
