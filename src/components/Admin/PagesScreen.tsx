import { useState } from 'react';
import type { BackgroundId, Page, PageTransitionId } from '../../types';
import { useAppStore } from '../../data/store';
import {
  BACKGROUNDS,
  TRANSITION_OPTIONS,
} from '../../data/factories';
import { templateDisplayName } from '../../templates/registry';
import { navigate } from '../../lib/router';
import { Icon } from '../UI/Icon';
import { Modal } from '../UI/Modal';
import { SaveTemplateModal, TemplatePickerModal } from './TemplatePicker';
import { AdminHeader, Field, Input, PageThumb, Select } from './ui';
const BG_CLASS: Record<BackgroundId, string> = {
  cream: 'bg-paper-cream',
  blush: 'bg-paper-blush',
  dots: 'bg-paper-dots',
  grid: 'bg-paper-grid',
  sprinkle: 'bg-paper-sprinkle',
  linen: 'bg-paper-linen',
  ombre: 'bg-paper-ombre',
  aged: 'bg-paper-aged',
  ivory: 'bg-paper-ivory',
  sweet: 'bg-paper-sweet',
  midnight: 'bg-paper-midnight',
};

function AddPageModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return <TemplatePickerModal open={open} onClose={onClose} mode="add" />;
}

function PageSettingsModal({
  page,
  index,
  onClose,
}: {
  page: Page;
  index: number;
  onClose: () => void;
}) {
  const doc = useAppStore((state) => state.doc);
  const updatePageMeta = useAppStore((state) => state.updatePageMeta);
  const duplicatePage = useAppStore((state) => state.duplicatePage);
  const deletePage = useAppStore((state) => state.deletePage);
  const movePage = useAppStore((state) => state.movePage);
  const goToPage = useAppStore((state) => state.goToPage);
  const resetPageToTemplate = useAppStore((state) => state.resetPageToTemplate);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);

  const pages = doc?.pages ?? [];

  return (
    <>
      <Modal open onClose={onClose} title={`Page ${index + 1} settings`} subtitle="Names, paper, transitions and layout all live here." size="md">
      <div className="space-y-4 px-5 pb-6 pt-3 sm:px-6">
        <Field label="Page name">
          <Input
            value={page.name}
            maxLength={60}
            onChange={(event) => updatePageMeta(page.id, { name: event.target.value })}
          />
        </Field>

        <div>
          <span className="label">Paper</span>
          <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-7">
            {BACKGROUNDS.map((background) => (
              <button
                key={background.id}
                type="button"
                className={`flex flex-col items-center gap-1 rounded-lg p-1 transition ${
                  page.bg === background.id ? 'bg-[#c98c9d]/25' : 'hover:bg-[#c98c9d]/10'
                }`}
                onClick={() => updatePageMeta(page.id, { bg: background.id })}
                aria-pressed={page.bg === background.id}
                title={background.label}
              >
                <span className={`block h-9 w-full rounded-md border border-black/10 ${BG_CLASS[background.id]}`} />
                <span className="w-full truncate text-center text-[0.54rem] uppercase tracking-wide opacity-70">
                  {background.label.split(' ')[0]}
                </span>
              </button>
            ))}
          </div>
        </div>

        <Field label="Page turn" hint="Readers see this when moving between pages.">
          <Select
            value={page.transition ?? 'turn'}
            onChange={(event) => updatePageMeta(page.id, { transition: event.target.value as PageTransitionId })}
          >
            {TRANSITION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} — {option.hint}
              </option>
            ))}
          </Select>
        </Field>

        <div className="rounded-xl border border-[rgba(156,100,116,.16)] bg-[#fffdf7]/60 p-3">
          <span className="label">Template</span>
          <p className="text-sm text-ink">{templateDisplayName(page, doc?.customTemplates)}</p>
          <p className="mt-0.5 text-[0.66rem] leading-snug text-ink/45">
            {page.elements.length} elements. Changing the template keeps this page’s name, place in
            the book and uploaded photos.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <button type="button" className="chip min-h-9" onClick={() => setPickerOpen(true)}>
              <Icon name="sparkles" size={14} /> Change template
            </button>
            <button
              type="button"
              className="chip min-h-9"
              onClick={() => {
                if (
                  window.confirm(
                    `Reset “${page.name}” to its original template layout? Text and stickers added here will be removed; your photos stay.`,
                  )
                ) {
                  resetPageToTemplate(page.id);
                }
              }}
            >
              <Icon name="refresh" size={14} /> Reset layout
            </button>
            <button type="button" className="chip min-h-9" onClick={() => setSaveOpen(true)}>
              <Icon name="heart" size={14} /> Save as my template
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 border-t border-[rgba(156,100,116,.16)] pt-4">
          <button type="button" className="chip min-h-9" onClick={() => duplicatePage(page.id)}>
            <Icon name="copy" size={14} /> Duplicate
          </button>
          <button type="button" className="chip min-h-9" disabled={index === 0} onClick={() => movePage(page.id, -1)}>
            <Icon name="arrow-left" size={14} /> Move earlier
          </button>
          <button
            type="button"
            className="chip min-h-9"
            disabled={index === pages.length - 1}
            onClick={() => movePage(page.id, 1)}
          >
            Move later <Icon name="arrow-right" size={14} />
          </button>
          <button
            type="button"
            className="chip min-h-9"
            onClick={() => {
              goToPage(index);
              navigate('/admin/preview');
            }}
          >
            <Icon name="eye" size={14} /> Preview page
          </button>
          <button
            type="button"
            className="chip min-h-9 border-[#9c6474]/40 text-[#9c6474]"
            disabled={pages.length <= 1}
            onClick={() => {
              if (
                window.confirm(
                  pages.length > 1
                    ? `Delete “${page.name}” and its ${page.elements.length} elements? This cannot be undone.`
                    : 'Delete this page?',
                )
              ) {
                deletePage(page.id);
                onClose();
              }
            }}
          >
            <Icon name="trash" size={14} /> Delete page
          </button>
        </div>
      </div>
    </Modal>
      <TemplatePickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        mode="replace"
        page={page}
      />
      <SaveTemplateModal open={saveOpen} onClose={() => setSaveOpen(false)} page={page} />
    </>
  );
}

