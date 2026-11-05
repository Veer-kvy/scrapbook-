import { useMemo, useState } from 'react';
import type { CustomTemplate, Page, TemplateCategory } from '../../types';
import { useAppStore } from '../../data/store';
import { relativeTime } from '../../lib/utils';
import { navigate } from '../../lib/router';
import {
  filterTemplates,
  pageFromCustomTemplate,
  previewPageFromTemplate,
  TEMPLATE_CATEGORIES,
  templateDisplayName,
} from '../../templates/registry';
import {
  CATEGORY_LABELS,
  CONTENT_LABELS,
  type TemplateDefinition,
} from '../../templates/types';
import { BUILTIN_TEMPLATES } from '../../templates/definitions';
import { PageCanvas } from '../Scrapbook/PageCanvas';
import { Icon } from '../UI/Icon';
import { Modal } from '../UI/Modal';
import {
  AdminHeader,
  EmptyState,
  Field,
  Input,
  PageThumb,
  SearchInput,
  Select,
  Textarea,
  Toggle,
} from './ui';

type Target =
  | { kind: 'builtin'; def: TemplateDefinition }
  | { kind: 'custom'; template: CustomTemplate };

function targetName(target: Target): string {
  return target.kind === 'builtin' ? target.def.name : target.template.name;
}

function targetPage(target: Target, photoIds: string[]): Page {
  if (target.kind === 'builtin') {
    return previewPageFromTemplate(target.def.id, photoIds) ?? target.def.build();
  }
  return pageFromCustomTemplate(target.template);
}

function countPhotos(page: Page): number {
  return page.elements.filter((element) => element.kind === 'photo').length;
}

const DEVICES = [
  { id: 'mobile' as const, label: 'Mobile', width: 300, hint: '320–430px phones' },
  { id: 'tablet' as const, label: 'Tablet', width: 440, hint: '768px tablets' },
  { id: 'desktop' as const, label: 'Desktop', width: 620, hint: '1024px and wider' },
];

function SupportChips({ supports }: { supports: TemplateDefinition['supports'] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {supports.map((support) => (
        <span
          key={support}
          className="rounded-full border border-[rgba(156,100,116,.18)] bg-[#fffdf7]/70 px-1.5 py-0.5 text-[0.55rem] uppercase tracking-[0.08em] text-ink/55"
        >
          {CONTENT_LABELS[support]}
        </span>
      ))}
    </div>
  );
}

