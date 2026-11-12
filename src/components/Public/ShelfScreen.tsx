import { useState } from 'react';
import type { PublishedBookSummary } from '../../types';
import { useAppStore } from '../../data/store';
import { shelfLink } from '../../lib/slug';
import { copyText, relativeTime } from '../../lib/utils';
import { Icon } from '../UI/Icon';
import { Sticker } from '../Stickers/Sticker';

export function ShelfBackdrop() {
  return (
    <>
      <div className="app-backdrop" aria-hidden="true" />
      <span
        className="pointer-events-none fixed left-[4%] top-[12%] hidden w-12 rotate-[-10deg] opacity-30 sm:block"
        aria-hidden="true"
      >
        <Sticker id="daisy" />
      </span>
      <span
        className="pointer-events-none fixed right-[6%] top-[22%] hidden w-9 rotate-12 opacity-25 sm:block"
        aria-hidden="true"
      >
        <Sticker id="butterfly" />
      </span>
      <span
        className="pointer-events-none fixed bottom-[10%] left-[8%] hidden w-8 rotate-6 opacity-20 sm:block"
        aria-hidden="true"
      >
        <Sticker id="sparkle" />
      </span>
    </>
  );
}

export function MissingLink({ slug }: { slug: string }) {
  return (
    <div className="relative flex min-h-[100dvh] w-full items-center justify-center overflow-hidden px-5">
      <ShelfBackdrop />
      <div className="relative z-10 max-w-md text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-[#c98c9d]/35 bg-[rgba(255,248,238,.7)] text-deeprose shadow-paper">
          <Icon name="book" size={26} />
        </span>
        <h1 className="mt-5 font-display text-2xl text-ink">This link isn&rsquo;t live yet</h1>
        <p className="mt-2 font-serif text-sm italic leading-relaxed text-ink/60">
          No published scrapbook lives at <span className="not-italic">#/s/{slug}</span>. The address
          may be mistyped, or the book is still being written and has not been published.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <a href="#/" className="btn btn-primary min-h-10">
            <Icon name="book" size={15} /> Visit the shelf
          </a>
          <a href="#/admin/login" className="btn btn-secondary min-h-10">
            <Icon name="lock" size={15} /> Open the studio
          </a>
        </div>
      </div>
    </div>
  );
}

export function ShelfError({ message }: { message: string }) {
  return (
    <div className="relative flex min-h-[100dvh] w-full items-center justify-center overflow-hidden px-5">
      <ShelfBackdrop />
      <div className="relative z-10 max-w-md text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-[#c98c9d]/35 bg-[rgba(255,248,238,.7)] text-deeprose shadow-paper">
          <Icon name="warning" size={24} />
        </span>
        <h1 className="mt-5 font-display text-2xl text-ink">The shelf didn&rsquo;t load</h1>
        <p className="mt-2 font-serif text-sm italic leading-relaxed text-ink/60">{message}</p>
        <button
          type="button"
          className="btn btn-primary mt-6 min-h-10"
          onClick={() => window.location.reload()}
        >
          <Icon name="refresh" size={15} /> Try again
        </button>
      </div>
    </div>
  );
}

