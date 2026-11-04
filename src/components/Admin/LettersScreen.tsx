import { useMemo, useState } from 'react';
import type { FontKey, Letter, LetterCategory, Tone } from '../../types';
import { useAppStore } from '../../data/store';
import { LETTER_CATEGORIES, LETTER_PAPERS } from '../../data/factories';
import { navigate } from '../../lib/router';
import { Icon } from '../UI/Icon';
import { SoundControls } from '../UI/SoundControls';
import { ColorField, RangeField, Segmented } from '../Editor/controls';
import { AdminHeader, EmptyState, Field, Input, Select, Textarea } from './ui';

const FONT_LABELS: Record<FontKey, string> = {
  hand: 'Caveat · handwriting',
  serif: 'Cormorant · storybook',
  display: 'Playfair · editorial',
  sans: 'Inter · clean',
};

const TONES: { value: Tone; label: string }[] = [
  { value: 'rose', label: 'Rose' },
  { value: 'cream', label: 'Cream' },
  { value: 'sage', label: 'Sage' },
  { value: 'peach', label: 'Peach' },
];

const PAPER_PREVIEW: Record<Letter['paper'], React.CSSProperties> = {
  lined: {
    backgroundColor: '#fdf4e4',
    backgroundImage: 'repeating-linear-gradient(0deg, transparent 0 27px, rgba(201,140,157,.22) 27px 28px)',
  },
  plain: { backgroundColor: '#fdf6e9' },
  floral: {
    backgroundColor: '#fbeff0',
    backgroundImage:
      'radial-gradient(circle at 14% 18%, rgba(201,140,157,.22) 2px, transparent 3px), radial-gradient(circle at 82% 70%, rgba(232,184,167,.3) 3px, transparent 4px)',
    backgroundSize: '38px 38px, 52px 52px',
  },
  kraft: { backgroundColor: '#e2c9af' },
};

