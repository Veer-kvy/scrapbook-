import type {
  BookSummary,
  MakerProfile,
  PublishedBookSummary,
  PublishedState,
  ScrapbookDoc,
  StoredVersion,
  VersionSummary,
} from '../types';
import {
  addBookIdToVersions,
  copyBlob,
  deleteBlob,
  deleteBlobsWithPrefix,
  deleteBookRecord,
  deleteLegacyDoc,
  deleteLegacyPublication,
  deleteStoredDoc,
  deleteVersion as removeVersion,
  loadAllBlobs,
  loadBooks,
  loadLegacyDoc,
  loadLegacyPublication,
  loadProfile,
  loadPublication,
  loadStoredDoc,
  loadStudioPass,
  loadVersions,
  putBlob,
  saveBook,
  saveProfile,
  savePublication,
  saveStoredDoc,
  saveStudioPass,
  saveVersion,
} from '../data/db';
import { hasAdminSession, startAdminSession, endAdminSession, hashPasscode } from '../lib/auth';
import { createBookDoc, createSeedDoc } from '../data/seed';
import { uid } from '../lib/utils';
import { slugify, uniqueSlug } from '../lib/slug';
import {
  conflictError,
  type AuthUser,
  type BookPatch,
  type ContentBackend,
  type MediaUploadInput,
  type MediaUploadResult,
  type PublishProgress,
  type PublishedSnapshot,
  type SaveOptions,
  type SignInInput,
} from './types';

const LOCAL_USER: AuthUser = { email: null, name: 'Local administrator' };
const MAX_VERSIONS = 25;

function summary(version: StoredVersion): VersionSummary {
  return {
    id: version.id,
    versionNumber: version.versionNumber,
    label: version.label,
    publishedAt: version.publishedAt,
    pageCount: version.pageCount,
    photoCount: version.photoCount,
    letterCount: version.letterCount,
  };
}

function withoutSecrets(doc: ScrapbookDoc): ScrapbookDoc {
  return {
    ...structuredClone(doc),
    meta: { ...doc.meta, passHash: '', passHint: '' },
  };
}

/* -------------------------------------------------------------- migration */

let libraryPromise: Promise<void> | null = null;

/**
 * Brings the single-book layout written by earlier versions into the library
 * model: one book record, its draft under the book id, and its publication
 * moved to `pub:<bookId>`.
 */
async function migrateSingleBook(): Promise<void> {
  const books = await loadBooks();
  if (books.length) return;

  const legacyDoc = await loadLegacyDoc();
  const legacyPublication = await loadLegacyPublication();
  if (!legacyDoc && !legacyPublication) return;

  const id = uid('book-');
  const title = legacyDoc?.meta.title?.trim() || 'My first scrapbook';
  const book: BookSummary = {
    id,
    slug: uniqueSlug(title, []),
    title,
    recipient: legacyDoc?.meta.recipient ?? '',
    updatedAt: legacyDoc?.updatedAt ?? Date.now(),
    pageCount: legacyDoc?.pages.length ?? 0,
    photoCount: legacyDoc?.photos.length ?? 0,
    publishedAt: legacyPublication?.publishedAt ?? null,
    versionNumber: legacyPublication?.versionNumber ?? null,
  };

  await saveBook(book);
  if (legacyDoc) {
    await saveStoredDoc(id, legacyDoc);
    if (legacyDoc.meta.passHash) await saveStudioPass(legacyDoc.meta.passHash);
  }
  if (legacyPublication) {
    await addBookIdToVersions(id);
    await savePublication(id, legacyPublication);
  }
  await deleteLegacyDoc();
  await deleteLegacyPublication();
}

function ensureLibrary(): Promise<void> {
  if (!libraryPromise) {
    libraryPromise = migrateSingleBook().catch((error) => {
      libraryPromise = null;
      throw error;
    });
  }
  return libraryPromise;
}

/* ----------------------------------------------------------------- helpers */

async function findBook(bookId: string): Promise<BookSummary | null> {
  return (await loadBooks()).find((book) => book.id === bookId) ?? null;
}

async function writeBook(book: BookSummary): Promise<void> {
  await saveBook(book);
}

