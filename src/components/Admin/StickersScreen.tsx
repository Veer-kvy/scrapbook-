import { useMemo, useRef, useState } from 'react';
import { useAppStore } from '../../data/store';
import { navigate } from '../../lib/router';
import { StickerGrid } from '../Editor/StickerGrid';
import { Icon } from '../UI/Icon';
import { AdminHeader, EmptyState, Input, Select, relativeTime } from './ui';

export function StickersScreen() {
  const doc = useAppStore((state) => state.doc);
  const mediaUrls = useAppStore((state) => state.mediaUrls);
  const addStickerToPage = useAppStore((state) => state.addStickerToPage);
  const addCustomAssetToPage = useAppStore((state) => state.addCustomAssetToPage);
  const addCustomAssetFile = useAppStore((state) => state.addCustomAssetFile);
  const renameCustomAsset = useAppStore((state) => state.renameCustomAsset);
  const deleteCustomAsset = useAppStore((state) => state.deleteCustomAsset);
  const notify = useAppStore((state) => state.notify);

  const [pageId, setPageId] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const pages = doc?.pages ?? [];
  const targetPage = pages.find((page) => page.id === pageId) ?? pages[0];

  const usage = useMemo(() => {
    const counts = new Map<string, number>();
    for (const page of pages) {
      for (const element of page.elements) {
        if (element.kind === 'custom') {
          counts.set(element.assetId, (counts.get(element.assetId) ?? 0) + 1);
        }
      }
    }
    return counts;
  }, [pages]);

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      await addCustomAssetFile(file);
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  const startRename = (id: string, current: string) => {
    setEditingId(id);
    setDraftName(current);
  };

  const commitRename = () => {
    if (!editingId) return;
    renameCustomAsset(editingId, draftName);
    setEditingId(null);
  };

  const removeAsset = (id: string, name: string) => {
    const used = usage.get(id) ?? 0;
    const message = used
      ? `“${name}” is used in ${used} place${used === 1 ? '' : 's'}. Deleting it will remove those decorations from your pages. Continue?`
      : `Delete “${name}”?`;
    if (!window.confirm(message)) return;
    deleteCustomAsset(id);
  };

  return (
    <div>
      <AdminHeader
        title="Stickers & decorations"
        subtitle="Little pieces of charm. Click a sticker to drop it on a page, then fine-tune it in the page builder."
        actions={
          <button
            type="button"
            className="btn btn-primary min-h-10"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            <Icon name="upload" size={15} />
            {uploading ? 'Uploading…' : 'Add decoration'}
          </button>
        }
      />

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/svg+xml,.png,.svg"
        multiple
        className="sr-only"
        onChange={(event) => void upload(event.target.files)}
      />

      <div className="admin-card mb-5 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="block min-w-[220px] flex-1">
            <span className="label">Place stickers on</span>
            <Select
              value={targetPage?.id ?? ''}
              onChange={(event) => setPageId(event.target.value)}
              disabled={!pages.length}
            >
              {pages.map((page, index) => (
                <option key={page.id} value={page.id}>
                  {index + 1}. {page.name}
                </option>
              ))}
            </Select>
          </label>
          {targetPage && (
            <button
              type="button"
              className="builder-tool min-h-10 px-3"
              onClick={() => navigate(`/admin/pages/${targetPage.id}`)}
            >
              <Icon name="edit" size={14} /> Open builder
            </button>
          )}
        </div>
        <p className="mt-2 text-[0.7rem] leading-relaxed text-ink/50">
          A sticker lands in the middle of the page and becomes a normal element — move, rotate, or
          delete it there. Positioning only touches the draft until you publish.
        </p>
      </div>

      {!pages.length ? (
        <EmptyState
          icon="pages"
          title="Create a page first"
          body="Stickers need somewhere to live. Add a page and then come back to decorate it."
          action={
            <a href="#/admin/pages" className="btn btn-primary inline-flex min-h-10">
              Go to pages
            </a>
          }
        />
      ) : (
        <div className="admin-card p-4 sm:p-5">
          <h2 className="font-display text-lg text-ink">Built-in stickers</h2>
          <p className="mb-4 mt-1 text-[0.72rem] text-ink/50">
            Washi tape, flowers, hearts, butterflies and more.
          </p>
          <StickerGrid
            onPick={(sticker) => {
              if (!targetPage) return;
              addStickerToPage(targetPage.id, sticker);
              notify(`Sticker placed on “${targetPage.name}”.`, 'success');
            }}
          />
        </div>
      )}

      <section className="mt-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg text-ink">Your own decorations</h2>
            <p className="mt-1 text-[0.72rem] text-ink/50">
              Transparent PNG or SVG, up to 4 MB each. They stay reusable across every page.
            </p>
          </div>
          <span className="admin-tag">{doc?.customAssets.length ?? 0} saved</span>
        </div>

        <div
          className={`rounded-2xl border border-dashed p-5 text-center transition ${
            dragging
              ? 'border-[#c98c9d] bg-[rgba(201,140,157,.12)]'
              : 'border-[rgba(156,100,116,.3)] bg-[rgba(255,250,240,.45)]'
          }`}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            void upload(event.dataTransfer.files);
          }}
        >
          <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-[#f3dcdc] text-deeprose">
            <Icon name="sticker" size={20} />
          </span>
          <p className="mt-2 text-sm text-ink">Drop a transparent PNG or SVG here</p>
          <p className="mt-1 text-[0.7rem] text-ink/45">or</p>
          <button
            type="button"
            className="btn btn-ghost mt-2 min-h-9"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? 'Uploading…' : 'Choose files'}
          </button>
        </div>

        {!doc?.customAssets.length ? (
          <div className="mt-4">
            <EmptyState
              icon="sticker"
              title="No decorations yet"
              body="Upload a little drawing, a scanned doodle, or a transparent sticker sheet. PNG and SVG keep their transparency."
            />
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {doc.customAssets.map((asset) => {
              const used = usage.get(asset.id) ?? 0;
              const url = mediaUrls[asset.id];
              return (
                <div key={asset.id} className="admin-card-soft flex flex-col overflow-hidden">
                  <div
                    className="grid aspect-square place-items-center p-3"
                    style={{
                      backgroundColor: '#fbf3e7',
                      backgroundImage:
                        'linear-gradient(45deg, rgba(156,100,116,.07) 25%, transparent 25%, transparent 75%, rgba(156,100,116,.07) 75%), linear-gradient(45deg, rgba(156,100,116,.07) 25%, transparent 25%, transparent 75%, rgba(156,100,116,.07) 75%)',
                      backgroundSize: '16px 16px',
                      backgroundPosition: '0 0, 8px 8px',
                    }}
                  >
                    {url ? (
                      <img
                        src={url}
                        alt={asset.name}
                        className="max-h-24 max-w-full object-contain"
                        loading="lazy"
                      />
                    ) : (
                      <span className="muted text-[0.7rem]">Preview unavailable</span>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-2 border-t border-[rgba(156,100,116,.14)] p-2.5">
                    {editingId === asset.id ? (
                      <div className="flex items-center gap-1">
                        <Input
                          value={draftName}
                          autoFocus
                          onChange={(event) => setDraftName(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') commitRename();
                            if (event.key === 'Escape') setEditingId(null);
                          }}
                          className="min-h-8 px-2 text-[0.76rem]"
                          aria-label="Decoration name"
                        />
                        <button
                          type="button"
                          className="icon-btn h-8 w-8 shrink-0"
                          aria-label="Save name"
                          onClick={commitRename}
                        >
                          <Icon name="check" size={13} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-start gap-1">
                        <span className="min-w-0 flex-1 truncate text-[0.78rem] text-ink" title={asset.name}>
                          {asset.name}
                        </span>
                        <button
                          type="button"
                          className="icon-btn h-7 w-7 shrink-0"
                          aria-label={`Rename ${asset.name}`}
                          onClick={() => startRename(asset.id, asset.name)}
                        >
                          <Icon name="edit" size={12} />
                        </button>
                      </div>
                    )}
                    <p className="text-[0.62rem] uppercase tracking-[0.1em] text-ink/40">
                      {asset.format.toUpperCase()} · {asset.width}×{asset.height} ·{' '}
                      {relativeTime(asset.createdAt)}
                    </p>
                    <p className="text-[0.64rem] text-ink/45">
                      {used ? `Used in ${used} place${used === 1 ? '' : 's'}` : 'Not used yet'}
                    </p>
                    <div className="mt-auto flex items-center gap-1.5 pt-1">
                      <button
                        type="button"
                        className="builder-tool flex-1 px-2 text-[0.66rem]"
                        disabled={!targetPage}
                        onClick={() => {
                          if (!targetPage) return;
                          addCustomAssetToPage(targetPage.id, asset.id);
                          notify(`“${asset.name}” placed on “${targetPage.name}”.`, 'success');
                        }}
                      >
                        <Icon name="plus" size={12} /> Place
                      </button>
                      <button
                        type="button"
                        className="builder-tool px-2 text-[#8f4a56]"
                        aria-label={`Delete ${asset.name}`}
                        onClick={() => removeAsset(asset.id, asset.name)}
                      >
                        <Icon name="trash" size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
