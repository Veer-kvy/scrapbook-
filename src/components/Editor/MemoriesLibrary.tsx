import { useMemo, useRef, useState } from 'react';
import type { PhotoMeta, ScrapbookDoc } from '../../types';
import { useAppStore } from '../../data/store';
import { formatDate } from '../../lib/utils';
import { Modal } from '../UI/Modal';
import { Icon } from '../UI/Icon';
import { TextField } from './controls';

function usePhotoUsage(doc: ScrapbookDoc | null) {
  return useMemo(() => {
    const usage = new Map<string, { pageId: string; name: string; index: number }[]>();
    doc?.pages.forEach((page, index) => {
      page.elements.forEach((element) => {
        if (element.kind !== 'photo') return;
        const list = usage.get(element.photoId) ?? [];
        if (!list.some((entry) => entry.pageId === page.id)) {
          list.push({ pageId: page.id, name: page.name, index });
        }
        usage.set(element.photoId, list);
      });
    });
    return usage;
  }, [doc]);
}

function PhotoTile({
  photo,
  url,
  usageCount,
  onOpen,
}: {
  photo: PhotoMeta;
  url?: string;
  usageCount: number;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      className="group relative aspect-square overflow-hidden rounded-xl border border-[rgba(156,100,116,.18)] bg-[rgba(255,250,240,.8)] text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-paper"
      onClick={onOpen}
      aria-label={`Open ${photo.name || 'photo'}`}
    >
      {url ? (
        <img
          src={url}
          alt={photo.caption || photo.name || 'A photograph'}
          loading="lazy"
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
        />
      ) : (
        <span className="grid h-full w-full place-items-center text-deeprose/50">
          <Icon name="image" size={24} />
        </span>
      )}
      <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[rgba(45,32,38,.72)] via-[rgba(45,32,38,.25)] to-transparent px-2.5 pb-2 pt-7">
        <span className="block truncate font-hand text-[1.05rem] leading-tight text-[#fff8ec]">
          {photo.name || 'untitled'}
        </span>
        {photo.date && (
          <span className="block text-[0.58rem] uppercase tracking-[0.14em] text-[#fff8ec]/70">
            {formatDate(photo.date)}
          </span>
        )}
      </span>
      {usageCount > 0 && (
        <span className="absolute right-2 top-2 rounded-full bg-[rgba(255,248,236,.9)] px-2 py-0.5 text-[0.58rem] font-medium text-deeprose shadow-sm">
          {usageCount} page{usageCount === 1 ? '' : 's'}
        </span>
      )}
    </button>
  );
}

