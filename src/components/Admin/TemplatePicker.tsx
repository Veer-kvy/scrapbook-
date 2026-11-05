import { useMemo, useState } from 'react';
import type { CustomTemplate, Page, TemplateCategory } from '../../types';
import { useAppStore } from '../../data/store';
import { navigate } from '../../lib/router';
import {
  filterTemplates,
  pageFromCustomTemplate,
  previewPageFromTemplate,
  TEMPLATE_CATEGORIES,
} from '../../templates/registry';
import { CATEGORY_LABELS, type TemplateDefinition } from '../../templates/types';
import { BUILTIN_TEMPLATES } from '../../templates/definitions';
import { Icon } from '../UI/Icon';
import { Modal } from '../UI/Modal';
import { Field, Input, PageThumb, SearchInput, Textarea, Toggle } from './ui';

type Target =
  | { kind: 'builtin'; def: TemplateDefinition }
  | { kind: 'custom'; template: CustomTemplate };

function targetName(target: Target): string {
  return target.kind === 'builtin' ? target.def.name : target.template.name;
}

/**
 * Chooses a template for a new page, or swaps the design of a page that is
 * already in the book. Replacing always asks for a second, explicit press.
 */
export function TemplatePickerModal({
  open,
  onClose,
  mode,
  page,
}: {
  open: boolean;
  onClose: () => void;
  mode: 'add' | 'replace';
  page?: Page;
}) {
  const doc = useAppStore((state) => state.doc);
  const addPage = useAppStore((state) => state.addPage);
  const addPageFromCustomTemplate = useAppStore((state) => state.addPageFromCustomTemplate);
  const applyTemplate = useAppStore((state) => state.applyTemplate);
  const applyCustomTemplate = useAppStore((state) => state.applyCustomTemplate);
  const [tab, setTab] = useState<'library' | 'mine'>('library');
  const [category, setCategory] = useState<TemplateCategory | 'all'>('all');
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<Target | null>(null);
  const [keepPhotos, setKeepPhotos] = useState(true);

  const photos = doc?.photos ?? [];
  const photoIds = useMemo(() => photos.map((photo) => photo.id), [photos]);
  const customTemplates = doc?.customTemplates ?? [];
  const library = useMemo(
    () =>
      BUILTIN_TEMPLATES.map((def) => ({
        def,
        page: previewPageFromTemplate(def.id, photoIds) ?? def.build(),
      })),
    [photoIds],
  );
  const visibleLibrary = useMemo(
    () =>
      filterTemplates(
        library.map((item) => item.def),
        query,
        category,
      ).map((def) => library.find((item) => item.def.id === def.id)!),
    [library, query, category],
  );
  const visibleCustom = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return customTemplates
      .filter((template) =>
        needle ? `${template.name} ${template.description}`.toLowerCase().includes(needle) : true,
      )
      .map((template) => ({ template, page: pageFromCustomTemplate(template) }));
  }, [customTemplates, query]);

  const addFromTarget = (target: Target) => {
    const created =
      target.kind === 'builtin'
        ? addPage(target.def.id)
        : addPageFromCustomTemplate(target.template.id);
    onClose();
    if (created) navigate(`/admin/pages/${encodeURIComponent(created.id)}`);
  };

  const pick = (target: Target) => {
    if (mode === 'add') {
      addFromTarget(target);
      return;
    }
    setPicked(target);
  };

  const replace = () => {
    if (!page || !picked) return;
    const done =
      picked.kind === 'builtin'
        ? applyTemplate(page.id, picked.def.id, keepPhotos)
        : applyCustomTemplate(page.id, picked.template.id, keepPhotos);
    if (done) onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === 'add' ? 'Add a page' : 'Choose a template'}
      subtitle={
        mode === 'add'
          ? 'Start from a designed layout or a blank sheet. Everything on it can be moved afterwards.'
          : `Pick a new design for “${page?.name ?? 'this page'}”. Nothing changes until you confirm.`
      }
      size="xl"
    >
      <div className="space-y-3 px-4 pb-6 pt-3 sm:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              className={`chip min-h-8 text-[0.68rem] ${tab === 'library' ? 'active' : ''}`}
              onClick={() => setTab('library')}
            >
              Library
            </button>
            <button
              type="button"
              className={`chip min-h-8 text-[0.68rem] ${tab === 'mine' ? 'active' : ''}`}
              onClick={() => setTab('mine')}
            >
              My templates ({customTemplates.length})
            </button>
          </div>
          <SearchInput value={query} onChange={setQuery} placeholder="Search templates" />
        </div>

        {tab === 'library' && (
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 thin-scroll">
            <button
              type="button"
              className={`chip min-h-7 shrink-0 text-[0.64rem] ${category === 'all' ? 'active' : ''}`}
              onClick={() => setCategory('all')}
            >
              All
            </button>
            {TEMPLATE_CATEGORIES.map((item) => (
              <button
                key={item}
                type="button"
                className={`chip min-h-7 shrink-0 text-[0.64rem] ${category === item ? 'active' : ''}`}
                onClick={() => setCategory(item)}
              >
                {CATEGORY_LABELS[item]}
              </button>
            ))}
          </div>
        )}

        {tab === 'library' ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {mode === 'add' && category === 'all' && !query.trim() && (
              <button
                type="button"
                className="rounded-xl border border-dashed border-[rgba(156,100,116,.35)] bg-[#fffdf7]/50 p-2 text-left transition hover:border-[#c98c9d] hover:bg-[#fffdf7]"
                onClick={() => {
                  const created = addPage('blank');
                  onClose();
                  if (created) navigate(`/admin/pages/${encodeURIComponent(created.id)}`);
                }}
              >
                <span className="flex aspect-[3/4] items-center justify-center rounded-md border border-[rgba(156,100,116,.18)] bg-[#fffaf0] text-deeprose">
                  <Icon name="plus" size={22} />
                </span>
                <span className="mt-1.5 block text-[0.72rem] font-medium text-ink">Blank page</span>
                <span className="block text-[0.6rem] text-ink/45">Start with an empty sheet</span>
              </button>
            )}
            {visibleLibrary.map(({ def, page: thumb }) => (
              <TemplateTile
                key={def.id}
                page={thumb}
                name={def.name}
                hint={def.tagline}
                badge={CATEGORY_LABELS[def.category]}
                selected={mode === 'replace' && picked?.kind === 'builtin' && picked.def.id === def.id}
                onClick={() => pick({ kind: 'builtin', def })}
              />
            ))}
          </div>
        ) : visibleCustom.length === 0 ? (
          <div className="rounded-xl border border-[rgba(156,100,116,.16)] bg-[#fffdf7]/60 px-4 py-8 text-center">
            <p className="text-sm text-ink/60">You have not saved a template yet.</p>
            <p className="mx-auto mt-1 max-w-sm text-[0.68rem] leading-relaxed text-ink/45">
              Open any page, then use “Save as my template” in the Page panel to reuse its layout
              later.
            </p>
            <a href="#/admin/templates" className="chip mt-3 inline-flex min-h-8">
              <Icon name="sparkles" size={13} /> Open the template studio
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {visibleCustom.map(({ template, page: thumb }) => (
              <TemplateTile
                key={template.id}
                page={thumb}
                name={template.name}
                hint={template.description || 'Your saved layout'}
                badge="My template"
                selected={
                  mode === 'replace' && picked?.kind === 'custom' && picked.template.id === template.id
                }
                onClick={() => pick({ kind: 'custom', template })}
              />
            ))}
          </div>
        )}

        {mode === 'replace' && page && (
          <div className="sticky bottom-0 space-y-2 rounded-xl border border-[rgba(156,100,116,.22)] bg-[#fffaf0]/95 px-3 py-3 backdrop-blur">
            <p className="text-[0.7rem] leading-relaxed text-ink/65">
              {picked ? (
                <>
                  Replace the layout of <strong className="text-ink">“{page.name}”</strong> with{' '}
                  <strong className="text-ink">“{targetName(picked)}”</strong>? Text, stickers and
                  decorations currently on the page will be removed. The page keeps its name and
                  place in the book.
                </>
              ) : (
                <>Choose a template above to see the replacement summary.</>
              )}
            </p>
            {picked && (
              <>
                <Toggle
                  checked={keepPhotos}
                  onChange={setKeepPhotos}
                  label="Keep the photos already on this page"
                  hint="Pictures and captions move into the new layout. Your photo library is never touched."
                />
                <div className="flex flex-wrap justify-end gap-2">
                  <button type="button" className="btn btn-ghost min-h-9" onClick={() => setPicked(null)}>
                    Choose another
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary min-h-9"
                    onClick={replace}
                  >
                    <Icon name="refresh" size={14} /> Replace “{page.name}” layout
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        <p className="text-[0.6rem] leading-relaxed text-ink/40">
          Want to see a template at phone, tablet and desktop sizes with its real interactions?{' '}
          <a
            href="#/admin/templates"
            className="underline decoration-[#9c6474]/40 underline-offset-2"
            onClick={onClose}
          >
            Open the template studio
          </a>
          .
        </p>
      </div>
    </Modal>
  );
}

function TemplateTile({
  page,
  name,
  hint,
  badge,
  selected,
  onClick,
}: {
  page: Page;
  name: string;
  hint: string;
  badge: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`rounded-xl border p-2 text-left transition ${
        selected
          ? 'border-[#9c6474] bg-[#c98c9d]/12'
          : 'border-[rgba(156,100,116,.18)] bg-[#fffdf7]/55 hover:border-[#c98c9d]/70 hover:bg-[#fffdf7]'
      }`}
      aria-pressed={selected}
      onClick={onClick}
    >
      <span className="block overflow-hidden rounded-md border border-black/5">
        <PageThumb page={page} pageNumber={1} />
      </span>
      <span className="mt-1.5 block truncate text-[0.72rem] font-medium text-ink">{name}</span>
      <span className="block truncate text-[0.6rem] text-ink/45">{hint}</span>
      <span className="mt-1 inline-flex rounded-full border border-[rgba(156,100,116,.18)] px-1.5 py-0.5 text-[0.52rem] uppercase tracking-[0.1em] text-ink/45">
        {badge}
      </span>
    </button>
  );
}

/** Saves the current page as a reusable template in My Templates. */
export function SaveTemplateModal({
  open,
  onClose,
  page,
}: {
  open: boolean;
  onClose: () => void;
  page: Page;
}) {
  const templates = useAppStore((state) => state.doc?.customTemplates);
  const savePageAsTemplate = useAppStore((state) => state.savePageAsTemplate);
  const linked = page.customTemplateId
    ? templates?.find((template) => template.id === page.customTemplateId)
    : undefined;
  const [name, setName] = useState(
    linked?.name ?? (page.templateName ? `${page.templateName} copy` : `${page.name} template`),
  );
  const [description, setDescription] = useState(linked?.description ?? '');
  const [updateLinked, setUpdateLinked] = useState(Boolean(linked));

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    savePageAsTemplate(page.id, {
      name: trimmed,
      description,
      templateId: updateLinked ? linked?.id : undefined,
    });
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Save as my template"
      subtitle="The layout, paper, look and interactions are copied. The photos stay in the book."
      size="md"
      footer={
        <>
          <button type="button" className="btn btn-ghost min-h-10" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary min-h-10"
            disabled={!name.trim()}
            onClick={submit}
          >
            <Icon name="heart" size={15} /> {updateLinked ? 'Update template' : 'Save template'}
          </button>
        </>
      }
    >
      <div className="space-y-4 px-5 pb-3 pt-3 sm:px-6">
        {linked && (
          <Toggle
            checked={updateLinked}
            onChange={setUpdateLinked}
            label={`Update “${linked.name}”`}
            hint="Off: keep the original template and save this page as a new one."
          />
        )}
        <Field label="Template name">
          <Input value={name} maxLength={60} onChange={(event) => setName(event.target.value)} />
        </Field>
        <Field label="Short description" hint="Shown on the card in My Templates.">
          <Textarea
            value={description}
            rows={3}
            maxLength={180}
            placeholder="What makes this layout yours?"
            onChange={(event) => setDescription(event.target.value)}
          />
        </Field>
        <p className="rounded-xl border border-[rgba(156,100,116,.16)] bg-[#fffdf7]/60 px-3 py-2 text-[0.68rem] leading-relaxed text-ink/55">
          After saving, this page is still a normal page in the scrapbook. Find the template under
          Templates → My templates.
        </p>
      </div>
    </Modal>
  );
}
