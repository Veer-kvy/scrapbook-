import type {
  BookSummary,
  MakerProfile,
  PublishedState,
  ScrapbookDoc,
  StoredVersion,
} from '../types';

const DB_NAME = 'kabbu-scrapbook';
const DB_VERSION = 3;
const LEGACY_DOC_KEY = 'scrapbook';
const LEGACY_PUBLICATION_KEY = 'publication';
const PROFILE_KEY = 'profile';
const FALLBACK_PREFIX = 'kabbu-scrapbook-doc:';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available in this browser.'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('docs')) db.createObjectStore('docs');
      if (!db.objectStoreNames.contains('blobs')) db.createObjectStore('blobs');
      if (!db.objectStoreNames.contains('versions')) db.createObjectStore('versions');
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta');
      if (!db.objectStoreNames.contains('books')) db.createObjectStore('books', { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open local storage.'));
  });
  return dbPromise;
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Local storage request failed.'));
  });
}

/* ------------------------------------------------------------------ drafts */

export async function loadStoredDoc(bookId: string): Promise<ScrapbookDoc | null> {
  try {
    const db = await openDb();
    const tx = db.transaction('docs', 'readonly');
    const result = await requestToPromise(tx.objectStore('docs').get(bookId));
    return (result as ScrapbookDoc | undefined) ?? null;
  } catch {
    const raw = localStorage.getItem(`${FALLBACK_PREFIX}${bookId}`);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as ScrapbookDoc;
    } catch {
      return null;
    }
  }
}

export async function saveStoredDoc(bookId: string, doc: ScrapbookDoc): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction('docs', 'readwrite');
    await requestToPromise(tx.objectStore('docs').put(doc, bookId));
  } catch {
    try {
      localStorage.setItem(`${FALLBACK_PREFIX}${bookId}`, JSON.stringify(doc));
    } catch {
      throw new Error('Could not save — local storage is full or unavailable.');
    }
  }
}

export async function deleteStoredDoc(bookId: string): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction('docs', 'readwrite');
    await requestToPromise(tx.objectStore('docs').delete(bookId));
  } catch {
    localStorage.removeItem(`${FALLBACK_PREFIX}${bookId}`);
  }
}

/** Draft saved by the single-book version of the app, before the library existed. */
export async function loadLegacyDoc(): Promise<ScrapbookDoc | null> {
  try {
    const db = await openDb();
    const tx = db.transaction('docs', 'readonly');
    const result = await requestToPromise(tx.objectStore('docs').get(LEGACY_DOC_KEY));
    return (result as ScrapbookDoc | undefined) ?? null;
  } catch {
    return null;
  }
}

export async function deleteLegacyDoc(): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction('docs', 'readwrite');
    await requestToPromise(tx.objectStore('docs').delete(LEGACY_DOC_KEY));
  } catch {
    /* no-op */
  }
}

/* ------------------------------------------------------------------- books */

export async function loadBooks(): Promise<BookSummary[]> {
  try {
    const db = await openDb();
    const tx = db.transaction('books', 'readonly');
    const values = await requestToPromise(tx.objectStore('books').getAll());
    return (values as BookSummary[]).sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

export async function saveBook(book: BookSummary): Promise<void> {
  const db = await openDb();
  const tx = db.transaction('books', 'readwrite');
  await requestToPromise(tx.objectStore('books').put(book));
}

export async function deleteBookRecord(bookId: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction('books', 'readwrite');
  await requestToPromise(tx.objectStore('books').delete(bookId));
}

/* -------------------------------------------------------------- media blobs */

export async function loadAllBlobs(): Promise<Map<string, Blob>> {
  const map = new Map<string, Blob>();
  try {
    const db = await openDb();
    const tx = db.transaction('blobs', 'readonly');
    const store = tx.objectStore('blobs');
    const keys = await requestToPromise(store.getAllKeys());
    const values = await requestToPromise(store.getAll());
    keys.forEach((key, i) => {
      if (typeof key === 'string' && values[i] instanceof Blob) {
        map.set(key, values[i] as Blob);
      }
    });
  } catch {
    /* images stay unresolved; placeholders are shown */
  }
  return map;
}

export async function putBlob(key: string, blob: Blob): Promise<void> {
  const db = await openDb();
  const tx = db.transaction('blobs', 'readwrite');
  await requestToPromise(tx.objectStore('blobs').put(blob, key));
}

export async function deleteBlob(key: string): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction('blobs', 'readwrite');
    await requestToPromise(tx.objectStore('blobs').delete(key));
  } catch {
    /* no-op */
  }
}

export async function deleteBlobsWithPrefix(prefix: string): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction('blobs', 'readwrite');
    const store = tx.objectStore('blobs');
    const keys = await requestToPromise(store.getAllKeys());
    for (const key of keys) {
      if (typeof key === 'string' && key.startsWith(prefix)) {
        await requestToPromise(store.delete(key));
      }
    }
  } catch {
    /* no-op */
  }
}

