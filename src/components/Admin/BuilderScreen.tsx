import { useEffect, useState } from 'react';
import type { PhotoElement, ScrapbookElement } from '../../types';
import { useAppStore } from '../../data/store';
import { navigate } from '../../lib/router';
import { PageCanvas } from '../Scrapbook/PageCanvas';
import { Inspector } from '../Editor/Inspector';
import { MemoriesLibrary } from '../Editor/MemoriesLibrary';
import { PhotoFramingModal } from '../Editor/PhotoFramingModal';
import { StickerGrid } from '../Editor/StickerGrid';
import { Icon } from '../UI/Icon';
import { SaveIndicator } from './ui';

type MobilePanel = 'add' | 'layers' | 'adjust' | null;

const KIND_ICON: Record<ScrapbookElement['kind'], 'image' | 'text' | 'sticker' | 'mail' | 'heart' | 'arrow-right' | 'sparkles'> = {
  photo: 'image',
  text: 'text',
  sticker: 'sticker',
  envelope: 'mail',
  hidden: 'heart',
  button: 'arrow-right',
  custom: 'sparkles',
};

function elementLabel(element: ScrapbookElement, assets: { id: string; name: string }[] | undefined) {
  switch (element.kind) {
    case 'text':
      return element.text.trim().slice(0, 34) || 'Empty text';
    case 'photo':
      return element.caption || 'Photograph';
    case 'sticker':
      return element.sticker;
    case 'envelope':
      return element.title || 'Envelope';
    case 'hidden':
      return element.prompt || 'Hidden note';
    case 'button':
      return element.label || 'Button';
    case 'custom':
      return assets?.find((asset) => asset.id === element.assetId)?.name || 'Decoration';
  }
}

function AddPalette({ pageId, onPickPhoto }: { pageId: string; onPickPhoto: () => void }) {
  const doc = useAppStore((state) => state.doc);
  const urls = useAppStore((state) => state.mediaUrls);
  const addText = useAppStore((state) => state.addText);
  const addStickerToPage = useAppStore((state) => state.addStickerToPage);
  const addEnvelope = useAppStore((state) => state.addEnvelope);
  const addHiddenNote = useAppStore((state) => state.addHiddenNote);
  const addButton = useAppStore((state) => state.addButton);
  const addCustomAssetToPage = useAppStore((state) => state.addCustomAssetToPage);

  const assets = doc?.customAssets ?? [];

  return (
    <div className="space-y-4 p-3">
      <div>
        <p className="mb-2 text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-ink/50">
          Put something on the page
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          <button type="button" className="builder-add" onClick={onPickPhoto}>
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#f3dcdc] text-deeprose">
              <Icon name="image" size={15} />
            </span>
            <span className="text-[0.74rem]">Polaroid photo</span>
          </button>
          <button type="button" className="builder-add" onClick={() => addText(pageId)}>
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#f3dcdc] text-deeprose">
              <Icon name="text" size={15} />
            </span>
            <span className="text-[0.74rem]">Handwritten text</span>
          </button>
          <button type="button" className="builder-add" onClick={() => addEnvelope(pageId)}>
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#f3dcdc] text-deeprose">
              <Icon name="mail" size={15} />
            </span>
            <span className="text-[0.74rem]">Letter envelope</span>
          </button>
          <button type="button" className="builder-add" onClick={() => addHiddenNote(pageId)}>
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#f3dcdc] text-deeprose">
              <Icon name="heart" size={15} />
            </span>
            <span className="text-[0.74rem]">Hidden surprise</span>
          </button>
          <button type="button" className="builder-add" onClick={() => addButton(pageId)}>
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#f3dcdc] text-deeprose">
              <Icon name="arrow-right" size={15} />
            </span>
            <span className="text-[0.74rem]">Interactive button</span>
          </button>
          <a href="#/admin/letters" className="builder-add">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#f3dcdc] text-deeprose">
              <Icon name="edit" size={15} />
            </span>
            <span className="text-[0.74rem]">Write a letter</span>
          </a>
        </div>
      </div>

      <div>
        <p className="mb-2 text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-ink/50">
          Decorations
        </p>
        {assets.length > 0 ? (
          <div className="grid grid-cols-3 gap-1.5">
            {assets.map((asset) => (
              <button
                key={asset.id}
                type="button"
                className="checker grid aspect-square place-items-center overflow-hidden rounded-lg border border-[rgba(156,100,116,.18)] p-1.5 transition hover:border-[#c98c9d]"
                title={asset.name}
                onClick={() => addCustomAssetToPage(pageId, asset.id)}
              >
                {urls[asset.id] ? (
                  <img src={urls[asset.id]} alt={asset.name} className="max-h-full max-w-full object-contain" />
                ) : (
                  <Icon name="image" size={15} />
                )}
              </button>
            ))}
          </div>
        ) : (
          <a href="#/admin/stickers" className="admin-card-soft block px-3 py-2.5 text-[0.68rem] leading-snug text-ink/55">
            Add a transparent PNG or SVG to your decoration library — then place it here.
          </a>
        )}
      </div>

      <div>
        <p className="mb-2 text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-ink/50">
          Stickers
        </p>
        <StickerGrid onPick={(sticker) => addStickerToPage(pageId, sticker)} />
      </div>
    </div>
  );
}