export function PagesScreen() {
  const doc = useAppStore((state) => state.doc);
  const movePageTo = useAppStore((state) => state.movePageTo);
  const duplicatePage = useAppStore((state) => state.duplicatePage);
  const [addOpen, setAddOpen] = useState(false);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  if (!doc) return null;
  const pages = doc.pages;
  const settingsPage = pages.find((page) => page.id === settingsId) ?? null;

  return (
    <>
      <AdminHeader
        title="Scrapbook pages"
        subtitle="Arrange the book from first page to last. Open a page to arrange photographs, words and little surprises."
        actions={
          <button type="button" className="btn btn-primary min-h-10" onClick={() => setAddOpen(true)}>
            <Icon name="plus" size={15} /> Add page
          </button>
        }
      />

      <div className="grid gap-3 xs:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
        {pages.map((page, index) => (
          <article
            key={page.id}
            className={`admin-page-card group ${dragId === page.id ? 'opacity-60' : ''}`}
            draggable
            onDragStart={() => setDragId(page.id)}
            onDragEnd={() => setDragId(null)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              if (dragId && dragId !== page.id) movePageTo(dragId, index);
              setDragId(null);
            }}
          >
            <a
              href={`#/admin/pages/${encodeURIComponent(page.id)}`}
              className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9c6474]"
              aria-label={`Open page ${index + 1}: ${page.name}`}
            >
              <span className="admin-thumb block aspect-[3/4]">
                <PageThumb page={page} pageNumber={index + 1} />
                <span className="absolute inset-0 bg-gradient-to-t from-[rgba(48,34,40,.3)] via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
                <span className="absolute left-2 top-2 rounded-full bg-[rgba(255,248,236,.92)] px-2 py-0.5 font-display text-[0.66rem] text-deeprose shadow-sm">
                  {String(index + 1).padStart(2, '0')}
                </span>
              </span>
            </a>
            <div className="flex items-center gap-1 px-2.5 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.78rem] font-medium text-ink">{page.name}</p>
                <p className="text-[0.6rem] text-ink/45">
                  {page.elements.length} elements · {page.bg}
                </p>
              </div>
              <button
                type="button"
                className="icon-btn h-8 w-8"
                aria-label={`Settings for ${page.name}`}
                title="Page settings"
                onClick={() => setSettingsId(page.id)}
              >
                <Icon name="settings" size={14} />
              </button>
              <button
                type="button"
                className="icon-btn h-8 w-8"
                aria-label={`Duplicate ${page.name}`}
                title="Duplicate page"
                onClick={() => duplicatePage(page.id)}
              >
                <Icon name="copy" size={14} />
              </button>
            </div>
          </article>
        ))}

        <button
          type="button"
          className="admin-card-soft flex min-h-[220px] flex-col items-center justify-center gap-2 border-dashed p-6 text-ink/50 transition hover:border-[#c98c9d]/60 hover:text-deeprose"
          onClick={() => setAddOpen(true)}
        >
          <span className="grid h-11 w-11 place-items-center rounded-full bg-[#f3dcdc] text-deeprose">
            <Icon name="plus" size={20} />
          </span>
          <span className="text-sm font-medium">Add another page</span>
          <span className="max-w-[20ch] text-center text-[0.68rem] leading-snug">
            Start from a layout or a completely blank sheet.
          </span>
        </button>
      </div>

      <AddPageModal open={addOpen} onClose={() => setAddOpen(false)} />
      {settingsPage && (
        <PageSettingsModal
          page={settingsPage}
          index={pages.findIndex((page) => page.id === settingsPage.id)}
          onClose={() => setSettingsId(null)}
        />
      )}
    </>
  );
}
