import type { PublishedState, ScrapbookDoc, StoredVersion } from '../types';

const DB_NAME = 'kabbu-scrapbook';
const DB_VERSION = 2;
const DOC_KEY = 'scrapbook';
const PUBLICATION_KEY = 'publication';
const FALLBACK_DOC_KEY = 'kabbu-scrapbook-doc';

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

export async function loadStoredDoc(): Promise<ScrapbookDoc | null> {
  try {
    const db = await openDb();
    const tx = db.transaction('docs', 'readonly');
    const result = await requestToPromise(tx.objectStore('docs').get(DOC_KEY));
    return (result as ScrapbookDoc | undefined) ?? null;
  } catch {
    const raw = localStorage.getItem(FALLBACK_DOC_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as ScrapbookDoc;
    } catch {
      return null;
    }
  }
}

export async function saveStoredDoc(doc: ScrapbookDoc): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction('docs', 'readwrite');
    await requestToPromise(tx.objectStore('docs').put(doc, DOC_KEY));
  } catch {
    try {
      localStorage.setItem(FALLBACK_DOC_KEY, JSON.stringify(doc));
    } catch {
      throw new Error('Could not save — local storage is full or unavailable.');
    }
  }
}

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

export async function loadVersions(): Promise<StoredVersion[]> {
  try {
    const db = await openDb();
    const tx = db.transaction('versions', 'readonly');
    const values = await requestToPromise(tx.objectStore('versions').getAll());
    return (values as StoredVersion[]).sort((a, b) => b.versionNumber - a.versionNumber);
  } catch {
    return [];
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

export async function loadPublication(): Promise<PublishedState | null> {
  try {
    const db = await openDb();
    const tx = db.transaction('meta', 'readonly');
    return ((await requestToPromise(tx.objectStore('meta').get(PUBLICATION_KEY))) ??
      null) as PublishedState | null;
  } catch {
    return null;
  }
}

export async function savePublication(state: PublishedState | null): Promise<void> {
  const db = await openDb();
  const tx = db.transaction('meta', 'readwrite');
  const store = tx.objectStore('meta');
  if (state) await requestToPromise(store.put(state, PUBLICATION_KEY));
  else await requestToPromise(store.delete(PUBLICATION_KEY));
}

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