function BookCard({
  book,
  index,
  total,
}: {
  book: PublishedBookSummary;
  index: number;
  total: number;
}) {
  return (
    <a
      href={`#/s/${book.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-[18px] border border-[rgba(156,100,116,.2)] bg-[rgba(255,250,240,.82)] shadow-paper backdrop-blur transition duration-300 hover:-translate-y-1 hover:shadow-lift"
    >
      <span className="relative block aspect-[16/10] w-full overflow-hidden bg-[linear-gradient(135deg,#f9efdf_0%,#f2dcd8_52%,#e7d3c6_100%)]">
        <span className="absolute inset-y-0 left-0 w-2.5 bg-[rgba(156,100,116,.16)]" />
        <span className="absolute inset-y-0 left-2.5 w-px bg-[rgba(255,255,255,.6)]" />
        <span className="absolute inset-0 flex flex-col justify-center pl-7 pr-16">
          <span className="font-serif text-[0.56rem] uppercase tracking-[0.22em] text-deeprose/70">
            a scrapbook for {book.recipient || 'someone lovely'}
          </span>
          <span className="mt-1 line-clamp-2 font-display text-[1.35rem] leading-tight text-ink">
            {book.title}
          </span>
          <span className="mt-2 text-[0.62rem] uppercase tracking-[0.14em] text-ink/40">
            {book.pageCount} page{book.pageCount === 1 ? '' : 's'} · v{book.versionNumber}
          </span>
        </span>
        <span className="absolute right-3 top-3 w-8 rotate-12 opacity-70" aria-hidden="true">
          <Sticker id={index % 2 === 0 ? 'heart' : 'rose'} />
        </span>
      </span>
      <span className="flex flex-1 flex-col gap-1.5 p-4">
        <span className="flex items-center justify-between gap-2">
          <span className="text-[0.62rem] uppercase tracking-[0.18em] text-deeprose/60">
            {total === 1 ? 'the only book' : `book ${index + 1} of ${total}`}
          </span>
          <span className="text-[0.62rem] text-ink/35">
            {relativeTime(book.publishedAt)}
          </span>
        </span>
        <span className="line-clamp-2 font-serif text-sm italic leading-relaxed text-ink/60">
          {book.subtitle || `made for ${book.recipient || 'someone lovely'} by ${book.sender || 'someone who loves them'}`}
        </span>
        <span className="mt-1 flex items-center justify-between gap-2 text-[0.74rem] text-deeprose">
          <span className="flex items-center gap-1.5 transition group-hover:gap-2.5">
            Open the book <Icon name="arrow-right" size={13} />
          </span>
          {book.locked && (
            <span className="flex items-center gap-1 rounded-full bg-[#f1dde0] px-2 py-0.5 text-[0.6rem] uppercase tracking-[0.12em] text-deeprose/80">
              <Icon name="lock" size={10} /> passcode
            </span>
          )}
        </span>
      </span>
    </a>
  );
}

export function ShelfScreen() {
  const shelf = useAppStore((state) => state.shelf);
  const shelfLoading = useAppStore((state) => state.shelfLoading);
  const profile = useAppStore((state) => state.profile);
  const notify = useAppStore((state) => state.notify);
  const [copied, setCopied] = useState(false);

  const name = profile?.name?.trim() || 'Kabbu';
  const note = profile?.note?.trim();
  const initial = name.slice(0, 1).toUpperCase();

  const copyShelf = async () => {
    const link = shelfLink();
    const ok = await copyText(link);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } else {
      notify(`Copy this link: ${link}`, 'info');
    }
  };

  return (
    <div className="relative min-h-[100dvh] w-full overflow-x-hidden">
      <ShelfBackdrop />

      <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-5xl flex-col px-5 pb-8 pt-6 sm:px-8 sm:pt-8">
        <header className="flex items-center justify-between gap-3">
          <span className="flex min-w-0 items-center gap-2 text-deeprose/80">
            <Icon name="book" size={18} />
            <span className="truncate text-label">{name}&rsquo;s shelf</span>
          </span>
          <button
            type="button"
            className="chip min-h-9 shrink-0 px-3 text-[0.68rem]"
            onClick={() => void copyShelf()}
          >
            <Icon name={copied ? 'check' : 'link'} size={13} />
            {copied ? 'Link copied' : 'Share shelf'}
          </button>
        </header>

        <main className="flex-1 py-9 sm:py-12">
          <section className="relative overflow-hidden rounded-[22px] border border-[rgba(156,100,116,.18)] bg-[rgba(255,250,240,.72)] px-6 py-7 shadow-paper backdrop-blur sm:px-9 sm:py-9">
            <span
              className="pointer-events-none absolute -right-4 -top-5 w-24 rotate-12 opacity-25"
              aria-hidden="true"
            >
              <Sticker id="bow" />
            </span>
            <p className="font-serif text-[0.64rem] uppercase tracking-[0.3em] text-deeprose/60">
              a shelf of handmade things
            </p>
            <h1 className="mt-3 max-w-[18ch] font-hand text-[2.4rem] leading-[1.08] text-ink sm:text-[3.2rem]">
              {name}&rsquo;s little scrapbooks
            </h1>
            {note && (
              <p className="mt-3 max-w-[46ch] font-serif text-[0.98rem] italic leading-relaxed text-ink/60">
                {note}
              </p>
            )}
            <div className="mt-5 flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-full border border-white/70 bg-[rgba(255,248,238,.9)] text-[0.78rem] font-semibold text-deeprose">
                {initial}
              </span>
              <span className="text-[0.68rem] uppercase tracking-[0.16em] text-deeprose/60">
                {shelf.length} published scrapbook{shelf.length === 1 ? '' : 's'}
              </span>
            </div>
          </section>

          <div className="mb-4 mt-9 flex items-end justify-between gap-3">
            <h2 className="font-display text-xl text-ink">The books</h2>
            <span className="text-[0.64rem] uppercase tracking-[0.16em] text-ink/40">
              pick one to open
            </span>
          </div>

          {shelfLoading && !shelf.length ? (
            <div className="rounded-[18px] border border-[rgba(156,100,116,.18)] bg-[rgba(255,250,240,.7)] px-6 py-12 text-center font-serif text-sm italic text-ink/50">
              Bringing the books down from the shelf…
            </div>
          ) : shelf.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {shelf.map((book, index) => (
                <BookCard key={book.id} book={book} index={index} total={shelf.length} />
              ))}
            </div>
          ) : (
            <div className="rounded-[18px] border border-[rgba(156,100,116,.18)] bg-[rgba(255,250,240,.7)] px-6 py-12 text-center backdrop-blur">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#f3dcdc] text-deeprose">
                <Icon name="sparkles" size={24} />
              </span>
              <p className="mt-4 font-display text-xl text-ink">The shelf is still being made</p>
              <p className="mx-auto mt-1.5 max-w-sm font-serif text-sm italic leading-relaxed text-ink/55">
                Books appear here the moment they are published. If someone sent you a link, open
                that instead — it may be a single book that isn&rsquo;t on this shelf yet.
              </p>
            </div>
          )}
        </main>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[rgba(156,100,116,.16)] pt-4 text-[0.62rem] uppercase tracking-[0.18em] text-deeprose/50">
          <span className="flex items-center gap-1.5">
            <Icon name="heart" size={11} /> kept by hand
          </span>
          <a href="#/admin/login" className="transition hover:text-deeprose">
            Studio
          </a>
        </footer>
      </div>
    </div>
  );
}
