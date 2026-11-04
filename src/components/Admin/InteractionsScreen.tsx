import { useMemo, useState } from 'react';
import type {
  ButtonElement,
  EnvelopeElement,
  HiddenElement,
  Page,
  PhotoElement,
  ScrapbookElement,
} from '../../types';
import { useAppStore } from '../../data/store';
import { navigate } from '../../lib/router';
import { Icon, type IconName } from '../UI/Icon';
import { AdminHeader, EmptyState, Field, Select, StatCard, Textarea } from './ui';

type InteractiveElement = PhotoElement | EnvelopeElement | HiddenElement | ButtonElement;

interface Options {
  value: string;
  label: string;
  needsMessage: boolean;
}

const OPTIONS: Record<InteractiveElement['kind'], Options[]> = {
  photo: [
    { value: 'flip', label: 'Flip for a message', needsMessage: true },
    { value: 'show-note', label: 'Open a note', needsMessage: true },
    { value: 'bloom', label: 'Bloom into a note', needsMessage: true },
    { value: 'surprise', label: 'A little surprise', needsMessage: true },
    { value: 'go-to-page', label: 'Turn to another page', needsMessage: false },
  ],
  envelope: [
    { value: 'none', label: 'Open the linked letter', needsMessage: false },
    { value: 'show-note', label: 'Show a short note instead', needsMessage: true },
    { value: 'surprise', label: 'A little surprise', needsMessage: true },
    { value: 'go-to-page', label: 'Turn to another page', needsMessage: false },
  ],
  hidden: [
    { value: 'none', label: 'Reveal the secret', needsMessage: false },
    { value: 'go-to-page', label: 'Turn to another page', needsMessage: false },
  ],
  button: [
    { value: 'none', label: 'Show a note', needsMessage: true },
    { value: 'go-to-page', label: 'Turn to another page', needsMessage: false },
  ],
};

const KIND_META: Record<InteractiveElement['kind'], { Icon: IconName; label: string }> = {
  photo: { Icon: 'image', label: 'Polaroid' },
  envelope: { Icon: 'mail', label: 'Envelope' },
  hidden: { Icon: 'sparkles', label: 'Hidden surprise' },
  button: { Icon: 'arrow-right', label: 'Button' },
};

function elementLabel(element: InteractiveElement, page: Page): string {
  switch (element.kind) {
    case 'photo':
      return element.caption || 'A photograph';
    case 'envelope':
      return element.title || 'An envelope';
    case 'hidden':
      return element.prompt || 'A hidden surprise';
    case 'button':
      return element.label || 'A button';
    default:
      return page.name;
  }
}