export function LettersScreen() {
  const doc = useAppStore((state) => state.doc);
  const addLetter = useAppStore((state) => state.addLetter);
  const updateLetter = useAppStore((state) => state.updateLetter);
  const deleteLetter = useAppStore((state) => state.deleteLetter);
  const beginGesture = useAppStore((state) => state.beginGesture);
  const endGesture = useAppStore((state) => state.endGesture);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const letters = doc?.letters ?? [];
  const selected = letters.find((letter) => letter.id === selectedId) ?? letters[0] ?? null;

  const usage = useMemo(() => {
    const map = new Map<string, { pageId: string; pageName: string; index: number }[]>();
    doc?.pages.forEach((page, index) => {
      page.elements.forEach((element) => {
        if (element.kind !== 'envelope' || !element.letterId) return;
        const list = map.get(element.letterId) ?? [];
        list.push({ pageId: page.id, pageName: page.name, index });
        map.set(element.letterId, list);
      });
    });
    return map;
  }, [doc]);

  if (!doc) return null;

  const create = () => {
    const letter = addLetter({ title: 'A new letter', category: 'custom' });
    setSelectedId(letter.id);
  };

  const duplicate = (letter: Letter) => {
    const copy = addLetter({
      title: `${letter.title} copy`,
      category: letter.category,
      customCategory: letter.customCategory,
      body: letter.body,
      font: letter.font,
      inkColor: letter.inkColor,
      fontSize: letter.fontSize,
      paper: letter.paper,
      envelope: letter.envelope,
      animation: letter.animation,
      hiddenMessage: letter.hiddenMessage,
    });
    setSelectedId(copy.id);
  };

  const remove = (letter: Letter) => {
    const used = usage.get(letter.id) ?? [];
    const warning =
      used.length > 0
        ? `“${letter.title}” is linked to ${used.length} envelope${used.length === 1 ? '' : 's'} on ${used
            .map((page) => `“${page.pageName}”`)
            .join(', ')}. Deleting it leaves those envelopes showing their fallback note. Delete the letter?`
        : `Delete “${letter.title}”?`;
    if (!window.confirm(warning)) return;
    deleteLetter(letter.id);
    if (selectedId === letter.id) setSelectedId(null);
  };

  return (
    <>
      <AdminHeader
        title="Letters & messages"
        subtitle="Whole letters that live inside envelopes. Readers open them when they need the words most."
        actions={
          <button type="button" className="btn btn-primary min-h-10" onClick={create}>
            <Icon name="plus" size={15} /> New letter
          </button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <section className="admin-card h-fit overflow-hidden">
          <div className="border-b border-[rgba(156,100,116,.14)] px-3 py-2.5">
            <p className="text-[0.6rem] uppercase tracking-[0.18em] text-ink/45">
              {letters.length} letter{letters.length === 1 ? '' : 's'}
            </p>
          </div>
          {letters.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm leading-relaxed text-ink/50">
              No letters yet. Write one and link it to an envelope on any page.
            </p>
          ) : (
            <ul className="p-2">
              {letters.map((letter) => {
                const active = selected?.id === letter.id;
                const used = usage.get(letter.id)?.length ?? 0;
                return (
                  <li key={letter.id}>
                    <button
                      type="button"
                      className={`flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2 text-left transition ${
                        active ? 'bg-[#c98c9d]/18' : 'hover:bg-[#c98c9d]/10'
                      }`}
                      onClick={() => setSelectedId(letter.id)}
                      aria-pressed={active}
                    >
                      <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg ${active ? 'bg-[#9c6474] text-[#fff8ec]' : 'bg-[#f3dcdc] text-deeprose'}`}>
                        <Icon name="mail" size={15} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[0.8rem] font-medium text-ink">{letter.title}</span>
                        <span className="block truncate text-[0.62rem] text-ink/45">
                          {LETTER_CATEGORIES.find((category) => category.value === letter.category)?.label ??
                            letter.customCategory ??
                            letter.category}
                          {used > 0 ? ` · ${used} envelope${used === 1 ? '' : 's'}` : ''}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {selected ? (
          <LetterEditor
            key={selected.id}
            letter={selected}
            used={usage.get(selected.id) ?? []}
            onUpdate={(patch) => updateLetter(selected.id, patch)}
            onDuplicate={() => duplicate(selected)}
            onDelete={() => remove(selected)}
            beginGesture={beginGesture}
            endGesture={endGesture}
          />
        ) : (
          <EmptyState
            icon="mail"
            title="Write the first letter"
            body="Letters can be open-when notes, encouragement, or just something they should read on a grey day. Each one gets its own paper, handwriting and hidden postscript."
            action={
              <button type="button" className="btn btn-primary min-h-10" onClick={create}>
                <Icon name="plus" size={15} /> Write a letter
              </button>
            }
          />
        )}
      </div>
    </>
  );
}

function LetterEditor({
  letter,
  used,
  onUpdate,
  onDuplicate,
  onDelete,
  beginGesture,
  endGesture,
}: {
  letter: Letter;
  used: { pageId: string; pageName: string; index: number }[];
  onUpdate: (patch: Partial<Letter>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  beginGesture: () => void;
  endGesture: () => void;
}) {
  const doc = useAppStore((state) => state.doc);
  const envelopes = doc?.pages.flatMap((page, index) =>
    page.elements
      .filter((element) => element.kind === 'envelope' && element.letterId === letter.id)
      .map((element) => ({ page, element, index })),
  ) ?? [];
  const looseEnvelopes = doc?.pages.flatMap((page, index) =>
    page.elements
      .filter((element) => element.kind === 'envelope' && !element.letterId)
      .map((element) => ({ page, element, index })),
  ) ?? [];
  const linkable = looseEnvelopes[0];

  return (
    <section className="admin-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[rgba(156,100,116,.14)] px-4 py-3">
        <div className="min-w-0">
          <h2 className="truncate font-display text-lg leading-tight">{letter.title || 'Untitled letter'}</h2>
          <p className="text-[0.64rem] text-ink/45">
            {used.length > 0
              ? `Opened from ${used.length} envelope${used.length === 1 ? '' : 's'} · ${used
                  .map((page) => `page ${page.index + 1}`)
                  .join(', ')}`
              : 'Not linked to an envelope yet'}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button type="button" className="chip min-h-9" onClick={onDuplicate}>
            <Icon name="copy" size={13} /> Duplicate
          </button>
          <button type="button" className="chip min-h-9 border-[#9c6474]/40 text-[#9c6474]" onClick={onDelete}>
            <Icon name="trash" size={13} /> Delete
          </button>
        </div>
      </div>

      <div className="grid gap-5 p-4 xl:grid-cols-[1fr_340px]">
        <div className="space-y-3.5">
          <Field label="Letter title">
            <Input
              value={letter.title}
              maxLength={80}
              onFocus={beginGesture}
              onBlur={endGesture}
              onChange={(event) => onUpdate({ title: event.target.value })}
            />
          </Field>

          <div className="grid gap-2.5 sm:grid-cols-2">
            <Field label="Category">
              <Select
                value={letter.category}
                onChange={(event) => onUpdate({ category: event.target.value as LetterCategory })}
              >
                {LETTER_CATEGORIES.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </Select>
            </Field>
            {letter.category === 'custom' && (
              <Field label="Custom category name">
                <Input
                  value={letter.customCategory}
                  maxLength={50}
                  placeholder="For the quiet days"
                  onFocus={beginGesture}
                  onBlur={endGesture}
                  onChange={(event) => onUpdate({ customCategory: event.target.value })}
                />
              </Field>
            )}
          </div>

          <Field label="The letter" hint="Line breaks are kept exactly as you write them.">
            <Textarea
              rows={12}
              value={letter.body}
              className="font-hand text-lg leading-relaxed"
              style={{ fontFamily: 'var(--font-hand)', fontSize: '1.1rem' }}
              onFocus={beginGesture}
              onBlur={endGesture}
              onChange={(event) => onUpdate({ body: event.target.value })}
            />
          </Field>

          <Field label="Hidden postscript" hint="A last line that appears beneath a dashed rule.">
            <Textarea
              rows={3}
              value={letter.hiddenMessage}
              onFocus={beginGesture}
              onBlur={endGesture}
              onChange={(event) => onUpdate({ hiddenMessage: event.target.value })}
              placeholder="ps. I kept the ticket stub."
            />
          </Field>

          <div>
            <span className="label">Handwriting</span>
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.keys(FONT_LABELS) as FontKey[]).map((font) => (
                <button
                  key={font}
                  type="button"
                  className={`chip min-h-10 justify-start text-[0.68rem] ${letter.font === font ? 'active' : ''}`}
                  onClick={() => onUpdate({ font })}
                  aria-pressed={letter.font === font}
                >
                  {FONT_LABELS[font]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <RangeField
              label="Writing size"
              value={letter.fontSize}
              min={3}
              max={8}
              step={0.2}
              onChange={(fontSize) => onUpdate({ fontSize })}
              onFocus={beginGesture}
              onBlur={endGesture}
              format={(value) => value.toFixed(1)}
            />
            <RangeField
              label="Opening motion"
              value={letter.animation === 'unfold' ? 0 : letter.animation === 'fade' ? 1 : 2}
              min={0}
              max={2}
              onChange={(value) => onUpdate({ animation: value < 0.5 ? 'unfold' : value < 1.5 ? 'fade' : 'slide' })}
              format={() => letter.animation}
            />
          </div>

          <ColorField label="Ink colour" value={letter.inkColor} onChange={(inkColor) => onUpdate({ inkColor })} />

          <div>
            <span className="label">Paper</span>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {LETTER_PAPERS.map((paper) => (
                <button
                  key={paper.value}
                  type="button"
                  className={`overflow-hidden rounded-xl border text-left transition ${
                    letter.paper === paper.value ? 'border-[#9c6474] ring-1 ring-[#9c6474]/30' : 'border-[rgba(156,100,116,.18)]'
                  }`}
                  onClick={() => onUpdate({ paper: paper.value })}
                  aria-pressed={letter.paper === paper.value}
                >
                  <span className="block h-10 w-full" style={PAPER_PREVIEW[paper.value]} />
                  <span className="block px-2 py-1 text-[0.62rem] text-ink/65">{paper.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="label">Envelope colour</span>
            <Segmented
              ariaLabel="Envelope colour"
              columns={4}
              value={letter.envelope}
              options={TONES}
              onChange={(envelope) => onUpdate({ envelope })}
            />
          </div>

          {linkable && (
            <button
              type="button"
              className="chip min-h-9"
              onClick={() => {
                const store = useAppStore.getState();
                store.updateElement(linkable.page.id, linkable.element.id, {
                  letterId: letter.id,
                  title: letter.title,
                  tone: letter.envelope,
                });
                store.notify('Letter linked to the envelope on page ' + (linkable.index + 1) + '.', 'success');
              }}
            >
              <Icon name="mail" size={13} /> Link to unlinked envelope on page {linkable.index + 1}
            </button>
          )}
        </div>

        <div className="xl:sticky xl:top-2 xl:self-start">
          <p className="mb-2 text-[0.6rem] uppercase tracking-[0.18em] text-ink/45">How it opens</p>
          <div className="rounded-2xl bg-[#f2e0dc]/60 p-4">
            <div className="relative">
              <div
                className="letter-paper relative mx-auto max-h-[62vh] overflow-y-auto rounded-[4px] px-5 py-6 shadow-paper"
                style={PAPER_PREVIEW[letter.paper]}
              >
                <p
                  className="whitespace-pre-wrap"
                  style={{
                    fontFamily: `var(--font-${letter.font})`,
                    color: letter.inkColor,
                    fontSize: `${letter.fontSize * 0.24}rem`,
                    lineHeight: 1.55,
                  }}
                >
                  {letter.body || 'Your letter will appear here…'}
                </p>
                {letter.hiddenMessage && (
                  <p
                    className="mt-5 border-t border-dashed border-[#9c6474]/30 pt-2 text-[0.82rem] italic text-deeprose/80"
                    style={{ fontFamily: 'var(--font-serif)' }}
                  >
                    ps. {letter.hiddenMessage}
                  </p>
                )}
                <p className="mt-6 text-right font-hand text-xl text-deeprose">
                  — {doc?.meta.sender || 'with love'}
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between gap-2 text-[0.62rem] text-ink/50">
              <span className="inline-flex items-center gap-1.5">
                <Icon name="sparkles" size={12} /> {letter.animation}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Icon name="mail" size={12} /> {letter.envelope} envelope
              </span>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {envelopes.map((item) => (
              <button
                key={item.element.id}
                type="button"
                className="chip min-h-8 text-[0.64rem]"
                onClick={() => navigate(`/admin/pages/${encodeURIComponent(item.page.id)}`)}
              >
                <Icon name="pages" size={11} /> Open page {item.index + 1}
              </button>
            ))}
            {used.length === 0 && (
              <p className="text-[0.66rem] leading-snug text-ink/45">
                Add an envelope to a page, then link this letter from its properties panel.
              </p>
            )}
          </div>
          <div className="mt-4 flex justify-center">
            <SoundControls />
          </div>
        </div>
      </div>
    </section>
  );
}