export async function clearBlobs(): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction('blobs', 'readwrite');
    await requestToPromise(tx.objectStore('blobs').clear());
  } catch {
    /* no-op */
  }
}

/* ---------------------------------------------------------------- versions */

export async function loadVersions(bookId: string): Promise<StoredVersion[]> {
  try {
    const db = await openDb();
    const tx = db.transaction('versions', 'readonly');
    const values = await requestToPromise(tx.objectStore('versions').getAll());
    return (values as StoredVersion[])
      .filter((entry) => (entry as StoredVersion & { bookId?: string }).bookId === bookId)
      .sort((a, b) => b.versionNumber - a.versionNumber);
  } catch {
    return [];
  }
}

/** Versions written before the library existed carry no bookId. */
export async function loadLegacyVersions(): Promise<StoredVersion[]> {
  try {
    const db = await openDb();
    const tx = db.transaction('versions', 'readonly');
    const values = await requestToPromise(tx.objectStore('versions').getAll());
    return (values as StoredVersion[]).filter(
      (entry) => !(entry as StoredVersion & { bookId?: string }).bookId,
    );
  } catch {
    return [];
  }
}

export async function addBookIdToVersions(bookId: string): Promise<void> {
  try {
    const legacy = await loadLegacyVersions();
    if (!legacy.length) return;
    const db = await openDb();
    const tx = db.transaction('versions', 'readwrite');
    const store = tx.objectStore('versions');
    for (const version of legacy) {
      await requestToPromise(store.put({ ...version, bookId }));
    }
  } catch {
    /* no-op */
  }
}

export async function saveVersion(version: StoredVersion): Promise<void> {
  const db = await openDb();
  const tx = db.transaction('versions', 'readwrite');
  await requestToPromise(tx.objectStore('versions').put(version, version.id));
}

export async function deleteVersion(id: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction('versions', 'readwrite');
  await requestToPromise(tx.objectStore('versions').delete(id));
}

/* ----------------------------------------------------------- publications */

function publicationKey(bookId: string) {
  return `pub:${bookId}`;
}

export async function loadPublication(bookId: string): Promise<PublishedState | null> {
  try {
    const db = await openDb();
    const tx = db.transaction('meta', 'readonly');
    return ((await requestToPromise(tx.objectStore('meta').get(publicationKey(bookId)))) ??
      null) as PublishedState | null;
  } catch {
    return null;
  }
}

export async function savePublication(
  bookId: string,
  state: PublishedState | null,
): Promise<void> {
  const db = await openDb();
  const tx = db.transaction('meta', 'readwrite');
  const store = tx.objectStore('meta');
  if (state) await requestToPromise(store.put(state, publicationKey(bookId)));
  else await requestToPromise(store.delete(publicationKey(bookId)));
}

export async function loadLegacyPublication(): Promise<PublishedState | null> {
  try {
    const db = await openDb();
    const tx = db.transaction('meta', 'readonly');
    return ((await requestToPromise(
      tx.objectStore('meta').get(LEGACY_PUBLICATION_KEY),
    )) ?? null) as PublishedState | null;
  } catch {
    return null;
  }
}

export async function deleteLegacyPublication(): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction('meta', 'readwrite');
    await requestToPromise(tx.objectStore('meta').delete(LEGACY_PUBLICATION_KEY));
  } catch {
    /* no-op */
  }
}

/* ---------------------------------------------------------------- profile */

const STUDIO_PASS_KEY = 'studio-pass';

export async function loadStudioPass(): Promise<string | null> {
  try {
    const db = await openDb();
    const tx = db.transaction('meta', 'readonly');
    const value = await requestToPromise(tx.objectStore('meta').get(STUDIO_PASS_KEY));
    return typeof value === 'string' && value ? value : null;
  } catch {
    return null;
  }
}

export async function saveStudioPass(hash: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction('meta', 'readwrite');
  await requestToPromise(tx.objectStore('meta').put(hash, STUDIO_PASS_KEY));
}

export async function loadProfile(): Promise<MakerProfile | null> {
  try {
    const db = await openDb();
    const tx = db.transaction('meta', 'readonly');
    return ((await requestToPromise(tx.objectStore('meta').get(PROFILE_KEY))) ??
      null) as MakerProfile | null;
  } catch {
    return null;
  }
}

export async function saveProfile(profile: MakerProfile): Promise<void> {
  const db = await openDb();
  const tx = db.transaction('meta', 'readwrite');
  await requestToPromise(tx.objectStore('meta').put(profile, PROFILE_KEY));
}

/* ------------------------------------------------------------------ blobs */

/** Copies a blob under a new key — used to freeze media inside published versions. */
export async function copyBlob(fromKey: string, toKey: string): Promise<Blob | null> {
  try {
    const db = await openDb();
    const read = db.transaction('blobs', 'readonly');
    const blob = (await requestToPromise(read.objectStore('blobs').get(fromKey))) as Blob | undefined;
    if (!blob) return null;
    const write = db.transaction('blobs', 'readwrite');
    await requestToPromise(write.objectStore('blobs').put(blob, toKey));
    return blob;
  } catch {
    return null;
  }
}