async function syncBookFromDoc(bookId: string, doc: ScrapbookDoc): Promise<BookSummary | null> {
  const book = await findBook(bookId);
  if (!book) return null;
  const next: BookSummary = {
    ...book,
    title: doc.meta.title.trim() || book.title,
    recipient: doc.meta.recipient,
    updatedAt: doc.updatedAt,
    pageCount: doc.pages.length,
    photoCount: doc.photos.length,
  };
  await writeBook(next);
  return next;
}

/** Deep-copies a scrapbook for a new book, giving media its own blob keys. */
async function cloneDoc(source: ScrapbookDoc, title: string): Promise<ScrapbookDoc> {
  const doc = structuredClone(source);
  const pageMap = new Map<string, string>();
  doc.pages = doc.pages.map((page) => {
    const id = uid('page-');
    pageMap.set(page.id, id);
    return { ...page, id };
  });

  const albumMap = new Map<string, string>();
  doc.albums = doc.albums.map((album) => {
    const id = uid('album-');
    albumMap.set(album.id, id);
    return { ...album, id };
  });

  const photoMap = new Map<string, string>();
  for (const photo of doc.photos) {
    const id = uid('photo-');
    photoMap.set(photo.id, id);
    if (photo.blobId && !photo.blobId.startsWith('pub/')) {
      const blobKey = uid('blob-');
      const copied = await copyBlob(photo.blobId, blobKey);
      if (copied) photo.blobId = blobKey;
    }
    photo.id = id;
    photo.albumId = photo.albumId ? (albumMap.get(photo.albumId) ?? null) : null;
  }

  const assetMap = new Map<string, string>();
  for (const asset of doc.customAssets) {
    const id = uid('asset-');
    assetMap.set(asset.id, id);
    if (asset.blobId && !asset.blobId.startsWith('pub/')) {
      const blobKey = uid('blob-');
      const copied = await copyBlob(asset.blobId, blobKey);
      if (copied) asset.blobId = blobKey;
    }
    asset.id = id;
  }

  const letterMap = new Map<string, string>();
  doc.letters = doc.letters.map((letter) => {
    const id = uid('letter-');
    letterMap.set(letter.id, id);
    return { ...letter, id, createdAt: Date.now(), updatedAt: Date.now() };
  });

  doc.pages = doc.pages.map((page) => ({
    ...page,
    elements: page.elements.map((element) => {
      const id = uid('el-');
      const next = { ...element, id };
      if (next.kind === 'photo') next.photoId = photoMap.get(next.photoId) ?? next.photoId;
      if (next.kind === 'custom') next.assetId = assetMap.get(next.assetId) ?? next.assetId;
      if (next.interaction?.targetPageId) {
        next.interaction = {
          ...next.interaction,
          targetPageId: pageMap.get(next.interaction.targetPageId) ?? next.interaction.targetPageId,
        };
      }
      if (next.kind === 'envelope' && next.letterId) {
        next.letterId = letterMap.get(next.letterId) ?? next.letterId;
      }
      return next;
    }),
  }));

  doc.meta = {
    ...doc.meta,
    title,
    passHash: '',
    passHint: '',
  };
  doc.updatedAt = Date.now();
  return doc;
}

async function deleteBookMedia(doc: ScrapbookDoc | null, versionIds: string[]): Promise<void> {
  if (doc) {
    for (const photo of doc.photos) {
      if (photo.blobId && !photo.blobId.startsWith('pub/')) await deleteBlob(photo.blobId);
    }
    for (const asset of doc.customAssets) {
      if (asset.blobId && !asset.blobId.startsWith('pub/')) await deleteBlob(asset.blobId);
    }
  }
  for (const versionId of versionIds) {
    await deleteBlobsWithPrefix(`pub/${versionId}/`);
  }
}

/* ----------------------------------------------------------------- backend */

/**
 * Local development backend. Every scrapbook, draft, published version and
 * photograph lives in IndexedDB on this device. The studio passcode is a local
 * gate — real authorization requires the Supabase backend (see README).
 */
