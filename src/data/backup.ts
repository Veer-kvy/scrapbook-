import type { ScrapbookDoc } from '../types';
import { loadAllBlobs } from './db';
import { blobToDataUrl, dataUrlToBlob } from '../lib/image';

const BACKUP_APP = 'kabbu-scrapbook';

interface BackupPayload {
  app: typeof BACKUP_APP;
  version: 1;
  exportedAt: string;
  doc: ScrapbookDoc;
  images: Record<string, string>;
}

export async function buildBackup(doc: ScrapbookDoc): Promise<Blob> {
  const blobs = await loadAllBlobs();
  const images: Record<string, string> = {};
  const ids = new Set(
    doc.photos.map((photo) => photo.blobId).filter((id): id is string => Boolean(id)),
  );
  for (const id of ids) {
    const blob = blobs.get(id);
    if (blob) images[id] = await blobToDataUrl(blob);
  }
  const payload: BackupPayload = {
    app: BACKUP_APP,
    version: 1,
    exportedAt: new Date().toISOString(),
    doc,
    images,
  };
  return new Blob([JSON.stringify(payload)], { type: 'application/json' });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function parseBackup(file: File): Promise<{
  doc: ScrapbookDoc;
  blobs: Map<string, Blob>;
}> {
  let payload: BackupPayload;
  try {
    payload = JSON.parse(await file.text()) as BackupPayload;
  } catch {
    throw new Error('That file is not a readable KABBU backup.');
  }
  if (payload.app !== BACKUP_APP || !payload.doc || !Array.isArray(payload.doc.pages)) {
    throw new Error('That file is not a KABBU scrapbook backup.');
  }
  if (!payload.doc.meta || !payload.doc.settings) {
    throw new Error('This backup is missing scrapbook details.');
  }
  const blobs = new Map<string, Blob>();
  for (const [id, dataUrl] of Object.entries(payload.images ?? {})) {
    try {
      blobs.set(id, dataUrlToBlob(dataUrl));
    } catch {
      /* skip unreadable image */
    }
  }
  return { doc: payload.doc, blobs };
}

export function validateBackupName(file: File): string | null {
  if (!file.name.endsWith('.json') && file.type !== 'application/json') {
    return 'Choose a .json backup file.';
  }
  if (file.size > 200 * 1024 * 1024) return 'That backup is too large.';
  return null;
}
