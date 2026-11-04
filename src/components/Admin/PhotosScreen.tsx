import { useMemo, useRef, useState } from 'react';
import type { PhotoMeta, ScrapbookDoc } from '../../types';
import { useAppStore } from '../../data/store';
import { navigate } from '../../lib/router';
import { formatDate } from '../../lib/utils';
import { Icon } from '../UI/Icon';
import { Modal } from '../UI/Modal';
import {
  AdminHeader,
  EmptyState,
  Field,
  Input,
  SearchInput,
  Select,
  StatCard,
} from './ui';

function usageMap(doc: ScrapbookDoc | null) {
  const map = new Map<string, { pageId: string; pageName: string; index: number }[]>();
  doc?.pages.forEach((page, index) => {
    page.elements.forEach((element) => {
      if (element.kind !== 'photo') return;
      const list = map.get(element.photoId) ?? [];
      list.push({ pageId: page.id, pageName: page.name, index });
      map.set(element.photoId, list);
    });
  });
  return map;
}

export function PhotosScreen() {
  const doc = useAppStore((state) => state.doc);
  const mediaUrls = useAppStore((state) => state.mediaUrls);
  const addPhotos = useAppStore((state) => state.addPhotos);
  const updatePhoto = useAppStore((state) => state.updatePhoto);
  const deletePhoto = useAppStore((state) => state.deletePhoto);
  const replacePhotoFile = useAppStore((state) => state.replacePhotoFile);
  const addPhotoToPage = useAppStore((state) => state.addPhotoToPage);
  const addAlbum = useAppStore((state) => state.addAlbum);
  const renameAlbum = useAppStore((state) => state.renameAlbum);
  const deleteAlbum = useAppStore((state) => state.deleteAlbum);
  const notify = useAppStore((state) => state.notify);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [placePageId, setPlacePageId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number; current: string } | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [albumModal, setAlbumModal] = useState<{ mode: 'new' | 'rename'; albumId?: string; value: string } | null>(null);
  const [replacing, setReplacing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);

  const photos = doc?.photos ?? [];
  const albums = doc?.albums ?? [];
  const usage = useMemo(() => usageMap(doc), [doc]);
  const selected = photos.find((photo) => photo.id === selectedId) ?? null;
  const albumFilter = filter !== 'all' && filter !== 'unsorted' ? filter : null;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...photos]
      .filter((photo) => {
        if (filter === 'unsorted') return photo.albumId === null;
        if (filter !== 'all') return photo.albumId === filter;
        return true;
      })
      .filter((photo) => {
        if (!q) return true;
        return `${photo.name} ${photo.caption} ${photo.date}`.toLowerCase().includes(q);
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [photos, filter, search]);

  const upload = async (list: FileList | File[] | null) => {
    if (!list) return;
    const files = Array.from(list);
    if (files.length === 0) return;
    setUploading(true);
    setProgress({ done: 0, total: files.length, current: files[0].name });
    try {
      const result = await addPhotos(files, albumFilter, (done, total, current) => {
        setProgress({ done, total, current });
      });
      if (result.errors.length) {
        notify(`${result.added} added. ${result.errors[0]}`, result.added ? 'info' : 'error');
      } else if (result.added) {
        notify(`${result.added} photograph${result.added === 1 ? '' : 's'} added.`, 'success');
      }
    } finally {
      setUploading(false);
      setProgress(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  if (!doc) return null;

  return (
    <>
      <AdminHeader
        title="Photo library"
        subtitle="Every photograph lives here once. Place the same memory on as many pages as you like — replacing a file keeps every layout exactly as it was."
        actions={
          <>
            <button
              type="button"
              className="btn btn-secondary min-h-10"
              onClick={() => setAlbumModal({ mode: 'new', value: '' })}
            >
              <Icon name="folder" size={15} /> New album
            </button>
            <button
              type="button"
              className="btn btn-primary min-h-10"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              <Icon name="upload" size={15} /> {uploading ? 'Adding…' : 'Upload photos'}
            </button>
          </>
        }
      />

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif"
        multiple
        className="sr-only"
        onChange={(event) => void upload(event.target.files)}
      />

      <div className="mb-4 grid gap-3 xs:grid-cols-3">
        <StatCard label="Photographs" value={photos.length} icon={<Icon name="image" size={16} />} />
        <StatCard label="Albums" value={albums.length} icon={<Icon name="folder" size={16} />} />
        <StatCard
          label="On pages"
          value={photos.reduce((sum, photo) => sum + (usage.get(photo.id)?.length ?? 0), 0)}
          icon={<Icon name="pages" size={16} />}
        />
      </div>

      <div className="admin-card mb-4 p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <SearchInput value={search} onChange={setSearch} placeholder="Search names, captions and dates" />
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              className={`chip min-h-9 ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All
            </button>
            <button
              type="button"
              className={`chip min-h-9 ${filter === 'unsorted' ? 'active' : ''}`}
              onClick={() => setFilter('unsorted')}
            >
              Unsorted
            </button>
            {albums.map((album) => (
              <button
                key={album.id}
                type="button"
                className={`chip min-h-9 ${filter === album.id ? 'active' : ''}`}
                onClick={() => setFilter(album.id)}
              >
                <Icon name="folder" size={12} /> {album.name}
              </button>
            ))}
          </div>
        </div>
        {albumFilter && (
          <div className="mt-2 flex items-center gap-2 border-t border-[rgba(156,100,116,.12)] pt-2 text-[0.7rem]">
            <span className="text-ink/50">
              Showing album “{albums.find((album) => album.id === albumFilter)?.name}”
            </span>
            <button
              type="button"
              className="text-deeprose underline decoration-[#c98c9d]/50 underline-offset-2"
              onClick={() =>
                setAlbumModal({
                  mode: 'rename',
                  albumId: albumFilter,
                  value: albums.find((album) => album.id === albumFilter)?.name ?? '',
                })
              }
            >
              Rename
            </button>
            <button
              type="button"
              className="text-[#8f4a56] underline decoration-[#9c6474]/40 underline-offset-2"
              onClick={() => {
                if (window.confirm('Remove this album? Its photos stay in the library, unsorted.')) {
                  deleteAlbum(albumFilter);
                  setFilter('all');
                }
              }}
            >
              Delete album
            </button>
          </div>
        )}
      </div>

      <div
        className={`mb-4 rounded-2xl border-2 border-dashed px-4 py-6 text-center transition ${
          dragActive
            ? 'border-[#9c6474] bg-[#c98c9d]/15'
            : 'border-[rgba(156,100,116,.28)] bg-[rgba(255,250,240,.5)]'
        }`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragActive(false);
          void upload(event.dataTransfer.files);
        }}
      >
        {progress ? (
          <div className="mx-auto max-w-md">
            <p className="text-sm text-ink">
              Adding {progress.done + 1} of {progress.total} · {progress.current}
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#e2cec7]">
              <div
                className="h-full rounded-full bg-[#9c6474] transition-all"
                style={{ width: `${Math.round((progress.done / Math.max(1, progress.total)) * 100)}%` }}
              />
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm text-ink/70">
              Drag photographs here, or{' '}
              <button
                type="button"
                className="font-medium text-deeprose underline decoration-[#c98c9d]/60 underline-offset-2"
                onClick={() => fileRef.current?.click()}
              >
                choose files
              </button>
            </p>
            <p className="mt-1 text-[0.68rem] text-ink/45">
              JPG, PNG, WebP, AVIF or HEIC · compressed gently before they are stored
            </p>
          </>
        )}
      </div>

      {photos.length === 0 ? (
        <EmptyState
          icon="image"
          title="No photographs yet"
          body="Upload a few favourite moments. They will be ready to place on any page, and you can reuse them as often as you like."
          action={
            <button type="button" className="btn btn-primary min-h-10" onClick={() => fileRef.current?.click()}>
              <Icon name="upload" size={15} /> Add your first photos
            </button>
          }
        />
      ) : filtered.length === 0 ? (
        <p className="admin-card px-4 py-8 text-center text-sm text-ink/50">
          Nothing matches that search in this album.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((photo) => {
            const used = usage.get(photo.id) ?? [];
            const url = mediaUrls[photo.id] ?? photo.src;
            return (
              <button
                key={photo.id}
                type="button"
                className="admin-page-card group text-left"
                onClick={() => {
                  setSelectedId(photo.id);
                  setPlacePageId('');
                }}
              >
                <span className="checker relative block aspect-square overflow-hidden bg-[#f3e8db]">
                  {url ? (
                    <img
                      src={url}
                      alt={photo.caption || photo.name || 'A photograph'}
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <span className="grid h-full w-full place-items-center text-deeprose/40">
                      <Icon name="image" size={22} />
                    </span>
                  )}
                  {used.length > 0 && (
                    <span className="absolute right-1.5 top-1.5 rounded-full bg-[rgba(255,248,236,.92)] px-1.5 py-0.5 text-[0.56rem] font-medium text-deeprose shadow-sm">
                      {used.length} page{used.length === 1 ? '' : 's'}
                    </span>
                  )}
                </span>
                <span className="block px-2.5 py-2">
                  <span className="block truncate text-[0.74rem] text-ink">{photo.name || 'Untitled'}</span>
                  <span className="block truncate text-[0.6rem] text-ink/45">
                    {photo.date ? formatDate(photo.date) : `${photo.width} × ${photo.height}`}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      {selected && (
        <PhotoDetail
          photo={selected}
          url={mediaUrls[selected.id] ?? selected.src}
          used={usage.get(selected.id) ?? []}
          albums={albums}
          pages={doc.pages.map((page, index) => ({ id: page.id, name: page.name, index }))}
          placePageId={placePageId}
          onPlacePageChange={setPlacePageId}
          replacing={replacing}
          onClose={() => setSelectedId(null)}
          onUpdate={(patch) => updatePhoto(selected.id, patch)}
          onReplace={() => replaceRef.current?.click()}
          onPlace={() => {
            if (!placePageId) return;
            addPhotoToPage(selected.id, placePageId);
            setSelectedId(null);
          }}
          onDelete={() => {
            const usedPages = usage.get(selected.id) ?? [];
            const warning =
              usedPages.length > 0
                ? `This photograph is used on ${usedPages.length} page${usedPages.length === 1 ? '' : 's'} (${usedPages
                    .map((page) => `“${page.pageName}”`)
                    .join(', ')}). Deleting it also removes it from those pages. Delete anyway?`
                : 'Delete this photograph from the library?';
            if (window.confirm(warning)) {
              void deletePhoto(selected.id);
              setSelectedId(null);
            }
          }}
        />
      )}

      <input
        ref={replaceRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif"
        className="sr-only"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file || !selected) return;
          setReplacing(true);
          await replacePhotoFile(selected.id, file);
          setReplacing(false);
          if (replaceRef.current) replaceRef.current.value = '';
        }}
      />

      {albumModal && (
        <Modal
          open
          onClose={() => setAlbumModal(null)}
          title={albumModal.mode === 'new' ? 'New album' : 'Rename album'}
          size="sm"
        >
          <form
            className="px-5 pb-6 pt-3 sm:px-6"
            onSubmit={(event) => {
              event.preventDefault();
              const value = albumModal.value.trim();
              if (!value) return;
              if (albumModal.mode === 'new') {
                addAlbum(value);
                setFilter('all');
              } else if (albumModal.albumId) {
                renameAlbum(albumModal.albumId, value);
              }
              setAlbumModal(null);
            }}
          >
            <Field label="Album name">
              <Input
                value={albumModal.value}
                maxLength={40}
                autoFocus
                onChange={(event) => setAlbumModal({ ...albumModal, value: event.target.value })}
                placeholder="Golden afternoons"
              />
            </Field>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="btn btn-secondary min-h-9" onClick={() => setAlbumModal(null)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary min-h-9">
                {albumModal.mode === 'new' ? 'Create album' : 'Save name'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

function PhotoDetail({
  photo,
  url,
  used,
  albums,
  pages,
  placePageId,
  onPlacePageChange,
  replacing,
  onClose,
  onUpdate,
  onReplace,
  onPlace,
  onDelete,
}: {
  photo: PhotoMeta;
  url?: string;
  used: { pageId: string; pageName: string; index: number }[];
  albums: { id: string; name: string }[];
  pages: { id: string; name: string; index: number }[];
  placePageId: string;
  onPlacePageChange: (id: string) => void;
  replacing: boolean;
  onClose: () => void;
  onUpdate: (patch: Partial<PhotoMeta>) => void;
  onReplace: () => void;
  onPlace: () => void;
  onDelete: () => void;
}) {
  return (
    <Modal open onClose={onClose} title={photo.name || 'Photograph'} size="lg">
      <div className="grid gap-5 px-5 pb-6 pt-3 sm:px-6 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <div className="checker overflow-hidden rounded-xl border border-[rgba(156,100,116,.2)] shadow-paper">
            {url ? (
              <img src={url} alt={photo.caption || photo.name} className="max-h-[52vh] w-full object-contain" />
            ) : (
              <div className="grid h-56 place-items-center text-deeprose/50">
                <Icon name="image" size={26} />
              </div>
            )}
          </div>
          <p className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[0.68rem] text-ink/45">
            <span>
              {photo.width} × {photo.height}px
              {photo.fileSize ? ` · ${(photo.fileSize / 1024).toFixed(0)} KB` : ''}
            </span>
            <button type="button" className="chip min-h-8 text-[0.66rem]" onClick={onReplace} disabled={replacing}>
              <Icon name="refresh" size={12} /> {replacing ? 'Replacing…' : 'Replace file'}
            </button>
          </p>
          {used.length > 0 && (
            <div className="mt-3">
              <p className="label">Used on</p>
              <ul className="flex flex-wrap gap-1.5">
                {used.map((page) => (
                  <li key={page.pageId}>
                    <button
                      type="button"
                      className="chip min-h-8 text-[0.66rem]"
                      onClick={() => {
                        onClose();
                        navigate(`/admin/pages/${encodeURIComponent(page.pageId)}`);
                      }}
                    >
                      <Icon name="pages" size={12} /> {page.index + 1}. {page.pageName}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="space-y-3.5">
          <Field label="Name">
            <Input value={photo.name} maxLength={80} onChange={(event) => onUpdate({ name: event.target.value })} />
          </Field>
          <Field label="Description">
            <Input
              value={photo.caption}
              maxLength={160}
              onChange={(event) => onUpdate({ caption: event.target.value })}
              placeholder="What is happening in this photograph?"
            />
          </Field>
          <div className="grid grid-cols-2 gap-2.5">
            <Field label="Date">
              <Input type="date" value={photo.date} onChange={(event) => onUpdate({ date: event.target.value })} />
            </Field>
            <Field label="Album">
              <Select
                value={photo.albumId ?? ''}
                onChange={(event) => onUpdate({ albumId: event.target.value || null })}
              >
                <option value="">Unsorted</option>
                {albums.map((album) => (
                  <option key={album.id} value={album.id}>
                    {album.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="rounded-xl border border-[rgba(156,100,116,.16)] bg-[#f6ecdf]/50 p-3">
            <p className="label">Place on a page</p>
            <div className="flex gap-2">
              <Select value={placePageId} onChange={(event) => onPlacePageChange(event.target.value)}>
                <option value="">Choose a page…</option>
                {pages.map((page) => (
                  <option key={page.id} value={page.id}>
                    {page.index + 1}. {page.name}
                  </option>
                ))}
              </Select>
              <button type="button" className="btn btn-primary min-h-10 shrink-0" disabled={!placePageId} onClick={onPlace}>
                <Icon name="plus" size={14} /> Place
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-[rgba(156,100,116,.16)] pt-3">
            <button type="button" className="chip min-h-9 border-[#9c6474]/40 text-[#9c6474]" onClick={onDelete}>
              <Icon name="trash" size={14} /> Delete photo
            </button>
            <button type="button" className="btn btn-secondary min-h-9" onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