function PreviewModal({
  target,
  onClose,
  onUse,
}: {
  target: Target;
  onClose: () => void;
  onUse: () => void;
}) {
  const doc = useAppStore((state) => state.doc);
  const duplicateTemplate = useAppStore((state) => state.duplicateTemplate);
  const [device, setDevice] = useState<'mobile' | 'tablet' | 'desktop'>('tablet');

  const photoIds = useMemo(() => (doc?.photos ?? []).map((photo) => photo.id), [doc]);
  const page = useMemo(() => targetPage(target, photoIds), [target, photoIds]);
  const width = DEVICES.find((item) => item.id === device)?.width ?? 440;
  const isBuiltin = target.kind === 'builtin';
  const categories = isBuiltin ? target.def.categories : [];
  const supports = isBuiltin ? target.def.supports : null;

  return (
    <Modal
      open
      onClose={onClose}
      title={targetName(target)}
      subtitle={isBuiltin ? target.def.tagline : target.template.description}
      size="full"
    >
      <div className="grid gap-4 px-4 pb-6 pt-3 sm:px-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0 rounded-2xl bg-[#efe2d6] p-3 sm:p-4">
          <div className="mb-3 flex flex-wrap items-center justify-center gap-1.5">
            {DEVICES.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`chip min-h-8 px-2.5 text-[0.68rem] ${device === item.id ? 'active' : ''}`}
                aria-pressed={device === item.id}
                title={item.hint}
                onClick={() => setDevice(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="flex justify-center">
            <div
              className="relative mx-auto aspect-[3/4] w-full overflow-hidden rounded-lg shadow-[0_24px_50px_-28px_rgba(43,28,34,.7)] transition-[max-width] duration-300"
              style={{ maxWidth: width }}
            >
              <PageCanvas
                key={device}
                page={page}
                pageNumber={1}
                side="single"
                className="absolute inset-0"
              />
            </div>
          </div>
          <p className="mt-3 text-center text-[0.62rem] leading-relaxed text-ink/45">
            This is the real page, not a screenshot — tap the photos, flaps and hidden notes.
          </p>
        </div>

        <aside className="min-w-0 space-y-4">
          {isBuiltin && (
            <>
              <div>
                <span className="label">Design category</span>
                <div className="flex flex-wrap gap-1">
                  {categories.map((category) => (
                    <span key={category} className="admin-tag live">
                      {CATEGORY_LABELS[category]}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <span className="label">Works with</span>
                {supports && <SupportChips supports={supports} />}
              </div>
              <div className="rounded-xl border border-[rgba(156,100,116,.16)] bg-[#fffdf7]/60 px-3 py-2.5">
                <p className="text-[0.72rem] leading-relaxed text-ink/65">{target.def.description}</p>
                <p className="mt-2 text-[0.6rem] uppercase tracking-[0.14em] text-ink/40">
                  Template v{target.def.version} · {countPhotos(target.def.build())} photo slots
                </p>
              </div>
            </>
          )}

          {!isBuiltin && (
            <div className="rounded-xl border border-[rgba(156,100,116,.16)] bg-[#fffdf7]/60 px-3 py-2.5">
              <p className="text-[0.72rem] leading-relaxed text-ink/65">
                {target.template.description || 'A template saved from your own scrapbook pages.'}
              </p>
              <p className="mt-2 text-[0.6rem] uppercase tracking-[0.14em] text-ink/40">
                My template · v{target.template.version} · edited {relativeTime(target.template.updatedAt)}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <button type="button" className="btn btn-primary min-h-10 justify-center" onClick={onUse}>
              <Icon name="plus" size={15} /> Use this template
            </button>
            <button
              type="button"
              className="btn btn-ghost min-h-9 justify-center"
              onClick={() => {
                if (isBuiltin) duplicateTemplate(target.def.id);
                else duplicateTemplate(target.template.id);
              }}
            >
              <Icon name="copy" size={14} /> Duplicate to My Templates
            </button>
          </div>
        </aside>
      </div>
    </Modal>
  );
}

function UseTemplateModal({
  target,
  onClose,
}: {
  target: Target;
  onClose: () => void;
}) {
  const doc = useAppStore((state) => state.doc);
  const addPage = useAppStore((state) => state.addPage);
  const addPageFromCustomTemplate = useAppStore((state) => state.addPageFromCustomTemplate);
  const applyTemplate = useAppStore((state) => state.applyTemplate);
  const applyCustomTemplate = useAppStore((state) => state.applyCustomTemplate);
  const [mode, setMode] = useState<'new' | 'replace'>('new');
  const [pageId, setPageId] = useState<string>(doc?.pages[0]?.id ?? '');
  const [keepPhotos, setKeepPhotos] = useState(true);

  const pages = doc?.pages ?? [];
  const selected = pages.find((page) => page.id === pageId) ?? null;
  const name = targetName(target);

  const commit = () => {
    if (mode === 'new') {
      const page =
        target.kind === 'builtin'
          ? addPage(target.def.id)
          : addPageFromCustomTemplate(target.template.id);
      onClose();
      if (page) navigate(`/admin/pages/${encodeURIComponent(page.id)}`);
      return;
    }
    if (!pageId) return;
    const applied =
      target.kind === 'builtin'
        ? applyTemplate(pageId, target.def.id, keepPhotos)
        : applyCustomTemplate(pageId, target.template.id, keepPhotos);
    if (applied) {
      onClose();
      navigate(`/admin/pages/${encodeURIComponent(pageId)}`);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Use “${name}”`}
      subtitle="Start a fresh page, or give an existing page this design."
      size="lg"
      footer={
        <>
          <button type="button" className="btn btn-ghost min-h-10" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary min-h-10"
            disabled={mode === 'replace' && !selected}
            onClick={commit}
          >
            {mode === 'new' ? (
              <>
                <Icon name="plus" size={15} /> Add as a new page
              </>
            ) : (
              <>
                <Icon name="refresh" size={15} /> Replace “{selected?.name ?? 'page'}” layout
              </>
            )}
          </button>
        </>
      }
    >
      <div className="space-y-4 px-5 pb-3 pt-3 sm:px-6">
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            className={`rounded-2xl border p-3 text-left transition ${
              mode === 'new'
                ? 'border-[#9c6474] bg-[#c98c9d]/15'
                : 'border-[rgba(156,100,116,.18)] bg-[#fffdf7]/60 hover:border-[#c98c9d]/60'
            }`}
            aria-pressed={mode === 'new'}
            onClick={() => setMode('new')}
          >
            <span className="flex items-center gap-2 text-sm font-medium text-ink">
              <Icon name="plus" size={15} /> New page
            </span>
            <span className="mt-1 block text-[0.68rem] leading-snug text-ink/55">
              Adds “{name}” to the end of the book. Photo slots stay ready for your pictures.
            </span>
          </button>
          <button
            type="button"
            className={`rounded-2xl border p-3 text-left transition ${
              mode === 'replace'
                ? 'border-[#9c6474] bg-[#c98c9d]/15'
                : 'border-[rgba(156,100,116,.18)] bg-[#fffdf7]/60 hover:border-[#c98c9d]/60'
            }`}
            aria-pressed={mode === 'replace'}
            onClick={() => setMode('replace')}
          >
            <span className="flex items-center gap-2 text-sm font-medium text-ink">
              <Icon name="refresh" size={15} /> Replace a page
            </span>
            <span className="mt-1 block text-[0.68rem] leading-snug text-ink/55">
              Changes one page’s design. Nothing happens until you confirm below.
            </span>
          </button>
        </div>

        {mode === 'replace' && (
          <div className="space-y-3">
            <div>
              <span className="label">Which page should change?</span>
              <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1 thin-scroll">
                {pages.map((page, index) => (
                  <label
                    key={page.id}
                    className={`flex cursor-pointer items-center gap-2.5 rounded-xl border p-2 transition ${
                      pageId === page.id
                        ? 'border-[#9c6474] bg-[#c98c9d]/12'
                        : 'border-[rgba(156,100,116,.16)] hover:border-[#c98c9d]/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="template-target-page"
                      className="accent-[#9c6474]"
                      checked={pageId === page.id}
                      onChange={() => setPageId(page.id)}
                    />
                    <span className="block w-9 shrink-0 overflow-hidden rounded-md border border-black/5">
                      <PageThumb page={page} pageNumber={index + 1} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs text-ink">{page.name}</span>
                      <span className="block truncate text-[0.6rem] text-ink/45">
                        {templateDisplayName(page, doc?.customTemplates)} · {page.elements.length}{' '}
                        elements · {countPhotos(page)} photos
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <Toggle
              checked={keepPhotos}
              onChange={setKeepPhotos}
              label="Keep the photos already on this page"
              hint="Your uploaded pictures and captions move into the new layout. Turn this off only if you want a clean slate."
            />

            <p className="rounded-xl border border-[#c98c9d]/30 bg-[#f7e6e3]/60 px-3 py-2 text-[0.68rem] leading-relaxed text-[#7d4a56]">
              Replacing the layout removes this page’s text, stickers and decorations. Your photo
              library is never touched, and the page keeps its name and place in the book.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}

function CreateTemplateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const addPage = useAppStore((state) => state.addPage);
  const updatePageMeta = useAppStore((state) => state.updatePageMeta);
  const savePageAsTemplate = useAppStore((state) => state.savePageAsTemplate);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Give the template a name first.');
      return;
    }
    const page = addPage('blank');
    if (!page) return;
    updatePageMeta(page.id, { name: trimmed, template: 'custom', templateName: trimmed });
    savePageAsTemplate(page.id, { name: trimmed, description });
    onClose();
    navigate(`/admin/pages/${encodeURIComponent(page.id)}`);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create my own template"
      subtitle="A blank sheet, all yours. Add photos, words and stickers, then save it for reuse."
      size="md"
      footer={
        <>
          <button type="button" className="btn btn-ghost min-h-10" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary min-h-10" onClick={submit}>
            <Icon name="sparkles" size={15} /> Create & open editor
          </button>
        </>
      }
    >
      <div className="space-y-4 px-5 pb-3 pt-3 sm:px-6">
        <Field label="Template name" error={error}>
          <Input
            value={name}
            maxLength={60}
            placeholder="Our Sunday mornings"
            onChange={(event) => {
              setName(event.target.value);
              if (error) setError('');
            }}
          />
        </Field>
        <Field label="Short description" hint="Shown on the card in My Templates.">
          <Textarea
            value={description}
            rows={3}
            maxLength={180}
            placeholder="Slow coffee, two polaroids and a note for later."
            onChange={(event) => setDescription(event.target.value)}
          />
        </Field>
        <p className="rounded-xl border border-[rgba(156,100,116,.16)] bg-[#fffdf7]/60 px-3 py-2 text-[0.68rem] leading-relaxed text-ink/55">
          You will land in the page editor on a blank canvas. Arrange the pieces, save the draft,
          then use this template on as many pages as you like.
        </p>
      </div>
    </Modal>
  );
}

function RenameTemplateModal({
  template,
  onClose,
}: {
  template: CustomTemplate;
  onClose: () => void;
}) {
  const updateCustomTemplate = useAppStore((state) => state.updateCustomTemplate);
  const [name, setName] = useState(template.name);
  const [description, setDescription] = useState(template.description);

  return (
    <Modal
      open
      onClose={onClose}
      title="Rename my template"
      subtitle="Names and notes are only visible to you in the studio."
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
            onClick={() => {
              updateCustomTemplate(template.id, {
                name: name.trim() || template.name,
                description: description.trim(),
              });
              onClose();
            }}
          >
            Save changes
          </button>
        </>
      }
    >
      <div className="space-y-4 px-5 pb-3 pt-3 sm:px-6">
        <Field label="Template name">
          <Input value={name} maxLength={60} onChange={(event) => setName(event.target.value)} />
        </Field>
        <Field label="Short description">
          <Textarea
            value={description}
            rows={3}
            maxLength={180}
            onChange={(event) => setDescription(event.target.value)}
          />
        </Field>
      </div>
    </Modal>
  );
}

function LibraryCard({
  def,
  page,
  onPreview,
  onUse,
  onDuplicate,
}: {
  def: TemplateDefinition;
  page: Page;
  onPreview: () => void;
  onUse: () => void;
  onDuplicate: () => void;
}) {
  return (
    <article className="admin-page-card group">
      <button
        type="button"
        className="admin-thumb block aspect-[3/4] w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9c6474]"
        onClick={onPreview}
        aria-label={`Preview ${def.name}`}
      >
        <PageThumb page={page} pageNumber={1} />
        <span className="absolute left-2 top-2 rounded-full bg-[rgba(255,248,236,.94)] px-2 py-0.5 text-[0.58rem] uppercase tracking-[0.12em] text-deeprose shadow-sm">
          {CATEGORY_LABELS[def.category]}
        </span>
        <span className="absolute inset-x-2 bottom-2 flex items-center justify-center gap-1 rounded-lg bg-[rgba(48,34,40,.62)] px-2 py-1 text-[0.62rem] text-[#fff8ec] opacity-0 backdrop-blur-sm transition group-hover:opacity-100">
          <Icon name="eye" size={12} /> Open live preview
        </span>
      </button>
      <div className="flex min-w-0 flex-1 flex-col gap-2 px-3 py-3">
        <div className="min-w-0">
          <p className="font-display text-[0.92rem] leading-tight text-ink">{def.name}</p>
          <p className="mt-0.5 text-[0.66rem] leading-snug text-ink/55">{def.tagline}</p>
        </div>
        <SupportChips supports={def.supports} />
        <div className="mt-auto flex items-center gap-1.5 pt-1">
          <button
            type="button"
            className="chip min-h-8 flex-1 justify-center px-2 text-[0.68rem]"
            onClick={onPreview}
          >
            <Icon name="eye" size={13} /> Preview
          </button>
          <button
            type="button"
            className="btn btn-primary min-h-8 flex-1 px-2 text-[0.68rem]"
            onClick={onUse}
          >
            Use
          </button>
          <button
            type="button"
            className="icon-btn h-8 w-8"
            aria-label={`Duplicate ${def.name} to My Templates`}
            title="Duplicate to My Templates"
            onClick={onDuplicate}
          >
            <Icon name="copy" size={13} />
          </button>
        </div>
      </div>
    </article>
  );
}

function CustomCard({
  template,
  page,
  onPreview,
  onUse,
  onRename,
  onDuplicate,
  onDelete,
}: {
  template: CustomTemplate;
  page: Page;
  onPreview: () => void;
  onUse: () => void;
  onRename: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  return (
    <article className="admin-page-card group">
      <button
        type="button"
        className="admin-thumb block aspect-[3/4] w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9c6474]"
        onClick={onPreview}
        aria-label={`Preview ${template.name}`}
      >
        <PageThumb page={page} pageNumber={1} />
        <span className="absolute left-2 top-2 rounded-full bg-[rgba(255,248,236,.94)] px-2 py-0.5 text-[0.58rem] uppercase tracking-[0.12em] text-deeprose shadow-sm">
          My template
        </span>
        <span className="absolute inset-x-2 bottom-2 flex items-center justify-center gap-1 rounded-lg bg-[rgba(48,34,40,.62)] px-2 py-1 text-[0.62rem] text-[#fff8ec] opacity-0 backdrop-blur-sm transition group-hover:opacity-100">
          <Icon name="eye" size={12} /> Open live preview
        </span>
      </button>
      <div className="flex min-w-0 flex-1 flex-col gap-2 px-3 py-3">
        <div className="min-w-0">
          <p className="truncate font-display text-[0.92rem] leading-tight text-ink">{template.name}</p>
          <p className="mt-0.5 line-clamp-2 text-[0.66rem] leading-snug text-ink/55">
            {template.description || 'Your saved layout.'}
          </p>
        </div>
        <p className="text-[0.56rem] uppercase tracking-[0.12em] text-ink/40">
          {template.elements.length} elements · {countPhotos(page)} photos · v{template.version} ·
          edited {relativeTime(template.updatedAt)}
        </p>
        <div className="mt-auto flex items-center gap-1.5 pt-1">
          <button
            type="button"
            className="btn btn-primary min-h-8 flex-1 px-2 text-[0.68rem]"
            onClick={onUse}
          >
            Use
          </button>
          <button
            type="button"
            className="icon-btn h-8 w-8"
            aria-label={`Preview ${template.name}`}
            title="Preview"
            onClick={onPreview}
          >
            <Icon name="eye" size={13} />
          </button>
          <button
            type="button"
            className="icon-btn h-8 w-8"
            aria-label={`Rename ${template.name}`}
            title="Rename"
            onClick={onRename}
          >
            <Icon name="edit" size={13} />
          </button>
          <button
            type="button"
            className="icon-btn h-8 w-8"
            aria-label={`Duplicate ${template.name}`}
            title="Duplicate"
            onClick={onDuplicate}
          >
            <Icon name="copy" size={13} />
          </button>
          <button
            type="button"
            className="icon-btn h-8 w-8 text-[#8f4a56]"
            aria-label={`Delete ${template.name}`}
            title="Delete"
            onClick={onDelete}
          >
            <Icon name="trash" size={13} />
          </button>
        </div>
      </div>
    </article>
  );
}

export function TemplatesScreen() {
  const doc = useAppStore((state) => state.doc);
  const duplicateTemplate = useAppStore((state) => state.duplicateTemplate);
  const deleteCustomTemplate = useAppStore((state) => state.deleteCustomTemplate);
  const [tab, setTab] = useState<'library' | 'mine'>('library');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<TemplateCategory | 'all'>('all');
  const [sort, setSort] = useState<'recommended' | 'az' | 'photos'>('recommended');
  const [mineSort, setMineSort] = useState<'updated' | 'az' | 'photos'>('updated');
  const [preview, setPreview] = useState<Target | null>(null);
  const [using, setUsing] = useState<Target | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [renameId, setRenameId] = useState<string | null>(null);

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

  const visibleLibrary = useMemo(() => {
    const filtered = filterTemplates(
      library.map((item) => item.def),
      query,
      category,
    );
    const items = filtered.map((def) => library.find((item) => item.def.id === def.id)!);
    if (sort === 'az') return [...items].sort((a, b) => a.def.name.localeCompare(b.def.name));
    if (sort === 'photos') return [...items].sort((a, b) => countPhotos(b.page) - countPhotos(a.page));
    return items;
  }, [library, query, category, sort]);

  const visibleCustom = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const items = customTemplates
      .filter((template) =>
        needle
          ? `${template.name} ${template.description}`.toLowerCase().includes(needle)
          : true,
      )
      .map((template) => ({ template, page: pageFromCustomTemplate(template) }));
    if (mineSort === 'az') return [...items].sort((a, b) => a.template.name.localeCompare(b.template.name));
    if (mineSort === 'photos') return [...items].sort((a, b) => countPhotos(b.page) - countPhotos(a.page));
    return [...items].sort((a, b) => b.template.updatedAt - a.template.updatedAt);
  }, [customTemplates, query, mineSort]);

  if (!doc) return null;

  const renameTarget = customTemplates.find((template) => template.id === renameId) ?? null;

  const categoryCount = (item: TemplateCategory) =>
    BUILTIN_TEMPLATES.filter((def) => def.categories.includes(item)).length;

  return (
    <>
      <AdminHeader
        title="Templates"
        subtitle="Twelve designed starting points, plus the layouts you save yourself. Preview a template at phone, tablet and desktop sizes before it touches the book."
        actions={
          <>
            <button
              type="button"
              className="btn btn-ghost min-h-10"
              onClick={() => {
                setTab('mine');
                setQuery('');
              }}
            >
              <Icon name="heart" size={15} /> My templates ({customTemplates.length})
            </button>
            <button type="button" className="btn btn-primary min-h-10" onClick={() => setCreateOpen(true)}>
              <Icon name="plus" size={15} /> Create my own template
            </button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          className={`chip min-h-9 ${tab === 'library' ? 'active' : ''}`}
          aria-pressed={tab === 'library'}
          onClick={() => setTab('library')}
        >
          <Icon name="book" size={14} /> Template library
          <span className="ml-0.5 text-[0.6rem] opacity-60">{BUILTIN_TEMPLATES.length}</span>
        </button>
        <button
          type="button"
          className={`chip min-h-9 ${tab === 'mine' ? 'active' : ''}`}
          aria-pressed={tab === 'mine'}
          onClick={() => setTab('mine')}
        >
          <Icon name="heart" size={14} /> My templates
          <span className="ml-0.5 text-[0.6rem] opacity-60">{customTemplates.length}</span>
        </button>
      </div>

      {tab === 'library' ? (
        <>
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <SearchInput value={query} onChange={setQuery} placeholder="Search templates" />
            <Select
              value={sort}
              aria-label="Sort templates"
              className="sm:w-48"
              onChange={(event) => setSort(event.target.value as typeof sort)}
            >
              <option value="recommended">Sort: Recommended</option>
              <option value="az">Sort: A–Z</option>
              <option value="photos">Sort: Most photos</option>
            </Select>
          </div>

          <div className="-mx-1 mb-4 flex gap-1.5 overflow-x-auto px-1 pb-1 thin-scroll">
            <button
              type="button"
              className={`chip min-h-8 shrink-0 text-[0.7rem] ${category === 'all' ? 'active' : ''}`}
              aria-pressed={category === 'all'}
              onClick={() => setCategory('all')}
            >
              All <span className="opacity-60">{BUILTIN_TEMPLATES.length}</span>
            </button>
            {TEMPLATE_CATEGORIES.map((item) => (
              <button
                key={item}
                type="button"
                className={`chip min-h-8 shrink-0 text-[0.7rem] ${category === item ? 'active' : ''}`}
                aria-pressed={category === item}
                onClick={() => setCategory(item)}
              >
                {CATEGORY_LABELS[item]} <span className="opacity-60">{categoryCount(item)}</span>
              </button>
            ))}
          </div>

          {visibleLibrary.length === 0 ? (
            <EmptyState
              icon="search"
              title="No template matches that"
              body="Try another word, or clear the category filter to see all twelve designs."
              action={
                <button
                  type="button"
                  className="btn btn-ghost min-h-10"
                  onClick={() => {
                    setQuery('');
                    setCategory('all');
                  }}
                >
                  Clear filters
                </button>
              }
            />
          ) : (
            <div className="grid gap-3 xs:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visibleLibrary.map(({ def, page }) => (
                <LibraryCard
                  key={def.id}
                  def={def}
                  page={page}
                  onPreview={() => setPreview({ kind: 'builtin', def })}
                  onUse={() => setUsing({ kind: 'builtin', def })}
                  onDuplicate={() => duplicateTemplate(def.id)}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {customTemplates.length === 0 ? (
            <EmptyState
              icon="heart"
              title="No saved templates yet"
              body="Design a page you love, then choose “Save as my template” in the page builder. It will appear here, ready to reuse across the scrapbook."
              action={
                <button type="button" className="btn btn-primary min-h-10" onClick={() => setCreateOpen(true)}>
                  <Icon name="plus" size={15} /> Create my own template
                </button>
              }
            />
          ) : (
            <>
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                <SearchInput value={query} onChange={setQuery} placeholder="Search my templates" />
                <Select
                  value={mineSort}
                  aria-label="Sort my templates"
                  className="sm:w-52"
                  onChange={(event) => setMineSort(event.target.value as typeof mineSort)}
                >
                  <option value="updated">Sort: Recently edited</option>
                  <option value="az">Sort: A–Z</option>
                  <option value="photos">Sort: Most photos</option>
                </Select>
              </div>
              {visibleCustom.length === 0 ? (
                <EmptyState
                  icon="search"
                  title="Nothing here by that name"
                  body="Your saved templates are still safe — clear the search to see them all."
                  action={
                    <button type="button" className="btn btn-ghost min-h-10" onClick={() => setQuery('')}>
                      Clear search
                    </button>
                  }
                />
              ) : (
                <div className="grid gap-3 xs:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {visibleCustom.map(({ template, page }) => (
                    <CustomCard
                      key={template.id}
                      template={template}
                      page={page}
                      onPreview={() => setPreview({ kind: 'custom', template })}
                      onUse={() => setUsing({ kind: 'custom', template })}
                      onRename={() => setRenameId(template.id)}
                      onDuplicate={() => duplicateTemplate(template.id)}
                      onDelete={() => {
                        if (
                          window.confirm(
                            `Remove “${template.name}” from My Templates? Pages already made from it stay in the book, but they will no longer be linked to this template.`,
                          )
                        ) {
                          deleteCustomTemplate(template.id);
                        }
                      }}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      {preview && (
        <PreviewModal
          target={preview}
          onClose={() => setPreview(null)}
          onUse={() => {
            setUsing(preview);
            setPreview(null);
          }}
        />
      )}
      {using && <UseTemplateModal target={using} onClose={() => setUsing(null)} />}
      <CreateTemplateModal open={createOpen} onClose={() => setCreateOpen(false)} />
      {renameTarget && (
        <RenameTemplateModal template={renameTarget} onClose={() => setRenameId(null)} />
      )}
    </>
  );
}