export function MemoriesLibrary({
  open,
  mode,
  targetPageId,
  onClose,
}: {
  open: boolean;
  mode: 'manage' | 'place';
  targetPageId?: string | null;
  onClose: () => void;
}) {
  const doc = useAppStore((state) => state.doc);
  const mediaUrls = useAppStore((state) => state.mediaUrls);
  const addPhotos = useAppStore((state) => state.addPhotos);
  const updatePhoto = useAppStore((state) => state.updatePhoto);
  const deletePhoto = useAppStore((state) => state.deletePhoto);
  const addPhotoToPage = useAppStore((state) => state.addPhotoToPage);
  const addAlbum = useAppStore((state) => state.addAlbum);
  const renameAlbum = useAppStore((state) => state.renameAlbum);
  const deleteAlbum = useAppStore((state) => state.deleteAlbum);
  const goToPage = useAppStore((state) => state.goToPage);
  const beginGesture = useAppStore((state) => state.beginGesture);
  const endGesture = useAppStore((state) => state.endGesture);
  const notify = useAppStore((state) => state.notify);

  const usage = usePhotoUsage(doc);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newAlbumOpen, setNewAlbumOpen] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [albumDraft, setAlbumDraft] = useState('');
  const [confirmAlbumDelete, setConfirmAlbumDelete] = useState(false);
  const [confirmPhotoDelete, setConfirmPhotoDelete] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number; current: string } | null>(
    null,
  );
  const fileRef = useRef<HTMLInputElement>(null);

  const photos = doc?.photos ?? [];
  const albums = doc?.albums ?? [];
  const selected = photos.find((photo) => photo.id === selectedId) ?? null;
  const selectedAlbum = albums.find((album) => album.id === filter);
  const targetPage = doc?.pages.find((page) => page.id === targetPageId);
  const activeFilterAlbum = filter !== 'all' && filter !== 'unsorted' ? filter : null;

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    photos.forEach((photo) => {
      const key = photo.albumId ?? 'unsorted';
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return map;
  }, [photos]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return photos
      .filter((photo) => {
        if (filter === 'unsorted') return photo.albumId === null;
        if (filter !== 'all') return photo.albumId === filter;
        return true;
      })
      .filter((photo) => {
        if (!q) return true;
        return `${photo.name} ${photo.caption} ${photo.date}`.toLowerCase().includes(q);
      });
  }, [photos, filter, search]);

  const handleFiles = async (files: FileList | File[] | null) => {
    if (!files) return;
    const list = Array.from(files).filter((file) => file.type.startsWith('image/') || /\.(heic|heif)$/i.test(file.name));
    if (list.length === 0) {
      notify('Choose JPG, PNG, WebP, HEIC or AVIF images.', 'error');
      return;
    }
    setUploading(true);
    setProgress({ done: 0, total: list.length, current: list[0].name });
    try {
      await addPhotos(list, activeFilterAlbum, (done, total, current) => {
        setProgress({ done, total, current });
      });
    } finally {
      setUploading(false);
      setProgress(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const close = () => {
    setSelectedId(null);
    setConfirmPhotoDelete(false);
    onClose();
  };

  const renderDetail = (photo: PhotoMeta) => {
    const url = mediaUrls[photo.id] ?? photo.src;
    const usedOn = usage.get(photo.id) ?? [];
    return (
      <div className="px-4 pb-6 pt-4 sm:px-6">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            className="chip min-h-8"
            onClick={() => {
              setSelectedId(null);
              setConfirmPhotoDelete(false);
            }}
          >
            <Icon name="arrow-left" size={13} /> All memories
          </button>
          <span className="text-[0.62rem] uppercase tracking-[0.16em] muted">
            {usedOn.length > 0 ? `on ${usedOn.length} page${usedOn.length === 1 ? '' : 's'}` : 'not used yet'}
          </span>
        </div>

        <div className="mt-3 grid gap-5 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <div className="checker overflow-hidden rounded-xl border border-[rgba(156,100,116,.2)] shadow-paper">
              {url ? (
                <img
                  src={url}
                  alt={photo.caption || photo.name || 'A photograph'}
                  className="max-h-[46vh] w-full object-contain"
                />
              ) : (
                <div className="grid h-56 place-items-center text-deeprose/50">
                  <Icon name="image" size={28} />
                </div>
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[0.68rem] muted">
              <span>
                {photo.width} × {photo.height}px
              </span>
              <span>{url ? 'Ready to place' : 'File missing'}</span>
            </div>
            {mode === 'place' && targetPageId && (
              <button
                type="button"
                className="btn btn-primary mt-3 w-full"
                onClick={() => {
                  addPhotoToPage(photo.id, targetPageId);
                  close();
                }}
                disabled={!url}
              >
                <Icon name="plus" size={16} />
                Place on “{targetPage?.name ?? 'this page'}”
              </button>
            )}
          </div>

          <div className="space-y-3">
            <TextField
              label="Name"
              value={photo.name}
              maxLength={80}
              onFocus={() => beginGesture()}
              onBlur={() => endGesture()}
              onChange={(name) => updatePhoto(photo.id, { name })}
            />
            <TextField
              label="Caption"
              value={photo.caption}
              maxLength={160}
              onFocus={() => beginGesture()}
              onBlur={() => endGesture()}
              onChange={(caption) => updatePhoto(photo.id, { caption })}
            />
            <div className="grid grid-cols-2 gap-2">
              <TextField
                label="Date"
                type="date"
                value={photo.date}
                onFocus={() => beginGesture()}
                onBlur={() => endGesture()}
                onChange={(date) => updatePhoto(photo.id, { date })}
              />
              <label className="block">
                <span className="label">Album</span>
                <select
                  className="field min-h-[42px]"
                  value={photo.albumId ?? ''}
                  onChange={(event) =>
                    updatePhoto(photo.id, { albumId: event.target.value || null })
                  }
                >
                  <option value="">Unsorted</option>
                  {albums.map((album) => (
                    <option key={album.id} value={album.id}>
                      {album.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="rounded-xl border hairline p-3">
              <p className="text-[0.6rem] uppercase tracking-[0.18em] muted">Used on</p>
              {usedOn.length === 0 ? (
                <p className="mt-1.5 text-[0.72rem] leading-snug muted">
                  This photo is not on a page yet.
                </p>
              ) : (
                <ul className="mt-1.5 space-y-1">
                  {usedOn.map((entry) => (
                    <li key={entry.pageId}>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-2 rounded-md px-1.5 py-1 text-left text-[0.72rem] transition hover:bg-[#c98c9d]/10"
                        onClick={() => {
                          goToPage(entry.index);
                          close();
                        }}
                      >
                        <span className="truncate">
                          {String(entry.index + 1).padStart(2, '0')} · {entry.name}
                        </span>
                        <Icon name="arrow-right" size={12} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {!confirmPhotoDelete ? (
              <button
                type="button"
                className="chip min-h-9 w-full justify-center border-[#9c6474]/40 text-[#9c6474]"
                onClick={() => setConfirmPhotoDelete(true)}
              >
                <Icon name="trash" size={14} /> Delete from library
              </button>
            ) : (
              <div className="rounded-xl border border-[#9c6474]/30 bg-[#9c6474]/8 p-3">
                {usedOn.length > 0 ? (
                  <>
                    <p className="text-[0.72rem] font-medium leading-snug">
                      This photo is used on {usedOn.length} page
                      {usedOn.length === 1 ? '' : 's'}: {usedOn.map((entry) => entry.name).join(', ')}.
                    </p>
                    <p className="mt-1 text-[0.68rem] leading-snug muted">
                      The pages stay intact but will show a “photo unavailable” placeholder where it
                      was. You can replace it later.
                    </p>
                  </>
                ) : (
                  <p className="text-[0.72rem] font-medium leading-snug">
                    Delete this photo from your library? This cannot be undone.
                  </p>
                )}
                <div className="mt-2.5 flex gap-2">
                  <button
                    type="button"
                    className="chip min-h-8 flex-1 justify-center text-[0.66rem]"
                    onClick={() => setConfirmPhotoDelete(false)}
                  >
                    Keep it
                  </button>
                  <button
                    type="button"
                    className="chip min-h-8 flex-1 justify-center border-[#9c6474] bg-[#9c6474] text-[0.66rem] text-[#fff8ec]"
                    onClick={() => {
                      void deletePhoto(photo.id).then(() => {
                        setSelectedId(null);
                        setConfirmPhotoDelete(false);
                      });
                    }}
                  >
                    Delete anyway
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title={selected ? selected.name || 'Photograph' : 'My Memories'}
      subtitle={
        selected
          ? 'Edit the details, or see where this photo lives.'
          : mode === 'place'
            ? targetPage
              ? `Choose a photo for “${targetPage.name}”.`
              : 'Choose a photo to place on the page.'
            : `${photos.length} photograph${photos.length === 1 ? '' : 's'} in your library.`
      }
      size="full"
      footer={
        selected ? undefined : (
          <div className="flex w-full flex-wrap items-center justify-between gap-2">
            <span className="text-[0.66rem] muted">
              {uploading ? 'Uploading…' : 'Photos are stored locally on this device.'}
            </span>
            <button type="button" className="btn btn-secondary min-h-9" onClick={close}>
              Close
            </button>
          </div>
        )
      }
    >
      {selected ? (
        renderDetail(selected)
      ) : (
        <div
          className="relative px-4 pb-6 pt-3 sm:px-6"
          onDragEnter={(event) => {
            event.preventDefault();
            setDragActive(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={(event) => {
            if (event.currentTarget.contains(event.relatedTarget as Node)) return;
            setDragActive(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setDragActive(false);
            void handleFiles(event.dataTransfer.files);
          }}
        >
          {dragActive && (
            <div className="pointer-events-none sticky top-0 z-20 mb-3 grid place-items-center rounded-xl border-2 border-dashed border-[#c98c9d] bg-[rgba(255,248,236,.92)] px-4 py-6 text-center">
              <Icon name="upload" size={22} className="text-deeprose" />
              <p className="mt-1 font-hand text-xl text-deeprose">drop your photos here</p>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">Search photographs</span>
              <Icon
                name="search"
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-deeprose/60"
              />
              <input
                className="field !pl-9"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search names, captions or dates…"
              />
            </label>
            <button
              type="button"
              className="btn btn-primary min-h-9 px-3 text-xs"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              <Icon name="upload" size={15} />
              {uploading ? 'Uploading…' : 'Upload'}
            </button>
            <button
              type="button"
              className="btn btn-secondary min-h-9 px-3 text-xs"
              onClick={() => setNewAlbumOpen((value) => !value)}
            >
              <Icon name="folder" size={15} /> Album
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif"
              multiple
              className="sr-only"
              onChange={(event) => void handleFiles(event.target.files)}
            />
          </div>

          {progress && (
            <div className="mt-3 rounded-xl border hairline bg-[rgba(255,250,240,.7)] p-3" role="status" aria-live="polite">
              <div className="flex items-center justify-between gap-3 text-[0.68rem]">
                <span className="truncate">
                  Processing {progress.current || 'photos'}… {progress.done}/{progress.total}
                </span>
                <span className="shrink-0 tabular-nums">
                  {Math.round((progress.done / Math.max(1, progress.total)) * 100)}%
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#c98c9d]/20">
                <span
                  className="block h-full rounded-full bg-[#c98c9d] transition-all"
                  style={{ width: `${(progress.done / Math.max(1, progress.total)) * 100}%` }}
                />
              </div>
            </div>
          )}

          {newAlbumOpen && (
            <form
              className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border hairline bg-[rgba(255,250,240,.7)] p-2.5"
              onSubmit={(event) => {
                event.preventDefault();
                if (!newAlbumName.trim()) return;
                addAlbum(newAlbumName);
                setNewAlbumName('');
                setNewAlbumOpen(false);
              }}
            >
              <input
                className="field min-w-0 flex-1"
                value={newAlbumName}
                onChange={(event) => setNewAlbumName(event.target.value)}
                placeholder="Album name — trips, us, little days…"
                aria-label="New album name"
              />
              <button type="submit" className="btn btn-primary min-h-9 px-3 text-xs">
                Create
              </button>
              <button
                type="button"
                className="btn btn-secondary min-h-9 px-3 text-xs"
                onClick={() => setNewAlbumOpen(false)}
              >
                Cancel
              </button>
            </form>
          )}

          <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 hide-scrollbar">
            <button
              type="button"
              className={`chip min-h-8 shrink-0 text-[0.68rem] ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
              aria-pressed={filter === 'all'}
            >
              All <span className="opacity-60">{photos.length}</span>
            </button>
            <button
              type="button"
              className={`chip min-h-8 shrink-0 text-[0.68rem] ${filter === 'unsorted' ? 'active' : ''}`}
              onClick={() => setFilter('unsorted')}
              aria-pressed={filter === 'unsorted'}
            >
              Unsorted <span className="opacity-60">{counts.get('unsorted') ?? 0}</span>
            </button>
            {albums.map((album) => (
              <button
                key={album.id}
                type="button"
                className={`chip min-h-8 shrink-0 text-[0.68rem] ${filter === album.id ? 'active' : ''}`}
                onClick={() => {
                  setFilter(album.id);
                  setConfirmAlbumDelete(false);
                  setRenaming(false);
                }}
                aria-pressed={filter === album.id}
              >
                {album.name} <span className="opacity-60">{counts.get(album.id) ?? 0}</span>
              </button>
            ))}
          </div>

          {selectedAlbum && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[0.68rem]">
              {renaming ? (
                <form
                  className="flex min-w-0 flex-1 items-center gap-1.5"
                  onSubmit={(event) => {
                    event.preventDefault();
                    renameAlbum(selectedAlbum.id, albumDraft);
                    setRenaming(false);
                  }}
                >
                  <input
                    className="field min-w-0 flex-1 !py-1.5 text-xs"
                    value={albumDraft}
                    onChange={(event) => setAlbumDraft(event.target.value)}
                    aria-label="Rename album"
                    autoFocus
                  />
                  <button type="submit" className="chip min-h-7 px-2 text-[0.62rem]">
                    Save
                  </button>
                  <button
                    type="button"
                    className="chip min-h-7 px-2 text-[0.62rem]"
                    onClick={() => setRenaming(false)}
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <>
                  <button
                    type="button"
                    className="chip min-h-7 px-2 text-[0.62rem]"
                    onClick={() => {
                      setAlbumDraft(selectedAlbum.name);
                      setRenaming(true);
                    }}
                  >
                    <Icon name="edit" size={11} /> Rename album
                  </button>
                  {!confirmAlbumDelete ? (
                    <button
                      type="button"
                      className="chip min-h-7 px-2 text-[0.62rem] text-[#9c6474]"
                      onClick={() => setConfirmAlbumDelete(true)}
                    >
                      <Icon name="trash" size={11} /> Delete album
                    </button>
                  ) : (
                    <span className="flex flex-wrap items-center gap-1.5 rounded-full bg-[#9c6474]/10 px-2 py-1">
                      <span>Delete album but keep its photos?</span>
                      <button
                        type="button"
                        className="chip min-h-6 px-1.5 text-[0.6rem]"
                        onClick={() => setConfirmAlbumDelete(false)}
                      >
                        No
                      </button>
                      <button
                        type="button"
                        className="chip min-h-6 border-[#9c6474] bg-[#9c6474] px-1.5 text-[0.6rem] text-[#fff8ec]"
                        onClick={() => {
                          deleteAlbum(selectedAlbum.id);
                          setConfirmAlbumDelete(false);
                          setFilter('all');
                        }}
                      >
                        Yes
                      </button>
                    </span>
                  )}
                </>
              )}
            </div>
          )}

          {filtered.length === 0 ? (
            <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[#c98c9d]/45 bg-[rgba(255,250,240,.55)] px-5 py-10 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-[#c98c9d]/15 text-deeprose">
                <Icon name="image" size={22} />
              </span>
              <div>
                <p className="font-display text-lg text-ink">
                  {photos.length === 0 ? 'No photos yet' : 'Nothing matches'}
                </p>
                <p className="mt-1 text-[0.72rem] leading-snug muted">
                  {photos.length === 0
                    ? 'Upload from your phone or computer, or drag images into this window.'
                    : 'Try another album or clear the search.'}
                </p>
              </div>
              {photos.length === 0 && (
                <button
                  type="button"
                  className="btn btn-primary min-h-9"
                  onClick={() => fileRef.current?.click()}
                >
                  <Icon name="upload" size={15} /> Add your first photos
                </button>
              )}
            </div>
          ) : (
            <div className="media-grid mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
              {filtered.map((photo) => (
                <PhotoTile
                  key={photo.id}
                  photo={photo}
                  url={mediaUrls[photo.id] ?? photo.src}
                  usageCount={(usage.get(photo.id) ?? []).length}
                  onOpen={() => {
                    setSelectedId(photo.id);
                    setConfirmPhotoDelete(false);
                  }}
                />
              ))}
            </div>
          )}

          <p className="mt-4 text-center text-[0.62rem] leading-relaxed muted">
            Photos are compressed to a gentle size before they are stored. Originals stay on your
            device.
          </p>
        </div>
      )}
    </Modal>
  );
}