export const localBackend: ContentBackend = {
  mode: 'local',
  label: 'On this device',
  storageNote: 'Drafts, versions and photographs are stored in this browser (IndexedDB).',

  async init() {
    await ensureLibrary();
  },

  async getUser() {
    return hasAdminSession() ? LOCAL_USER : null;
  },

  async signIn(input: SignInInput) {
    await ensureLibrary();
    const stored = await loadStudioPass();
    if (!stored) {
      throw new Error('Set up an admin passcode before signing in.');
    }
    if (!input.passcode) throw new Error('Enter your admin passcode.');
    const hash = await hashPasscode(input.passcode);
    if (hash !== stored) throw new Error('That passcode is not correct.');
    startAdminSession();
    return LOCAL_USER;
  },

  async requiresSetup() {
    await ensureLibrary();
    return !(await loadStudioPass());
  },

  async setup(input: SignInInput) {
    const passcode = input.passcode?.trim() ?? '';
    if (passcode.length < 4) {
      throw new Error('Choose a passcode with at least 4 characters.');
    }
    await ensureLibrary();
    if (!(await loadBooks()).length) {
      const doc = createSeedDoc();
      const id = uid('book-');
      await saveStoredDoc(id, doc);
      await saveBook({
        id,
        slug: uniqueSlug(doc.meta.title, []),
        title: doc.meta.title,
        recipient: doc.meta.recipient,
        updatedAt: doc.updatedAt,
        pageCount: doc.pages.length,
        photoCount: doc.photos.length,
        publishedAt: null,
        versionNumber: null,
      });
    }
    await saveStudioPass(await hashPasscode(passcode));
    startAdminSession();
    return LOCAL_USER;
  },

  async changePasscode(newPass: string) {
    const trimmed = newPass.trim();
    if (trimmed.length < 4) throw new Error('Choose a passcode with at least 4 characters.');
    await saveStudioPass(await hashPasscode(trimmed));
  },

  async signOut() {
    endAdminSession();
  },

  onAuthChange() {
    return () => undefined;
  },

  /* ----------------------------------------------------------- library */

  async listBooks() {
    await ensureLibrary();
    return loadBooks();
  },

  async createBook(title: string) {
    await ensureLibrary();
    const books = await loadBooks();
    const name = title.trim() || 'A new scrapbook';
    const doc = createBookDoc(name);
    const id = uid('book-');
    await saveStoredDoc(id, doc);
    const book: BookSummary = {
      id,
      slug: uniqueSlug(name, books.map((entry) => entry.slug)),
      title: doc.meta.title,
      recipient: '',
      updatedAt: doc.updatedAt,
      pageCount: doc.pages.length,
      photoCount: doc.photos.length,
      publishedAt: null,
      versionNumber: null,
    };
    await saveBook(book);
    return book;
  },

  async duplicateBook(bookId: string) {
    await ensureLibrary();
    const books = await loadBooks();
    const source = books.find((entry) => entry.id === bookId);
    if (!source) throw new Error('That scrapbook could not be found.');
    const sourceDoc = await loadStoredDoc(bookId);
    if (!sourceDoc) throw new Error('That scrapbook has no draft to copy yet.');

    const title = `${source.title} copy`;
    const doc = await cloneDoc(sourceDoc, title);
    const id = uid('book-');
    await saveStoredDoc(id, doc);
    const book: BookSummary = {
      id,
      slug: uniqueSlug(title, books.map((entry) => entry.slug)),
      title: doc.meta.title,
      recipient: doc.meta.recipient,
      updatedAt: doc.updatedAt,
      pageCount: doc.pages.length,
      photoCount: doc.photos.length,
      publishedAt: null,
      versionNumber: null,
    };
    await saveBook(book);
    return book;
  },

  async updateBook(bookId: string, patch: BookPatch) {
    const book = await findBook(bookId);
    if (!book) throw new Error('That scrapbook could not be found.');

    const next: BookSummary = { ...book };
    if (patch.slug != null && patch.slug !== book.slug) {
      const slug = slugify(patch.slug);
      if (slug !== patch.slug.trim()) {
        throw new Error('Use lowercase letters, numbers and dashes for the link.');
      }
      const taken = (await loadBooks()).some(
        (entry) => entry.id !== bookId && entry.slug === slug,
      );
      if (taken) throw new Error('That link is already used by another scrapbook.');
      next.slug = slug;
    }
    if (patch.title != null) next.title = patch.title.trim() || book.title;
    if (patch.recipient != null) next.recipient = patch.recipient;

    if (patch.title != null || patch.recipient != null) {
      const doc = await loadStoredDoc(bookId);
      if (doc) {
        const updated: ScrapbookDoc = {
          ...doc,
          meta: {
            ...doc.meta,
            title: patch.title != null ? next.title : doc.meta.title,
            recipient: patch.recipient != null ? patch.recipient : doc.meta.recipient,
          },
          updatedAt: Date.now(),
        };
        await saveStoredDoc(bookId, updated);
        next.updatedAt = updated.updatedAt;
      }
    }

    await writeBook(next);
    return next;
  },

  async deleteBook(bookId: string) {
    const book = await findBook(bookId);
    if (!book) return;
    const doc = await loadStoredDoc(bookId);
    const versions = await loadVersions(bookId);
    await deleteBookMedia(doc, versions.map((version) => version.id));
    for (const version of versions) await removeVersion(version.id);
    await savePublication(bookId, null);
    await deleteStoredDoc(bookId);
    await deleteBookRecord(bookId);
  },

  /* ------------------------------------------------------------- drafts */

  async loadDraft(bookId: string) {
    await ensureLibrary();
    return loadStoredDoc(bookId);
  },

  async saveDraft(bookId: string, doc: ScrapbookDoc, options: SaveOptions = {}) {
    const stored = await loadStoredDoc(bookId);
    if (
      stored &&
      !options.force &&
      options.expectedUpdatedAt != null &&
      stored.updatedAt !== options.expectedUpdatedAt
    ) {
      throw conflictError(
        'Another tab or window saved a newer draft. Reload it or keep your version.',
      );
    }
    await saveStoredDoc(bookId, doc);
    await syncBookFromDoc(bookId, doc);
    return { updatedAt: doc.updatedAt };
  },

  /* ---------------------------------------------------------- publishing */

  async loadPublished(bookId: string) {
    const publication = await loadPublication(bookId);
    if (!publication) return null;
    const versions = await loadVersions(bookId);
    const version = versions.find((entry) => entry.id === publication.versionId);
    if (!version) return null;
    return {
      doc: version.doc,
      publishedAt: version.publishedAt,
      versionId: version.id,
      versionNumber: version.versionNumber,
      label: version.label,
    } satisfies PublishedSnapshot;
  },

  async findPublishedBySlug(slug: string, _passcode?: string) {
    await ensureLibrary();
    const book = (await loadBooks()).find((entry) => entry.slug === slug);
    if (!book) return null;
    return localBackend.loadPublished(book.id);
  },

  async listPublishedBooks() {
    await ensureLibrary();
    const books = await loadBooks();
    const published: PublishedBookSummary[] = [];
    for (const book of books) {
      const snapshot = await localBackend.loadPublished(book.id);
      if (!snapshot) continue;
      published.push({
        id: book.id,
        slug: book.slug,
        title: snapshot.doc.meta.title || book.title,
        subtitle: snapshot.doc.meta.subtitle,
        recipient: snapshot.doc.meta.recipient,
        sender: snapshot.doc.meta.sender,
        publishedAt: snapshot.publishedAt,
        versionNumber: snapshot.versionNumber,
        pageCount: snapshot.doc.pages.length,
        locked: false,
      });
    }
    return published.sort((a, b) => b.publishedAt - a.publishedAt);
  },

  async listVersions(bookId: string) {
    return (await loadVersions(bookId)).map(summary);
  },

  async publish(
    bookId: string,
    doc: ScrapbookDoc,
    label: string,
    onProgress: (progress: PublishProgress) => void = () => undefined,
  ) {
    const versionId = uid('ver-');
    const snapshot = withoutSecrets(doc);
    const all = await loadVersions(bookId);
    const versionNumber = (all[0]?.versionNumber ?? 0) + 1;

    const media = [
      ...snapshot.photos
        .filter((photo) => photo.blobId)
        .map((photo) => ({ key: photo.id, blobId: photo.blobId! })),
      ...snapshot.customAssets
        .filter((asset) => asset.blobId)
        .map((asset) => ({ key: `asset-${asset.id}`, blobId: asset.blobId! })),
    ];

    const total = media.length;
    let done = 0;
    for (const item of media) {
      const frozenKey = `pub/${versionId}/${item.key}`;
      const copied = await copyBlob(item.blobId, frozenKey);
      if (!copied) {
        throw new Error('A photograph could not be copied into the published version.');
      }
      if (item.key.startsWith('asset-')) {
        const assetId = item.key.slice('asset-'.length);
        const asset = snapshot.customAssets.find((entry) => entry.id === assetId);
        if (asset) asset.blobId = frozenKey;
      } else {
        const photo = snapshot.photos.find((entry) => entry.id === item.key);
        if (photo) photo.blobId = frozenKey;
      }
      done += 1;
      onProgress({ done, total, label: item.key });
    }

    const publishedAt = Date.now();
    const storedVersion: StoredVersion = {
      id: versionId,
      bookId,
      versionNumber,
      label: label.trim() || `Version ${versionNumber}`,
      publishedAt,
      pageCount: snapshot.pages.length,
      photoCount: snapshot.photos.length,
      letterCount: snapshot.letters.length,
      doc: snapshot,
    };

    await saveVersion(storedVersion);
    await savePublication(bookId, {
      versionId,
      versionNumber,
      publishedAt,
      label: storedVersion.label,
    });

    const book = await findBook(bookId);
    if (book) {
      await writeBook({ ...book, publishedAt, versionNumber });
    }

    publishChannel?.postMessage({ type: 'published', bookId, versionNumber });

    const pruned = [...all, storedVersion]
      .sort((a, b) => b.versionNumber - a.versionNumber)
      .slice(0, MAX_VERSIONS);
    for (const old of (await loadVersions(bookId)).filter(
      (entry) => !pruned.some((keep) => keep.id === entry.id),
    )) {
      await removeVersion(old.id);
      await deleteBlobsWithPrefix(`pub/${old.id}/`);
    }

    return summary(storedVersion);
  },

  async restoreVersion(bookId: string, versionId: string) {
    const version = (await loadVersions(bookId)).find((entry) => entry.id === versionId);
    if (!version) throw new Error('That published version could not be found.');
    return version.doc;
  },

  async getPublication(bookId: string): Promise<PublishedState | null> {
    return loadPublication(bookId);
  },

  /* ------------------------------------------------------------ profile */

  async loadProfile() {
    return loadProfile();
  },

  async saveProfile(profile: MakerProfile) {
    await saveProfile(profile);
  },

  async loadPublicProfile() {
    return loadProfile();
  },

  /* -------------------------------------------------------------- media */

  async resolveMedia(doc) {
    const blobs = await loadAllBlobs();
    const urls: Record<string, string> = {};
    for (const photo of doc.photos) {
      if (photo.blobId) {
        const blob = blobs.get(photo.blobId);
        if (blob) urls[photo.id] = URL.createObjectURL(blob);
      }
    }
    for (const asset of doc.customAssets) {
      if (asset.blobId) {
        const blob = blobs.get(asset.blobId);
        if (blob) urls[asset.id] = URL.createObjectURL(blob);
      }
    }
    return urls;
  },

  async uploadPhoto(input: MediaUploadInput): Promise<MediaUploadResult> {
    await putBlob(input.id, input.blob);
    return { blobId: input.id, url: URL.createObjectURL(input.blob) };
  },

  async replacePhotoFile(input) {
    await putBlob(input.id, input.blob);
    return { blobId: input.id, url: URL.createObjectURL(input.blob) };
  },

  async deletePhoto(photo) {
    if (photo.blobId && !photo.blobId.startsWith('pub/')) {
      await deleteBlob(photo.blobId);
    }
  },

  async uploadAsset(input) {
    await putBlob(input.id, input.blob);
    return { blobId: input.id, url: URL.createObjectURL(input.blob) };
  },

  async deleteAsset(asset) {
    if (asset.blobId && !asset.blobId.startsWith('pub/')) {
      await deleteBlob(asset.blobId);
    }
  },
};

const publishChannel =
  typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('kabbu-publish') : null;