export function InteractionsScreen() {
  const doc = useAppStore((state) => state.doc);
  const updateElement = useAppStore((state) => state.updateElement);
  const [openId, setOpenId] = useState<string | null>(null);

  const pages = doc?.pages ?? [];
  const letters = doc?.letters ?? [];

  const groups = useMemo(
    () =>
      pages
        .map((page) => ({
          page,
          elements: page.elements.filter(
            (element): element is InteractiveElement =>
              element.kind === 'photo' ||
              element.kind === 'envelope' ||
              element.kind === 'hidden' ||
              element.kind === 'button',
          ),
        }))
        .filter((group) => group.elements.length > 0),
    [pages],
  );

  const totals = useMemo(() => {
    const counts = { photo: 0, envelope: 0, hidden: 0, button: 0 };
    for (const group of groups) {
      for (const element of group.elements) counts[element.kind] += 1;
    }
    return counts;
  }, [groups]);

  const total = totals.photo + totals.envelope + totals.hidden + totals.button;

  return (
    <div>
      <AdminHeader
        title="Interactive elements"
        subtitle="Decide what happens when a reader taps a Polaroid, opens an envelope, finds a secret, or presses a button. Everything is stored with the page — no code needed."
        actions={
          <a href="#/admin/pages" className="builder-tool min-h-10 px-3">
            <Icon name="pages" size={14} /> Pages
          </a>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Flippable photos" value={totals.photo} hint="Polaroids that respond" icon={<Icon name="image" size={16} />} />
        <StatCard label="Envelopes" value={totals.envelope} hint="Letters waiting inside" icon={<Icon name="mail" size={16} />} />
        <StatCard label="Hidden surprises" value={totals.hidden} hint="Secrets to discover" icon={<Icon name="sparkles" size={16} />} />
        <StatCard label="Buttons" value={totals.button} hint="Little invitations" icon={<Icon name="arrow-right" size={16} />} />
      </div>

      {!total ? (
        <EmptyState
          icon="sparkles"
          title="Nothing to tap yet"
          body="Add a Polaroid, envelope, hidden surprise, or button on a page. They will appear here with tap behaviour controls."
          action={
            <a href="#/admin/pages" className="btn btn-primary inline-flex min-h-10">
              Choose a page
            </a>
          }
        />
      ) : (
        <div className="space-y-5">
          {groups.map(({ page, elements }) => (
            <section key={page.id} className="admin-card overflow-hidden">
              <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[rgba(156,100,116,.14)] px-4 py-3">
                <div className="min-w-0">
                  <p className="text-[0.6rem] uppercase tracking-[0.16em] text-ink/40">
                    Page {pages.findIndex((item) => item.id === page.id) + 1}
                  </p>
                  <h2 className="truncate font-display text-base text-ink">{page.name}</h2>
                </div>
                <button
                  type="button"
                  className="builder-tool min-h-8 px-2.5 text-[0.68rem]"
                  onClick={() => navigate(`/admin/pages/${page.id}`)}
                >
                  <Icon name="edit" size={13} /> Edit page
                </button>
              </header>

              <ul className="divide-y divide-[rgba(156,100,116,.12)]">
                {elements.map((element) => {
                  const meta = KIND_META[element.kind];
                  const open = openId === element.id;
                  const options = OPTIONS[element.kind];
                  const interaction = element.interaction;
                  const raw = interaction?.type ?? 'none';
                  const current =
                    element.kind === 'photo' && raw === 'none'
                      ? 'flip'
                      : element.kind === 'button' && raw === 'show-note'
                        ? 'none'
                        : raw;
                  const option = options.find((item) => item.value === current) ?? options[0];
                  const isButtons = element.kind === 'button' && current === 'none';
                  const messageValue =
                    element.kind === 'hidden'
                      ? element.note
                      : element.kind === 'photo' && current === 'flip'
                        ? interaction?.message ?? element.caption
                        : interaction?.message ?? '';
                  const patch = (next: Partial<ScrapbookElement>) =>
                    updateElement(page.id, element.id, next);

                  return (
                    <li key={element.id} className="px-4 py-3">
                      <button
                        type="button"
                        className="flex w-full items-center gap-3 text-left"
                        aria-expanded={open}
                        onClick={() => setOpenId(open ? null : element.id)}
                      >
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#f3dcdc] text-deeprose">
                          <Icon name={meta.Icon} size={16} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm text-ink">
                            {elementLabel(element, page)}
                          </span>
                          <span className="block truncate text-[0.68rem] text-ink/45">
                            {meta.label} · {option?.label ?? 'No action'}
                          </span>
                        </span>
                        <Icon
                          name={open ? 'chevron-up' : 'chevron-down'}
                          size={15}
                          className="shrink-0 text-ink/40"
                        />
                      </button>

                      {open && (
                        <div className="mt-3 space-y-3 rounded-xl border border-[rgba(156,100,116,.16)] bg-[rgba(255,251,243,.65)] p-3">
                          <Field label="When someone taps this">
                            <Select
                              value={current}
                              onChange={(event) => {
                                const type = event.target.value;
                                patch({
                                  interaction: {
                                    ...interaction,
                                    type: type as NonNullable<typeof interaction>['type'],
                                  },
                                });
                              }}
                            >
                              {options.map((item) => (
                                <option key={item.value} value={item.value}>
                                  {item.label}
                                </option>
                              ))}
                            </Select>
                          </Field>

                          {option?.needsMessage && (
                            <Field
                              label={
                                element.kind === 'photo' && current === 'flip'
                                  ? 'Back of the photo'
                                  : element.kind === 'button'
                                    ? 'Note shown on tap'
                                    : 'The note'
                              }
                              hint="Saved with the page and revealed in reading mode."
                            >
                              <Textarea
                                rows={3}
                                value={messageValue}
                                onChange={(event) =>
                                  patch({
                                    interaction: {
                                      ...interaction,
                                      type: current as NonNullable<typeof interaction>['type'],
                                      message: event.target.value,
                                    },
                                  })
                                }
                                placeholder="Write the words that appear…"
                              />
                            </Field>
                          )}

                          {element.kind === 'hidden' && (
                            <Field
                              label="Secret message"
                              hint="What the reader finds when they tap the hidden note."
                            >
                              <Textarea
                                rows={3}
                                value={element.note}
                                onChange={(event) => patch({ note: event.target.value })}
                                placeholder="Something only they would love…"
                              />
                            </Field>
                          )}

                          {element.kind === 'envelope' && (
                            <Field
                              label="Letter inside"
                              hint={
                                element.letterId
                                  ? 'The envelope opens this letter.'
                                  : 'No letter linked — the envelope will show its short note.'
                              }
                            >
                              <Select
                                value={element.letterId ?? ''}
                                onChange={(event) =>
                                  patch({ letterId: event.target.value || undefined })
                                }
                              >
                                <option value="">No letter — use the short note</option>
                                {letters.map((letter) => (
                                  <option key={letter.id} value={letter.id}>
                                    {letter.title || 'Untitled letter'}
                                  </option>
                                ))}
                              </Select>
                            </Field>
                          )}

                          {current === 'go-to-page' && (
                            <Field label="Turn to page">
                              <Select
                                value={interaction?.targetPageId ?? ''}
                                onChange={(event) =>
                                  patch({
                                    interaction: {
                                      ...interaction,
                                      type: 'go-to-page',
                                      targetPageId: event.target.value || undefined,
                                    },
                                  })
                                }
                              >
                                <option value="">Choose a page…</option>
                                {pages
                                  .filter((item) => item.id !== page.id)
                                  .map((item) => (
                                    <option key={item.id} value={item.id}>
                                      {pages.findIndex((entry) => entry.id === item.id) + 1}.{' '}
                                      {item.name}
                                    </option>
                                  ))}
                              </Select>
                            </Field>
                          )}

                          {isButtons && (
                            <p className="text-[0.66rem] leading-snug text-ink/45">
                              Without a note, tapping the button shows a gentle placeholder.
                            </p>
                          )}

                          <button
                            type="button"
                            className="builder-tool min-h-8 px-2.5 text-[0.68rem]"
                            onClick={() => navigate(`/admin/pages/${page.id}`)}
                          >
                            <Icon name="edit" size={13} /> Fine-tune in the builder
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