function LayersPanel({
  pageId,
  onSelect,
}: {
  pageId: string;
  onSelect?: () => void;
}) {
  const doc = useAppStore((state) => state.doc);
  const selectedId = useAppStore((state) => state.selectedId);
  const select = useAppStore((state) => state.select);
  const updateElement = useAppStore((state) => state.updateElement);
  const page = doc?.pages.find((item) => item.id === pageId);
  if (!page) return null;
  const layered = [...page.elements].sort((a, b) => b.z - a.z);

  return (
    <div className="p-3">
      <p className="mb-2 text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-ink/50">
        Layers · top first
      </p>
      {layered.length === 0 ? (
        <p className="px-1 py-4 text-[0.72rem] leading-relaxed text-ink/45">
          This page is empty. Add a photo, some words, or a sticker from the Add panel.
        </p>
      ) : (
        <ul className="space-y-1">
          {layered.map((element) => {
            const active = selectedId === element.id;
            return (
              <li key={element.id}>
                <div
                  className={`flex items-center gap-1.5 rounded-lg border px-1.5 py-1.5 transition ${
                    active ? 'border-[#c98c9d] bg-[#c98c9d]/15' : 'border-[rgba(156,100,116,.14)] hover:bg-[#c98c9d]/8'
                  }`}
                >
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    onClick={() => {
                      select(element.id);
                      onSelect?.();
                    }}
                  >
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-[#f3dcdc] text-deeprose">
                      <Icon name={KIND_ICON[element.kind]} size={12} />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[0.72rem]">
                      {elementLabel(element, doc?.customAssets)}
                    </span>
                    {element.interaction && element.interaction.type !== 'none' && (
                      <Icon name="sparkles" size={11} className="shrink-0 text-deeprose/70" />
                    )}
                  </button>
                  <button
                    type="button"
                    className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-ink/45 transition hover:bg-ink/5 hover:text-ink"
                    aria-label={element.locked ? 'Unlock layer' : 'Lock layer'}
                    title={element.locked ? 'Unlock' : 'Lock'}
                    onClick={() => updateElement(pageId, element.id, { locked: !element.locked })}
                  >
                    <Icon name={element.locked ? 'lock' : 'unlock'} size={11} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function BuilderScreen({ pageId }: { pageId: string }) {
  const doc = useAppStore((state) => state.doc);
  const pageIndex = useAppStore((state) => state.pageIndex);
  const goToPage = useAppStore((state) => state.goToPage);
  const select = useAppStore((state) => state.select);
  const undo = useAppStore((state) => state.undo);
  const redo = useAppStore((state) => state.redo);
  const past = useAppStore((state) => state.past);
  const future = useAppStore((state) => state.future);
  const updatePageMeta = useAppStore((state) => state.updatePageMeta);

  const [snap, setSnap] = useState(true);
  const [panel, setPanel] = useState<MobilePanel>(null);
  const [memoriesOpen, setMemoriesOpen] = useState(false);
  const [framing, setFraming] = useState<{ pageId: string; element: PhotoElement } | null>(null);
  const [nameDraft, setNameDraft] = useState<string | null>(null);

  const page = doc?.pages.find((item) => item.id === pageId) ?? null;
  const index = doc?.pages.findIndex((item) => item.id === pageId) ?? -1;

  useEffect(() => {
    if (index >= 0 && index !== pageIndex) goToPage(index);
  }, [index, pageIndex, goToPage]);

  useEffect(() => {
    setPanel(null);
    select(null);
    setNameDraft(null);
  }, [pageId, select]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      const mod = event.metaKey || event.ctrlKey;
      if (!mod) return;
      if (event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      } else if (event.key.toLowerCase() === 'y') {
        event.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [undo, redo]);

  if (!doc) return null;

  if (!page) {
    return (
      <div className="grid h-full place-items-center p-6">
        <div className="admin-card max-w-sm px-6 py-10 text-center">
          <h2 className="font-display text-xl">That page is gone</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-ink/55">
            It may have been deleted or the link is older than the draft.
          </p>
          <a href="#/admin/pages" className="btn btn-primary mt-5 inline-flex min-h-10">
            Back to all pages
          </a>
        </div>
      </div>
    );
  }

  const commitName = () => {
    if (nameDraft != null && nameDraft.trim() && nameDraft !== page.name) {
      updatePageMeta(page.id, { name: nameDraft.trim().slice(0, 60) });
    }
    setNameDraft(null);
  };

  const openPreview = () => {
    goToPage(index);
    navigate('/admin/preview');
  };

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-1.5 border-b border-[rgba(156,100,116,.16)] bg-[rgba(255,250,240,.85)] px-2 py-1.5 backdrop-blur">
        <a href="#/admin/pages" className="builder-tool shrink-0" title="Back to pages">
          <Icon name="arrow-left" size={14} />
          <span className="hidden xs:inline">Pages</span>
        </a>
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <select
            className="min-h-8 max-w-[190px] min-w-0 flex-1 rounded-lg border border-[rgba(156,100,116,.22)] bg-[#fffdf7]/85 px-2 text-[0.72rem]"
            value={page.id}
            aria-label="Choose a page"
            onChange={(event) => navigate(`/admin/pages/${encodeURIComponent(event.target.value)}`)}
          >
            {doc.pages.map((item, pageNumber) => (
              <option key={item.id} value={item.id}>
                {pageNumber + 1}. {item.name}
              </option>
            ))}
          </select>
          <input
            className="hidden min-h-8 max-w-[160px] flex-1 rounded-lg border border-transparent bg-transparent px-2 text-[0.72rem] text-ink outline-none transition hover:border-[rgba(156,100,116,.18)] focus:border-[#c98c9d] focus:bg-[#fffdf7] sm:block"
            value={nameDraft ?? page.name}
            aria-label="Page name"
            maxLength={60}
            onChange={(event) => setNameDraft(event.target.value)}
            onBlur={commitName}
            onKeyDown={(event) => {
              if (event.key === 'Enter') (event.target as HTMLInputElement).blur();
              if (event.key === 'Escape') setNameDraft(null);
            }}
          />
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="builder-tool"
            aria-label="Undo"
            title="Undo (⌘Z)"
            disabled={past.length === 0}
            onClick={undo}
          >
            <Icon name="undo" size={14} />
          </button>
          <button
            type="button"
            className="builder-tool"
            aria-label="Redo"
            title="Redo (⇧⌘Z)"
            disabled={future.length === 0}
            onClick={redo}
          >
            <Icon name="redo" size={14} />
          </button>
          <button
            type="button"
            className={`builder-tool ${snap ? 'active' : ''}`}
            aria-pressed={snap}
            title="Snap to centre and margins"
            onClick={() => setSnap((value) => !value)}
          >
            <Icon name="grip" size={13} />
            <span className="hidden xs:inline">Snap</span>
          </button>
          <button type="button" className="builder-tool" title="Preview this page" onClick={openPreview}>
            <Icon name="eye" size={14} />
            <span className="hidden sm:inline">Preview</span>
          </button>
          <span className="hidden md:inline-flex">
            <SaveIndicator compact />
          </span>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <aside className="builder-panel hidden w-[268px] shrink-0 overflow-y-auto border-r lg:flex">
          <div className="border-b border-[rgba(156,100,116,.14)] px-3 py-2">
            <p className="text-[0.58rem] uppercase tracking-[0.2em] text-ink/45">Components</p>
          </div>
          <AddPalette pageId={page.id} onPickPhoto={() => setMemoriesOpen(true)} />
          <div className="border-y border-[rgba(156,100,116,.14)] px-3 py-2">
            <p className="text-[0.58rem] uppercase tracking-[0.2em] text-ink/45">Layers</p>
          </div>
          <LayersPanel pageId={page.id} />
        </aside>

        <div className="builder-canvas relative min-w-0 flex-1 overflow-auto">
          <div className="flex min-h-full items-center justify-center p-3 pb-24 sm:p-6 lg:pb-6">
            <div
              className="w-full"
              style={{ maxWidth: 'min(100%, calc((100dvh - 220px) * 0.75))' }}
            >
              <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[4px] shadow-lift">
                <PageCanvas
                  page={page}
                  pageNumber={index + 1}
                  side="single"
                  interactive
                  snap={snap}
                  onActivate={() => setPanel(null)}
                  className="absolute inset-0 h-full w-full"
                />
              </div>
              <p className="mt-2 text-center text-[0.62rem] text-ink/40">
                Drag to move · corner handle to resize · top handle to rotate
              </p>
            </div>
          </div>

          {panel && (
            <>
              <button
                type="button"
                className="absolute inset-0 z-10 bg-[rgba(48,34,40,.28)] backdrop-blur-[1px] lg:hidden"
                aria-label="Close panel"
                onClick={() => setPanel(null)}
              />
              <div className="absolute inset-x-0 bottom-0 z-20 max-h-[64%] overflow-y-auto rounded-t-2xl border-t border-[rgba(156,100,116,.25)] bg-[#fffaf0] shadow-[0_-18px_40px_-24px_rgba(73,58,64,.6)] lg:hidden">
                <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-[rgba(156,100,116,.14)] bg-[#fffaf0]/95 px-3 py-2 backdrop-blur">
                  <p className="font-display text-[0.9rem] capitalize">{panel === 'adjust' ? 'Properties' : panel}</p>
                  <button type="button" className="icon-btn h-8 w-8" aria-label="Close panel" onClick={() => setPanel(null)}>
                    <Icon name="close" size={15} />
                  </button>
                </div>
                {panel === 'add' && <AddPalette pageId={page.id} onPickPhoto={() => setMemoriesOpen(true)} />}
                {panel === 'layers' && <LayersPanel pageId={page.id} onSelect={() => setPanel(null)} />}
                {panel === 'adjust' && (
                  <Inspector
                    pages={doc.pages}
                    activePageId={page.id}
                    onActivePageChange={(id) => navigate(`/admin/pages/${encodeURIComponent(id)}`)}
                    onOpenFraming={(id, element) => setFraming({ pageId: id, element })}
                    onOpenMemories={() => setMemoriesOpen(true)}
                    onOpenStickers={() => setPanel('add')}
                    onOpenPages={() => navigate('/admin/pages')}
                  />
                )}
              </div>
            </>
          )}
        </div>

        <aside className="builder-panel hidden w-[326px] shrink-0 overflow-y-auto border-l lg:block">
          <Inspector
            pages={doc.pages}
            activePageId={page.id}
            onActivePageChange={(id) => navigate(`/admin/pages/${encodeURIComponent(id)}`)}
            onOpenFraming={(id, element) => setFraming({ pageId: id, element })}
            onOpenMemories={() => setMemoriesOpen(true)}
            onOpenStickers={() => setPanel('add')}
            onOpenPages={() => navigate('/admin/pages')}
          />
        </aside>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-30 flex items-stretch gap-1 border-t border-[rgba(156,100,116,.2)] bg-[rgba(255,250,240,.96)] px-2 pb-[env(safe-area-inset-bottom,0px)] pt-1 backdrop-blur lg:hidden">
        {(
          [
            { key: 'add', label: 'Add', icon: 'plus' },
            { key: 'layers', label: 'Layers', icon: 'layers-up' },
            { key: 'adjust', label: 'Adjust', icon: 'sliders' },
          ] as const
        ).map((item) => (
          <button
            key={item.key}
            type="button"
            className={`flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl text-[0.6rem] transition ${
              panel === item.key ? 'bg-[#c98c9d]/20 text-deeprose' : 'text-ink/60'
            }`}
            aria-pressed={panel === item.key}
            onClick={() => setPanel((current) => (current === item.key ? null : item.key))}
          >
            <Icon name={item.icon} size={18} />
            {item.label}
          </button>
        ))}
        <button
          type="button"
          className="flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl text-[0.6rem] text-ink/60 transition"
          onClick={() => {
            select(null);
            setPanel('adjust');
          }}
        >
          <Icon name="pages" size={18} />
          Page
        </button>
      </div>

      <MemoriesLibrary
        open={memoriesOpen}
        mode="place"
        targetPageId={page.id}
        onClose={() => setMemoriesOpen(false)}
      />
      <PhotoFramingModal
        open={Boolean(framing)}
        pageId={framing?.pageId ?? page.id}
        element={framing?.element ?? null}
        onClose={() => setFraming(null)}
      />
    </div>
  );
}
