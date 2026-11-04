import type {
  PublishedState,
  ScrapbookDoc,
  StoredVersion,
  VersionSummary,
} from '../types';
import {
  copyBlob,
  deleteBlob,
  deleteBlobsWithPrefix,
  loadAllBlobs,
  loadPublication,
  loadStoredDoc,
  loadVersions,
  savePublication,
  saveStoredDoc,
  saveVersion,
  putBlob,
  deleteVersion as removeVersion,
} from '../data/db';
import { hasAdminSession, startAdminSession, endAdminSession, hashPasscode } from '../lib/auth';
import { createSeedDoc } from '../data/seed';
import { uid } from '../lib/utils';
import {
  conflictError,
  type AuthUser,
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

/**
 * Local development backend. Drafts, published versions and media live in
 * IndexedDB on this device. The admin gate is a local passcode hash — real
 * authorization requires the Supabase backend (see README).
 */
export const localBackend: ContentBackend = {
  mode: 'local',
  label: 'On this device',
  storageNote: 'Drafts, versions and photographs are stored in this browser (IndexedDB).',

  async init() {
    /* nothing to set up */
  },

  async getUser() {
    return hasAdminSession() ? LOCAL_USER : null;
  },

  async signIn(input: SignInInput) {
    const doc = await loadStoredDoc();
    if (!doc?.meta.passHash) {
      throw new Error('Set up an admin passcode before signing in.');
    }
    if (!input.passcode) throw new Error('Enter your admin passcode.');
    const hash = await hashPasscode(input.passcode);
    if (hash !== doc.meta.passHash) throw new Error('That passcode is not correct.');
    startAdminSession();
    return LOCAL_USER;
  },

  async requiresSetup() {
    const doc = await loadStoredDoc();
    return !doc?.meta.passHash;
  },

  async setup(input: SignInInput) {
    const passcode = input.passcode?.trim() ?? '';
    if (passcode.length < 4) {
      throw new Error('Choose a passcode with at least 4 characters.');
    }
    const doc = (await loadStoredDoc()) ?? createSeedDoc();
    const hash = await hashPasscode(passcode);
    await saveStoredDoc({
      ...doc,
      meta: { ...doc.meta, passHash: hash, passHint: '' },
      updatedAt: Date.now(),
    });
    startAdminSession();
    return LOCAL_USER;
  },

  async signOut() {
    endAdminSession();
  },

  onAuthChange() {
    return () => undefined;
  },

  async loadDraft() {
    return loadStoredDoc();
  },

  async saveDraft(doc: ScrapbookDoc, options: SaveOptions = {}) {
    const stored = await loadStoredDoc();
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
    await saveStoredDoc(doc);
    return { updatedAt: doc.updatedAt };
  },

  async loadPublished() {
    const publication = await loadPublication();
    if (!publication) return null;
    const versions = await loadVersions();
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

  async listVersions() {
    return (await loadVersions()).map(summary);
  },

  async publish(doc, label, onProgress: (progress: PublishProgress) => void = () => undefined) {
    const versionId = uid('ver-');
    const snapshot = withoutSecrets(doc);
    const all = await loadVersions();
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
      versionNumber,
      label: label.trim() || `Version ${versionNumber}`,
      publishedAt,
      pageCount: snapshot.pages.length,
      photoCount: snapshot.photos.length,
      letterCount: snapshot.letters.length,
      doc: snapshot,
    };

    await saveVersion(storedVersion);
    await savePublication({
      versionId,
      versionNumber,
      publishedAt,
      label: storedVersion.label,
    });
    publishChannel?.postMessage({ type: 'published', versionNumber });

    const pruned = [...all, storedVersion]
      .sort((a, b) => b.versionNumber - a.versionNumber)
      .slice(0, MAX_VERSIONS);
    for (const old of (await loadVersions()).filter(
      (entry) => !pruned.some((keep) => keep.id === entry.id),
    )) {
      await removeVersion(old.id);
      await deleteBlobsWithPrefix(`pub/${old.id}/`);
    }

    return summary(storedVersion);
  },

  async restoreVersion(versionId) {
    const version = (await loadVersions()).find((entry) => entry.id === versionId);
    if (!version) throw new Error('That published version could not be found.');
    return version.doc;
  },

  async getPublication(): Promise<PublishedState | null> {
    return loadPublication();
  },

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
