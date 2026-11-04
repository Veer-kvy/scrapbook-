import { create } from 'zustand';
import type {
  CustomAsset,
  Letter,
  Page,
  PhotoMeta,
  PublishedState,
  ScrapbookDoc,
  ScrapbookElement,
  ScrapbookMeta,
  ScrapbookSettings,
  StickerId,
  TemplateId,
  ThemeSettings,
  VersionSummary,
} from '../types';
import { createSeedDoc } from './seed';
import {
  buildTemplatePage,
  makeButton,
  makeCustomAsset,
  makeEnvelope,
  makeHidden,
  makeLetter,
  makePhoto,
  makeSticker,
  makeText,
} from './factories';
import { normalizeTheme, applyTheme } from './theme';
import {
  clearBlobs,
  loadStoredDoc,
  putBlob,
  saveStoredDoc,
} from './db';
import { backend } from '../backend';
import type { AuthUser, PublishedSnapshot, SignInInput } from '../backend/types';
import { hashPasscode } from '../lib/auth';
import { makeThumbnail, measureImage, prepareImage } from '../lib/image';
import { uid } from '../lib/utils';
import { audio } from '../lib/audio';

export type Scene = 'welcome' | 'cover' | 'book';
export type SaveState = 'saving' | 'saved' | 'error' | 'conflict';
export type AppScope = 'public' | 'admin';

export interface Toast {
  id: number;
  message: string;
  tone: 'info' | 'success' | 'error';
}

export interface NoteOverlay {
  title: string;
  body: string;
}

export interface StoreState {
  booted: boolean;
  bootError: string | null;
  scope: AppScope;
  user: AuthUser | null;
  authBusy: boolean;
  authError: string | null;
  needsSetup: boolean;
  backendMode: 'local' | 'supabase';
  backendNote: string;

  doc: ScrapbookDoc | null;
  mediaUrls: Record<string, string>;
  published: PublishedSnapshot | null;
  publication: PublishedState | null;
  versions: VersionSummary[];
  versionsLoading: boolean;
  publishing: boolean;
  publishProgress: { done: number; total: number; label: string } | null;

  scene: Scene;
  editor: boolean;
  preview: boolean;
  pageIndex: number;
  selectedId: string | null;
  note: NoteOverlay | null;

  saveState: SaveState;
  saveError: string | null;
  dirty: boolean;
  lastSavedAt: number | null;
  past: ScrapbookDoc[];
  future: ScrapbookDoc[];
  gestureSnap: ScrapbookDoc | null;
  gestureDirty: boolean;
  toast: Toast | null;

  boot: (scope: AppScope) => Promise<void>;
  setScene: (scene: Scene) => void;
  goToPage: (index: number) => void;
  select: (id: string | null) => void;
  setPreview: (preview: boolean) => void;
  signIn: (input: SignInInput) => Promise<boolean>;
  setupPasscode: (passcode: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  saveNow: (force?: boolean) => Promise<void>;
  retrySave: () => Promise<void>;
  reloadDraft: () => Promise<void>;
  notify: (message: string, tone?: Toast['tone']) => void;
  clearToast: () => void;
  showNote: (note: NoteOverlay) => void;
  hideNote: () => void;

  loadVersions: () => Promise<void>;
  publishNow: (label: string) => Promise<VersionSummary | null>;
  restoreVersion: (versionId: string) => Promise<void>;

  beginGesture: () => void;
  endGesture: () => void;
  undo: () => void;
  redo: () => void;

  updatePage: (pageId: string, updater: (page: Page) => Page) => void;
  updatePageMeta: (
    pageId: string,
    patch: Partial<Pick<Page, 'name' | 'bg' | 'template' | 'transition'>>,
  ) => void;
  addPage: (template: TemplateId, atIndex?: number) => Page | null;
  duplicatePage: (pageId: string) => void;
  deletePage: (pageId: string) => void;
  movePage: (pageId: string, direction: -1 | 1) => void;
  movePageTo: (pageId: string, index: number) => void;

  addElement: (pageId: string, element: ScrapbookElement) => void;
  updateElement: (
    pageId: string,
    elementId: string,
    patch: Partial<ScrapbookElement>,
  ) => void;
  removeElement: (pageId: string, elementId: string) => void;
  duplicateElement: (pageId: string, elementId: string) => void;
  moveLayer: (pageId: string, elementId: string, direction: -1 | 1) => void;
  alignElement: (pageId: string, elementId: string, align: 'left' | 'center' | 'right') => void;
  addText: (pageId: string) => void;
  addEnvelope: (pageId: string, letterId?: string) => void;
  addStickerToPage: (pageId: string, sticker: StickerId) => void;
  addHiddenNote: (pageId: string) => void;
  addButton: (pageId: string, targetPageId?: string) => void;
  addCustomAssetToPage: (pageId: string, assetId: string) => void;
  addCustomAssetFile: (file: File) => Promise<CustomAsset | null>;
  renameCustomAsset: (assetId: string, name: string) => void;
  deleteCustomAsset: (assetId: string) => void;

  addLetter: (partial?: Partial<Letter>) => Letter;
  updateLetter: (letterId: string, patch: Partial<Letter>) => void;
  deleteLetter: (letterId: string) => void;

  addPhotos: (
    files: File[],
    albumId: string | null,
    onProgress?: (done: number, total: number, current: string) => void,
  ) => Promise<{ added: number; errors: string[] }>;
  replacePhoto: (pageId: string, elementId: string, file: File) => Promise<boolean>;
  replacePhotoFile: (photoId: string, file: File) => Promise<boolean>;
  updatePhoto: (photoId: string, patch: Partial<PhotoMeta>) => void;
  deletePhoto: (photoId: string) => Promise<void>;
  addPhotoToPage: (photoId: string, pageId: string) => void;

  addAlbum: (name: string) => void;
  renameAlbum: (albumId: string, name: string) => void;
  deleteAlbum: (albumId: string) => void;

  updateMeta: (patch: Partial<ScrapbookMeta>) => void;
  changePasscode: (newPass: string) => Promise<void>;
  updateSettings: (patch: Partial<ScrapbookSettings>) => void;
  updateTheme: (patch: Partial<ThemeSettings>) => void;

  restoreBackup: (doc: ScrapbookDoc, blobs: Map<string, Blob>) => Promise<void>;
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;
let baseUpdatedAt: number | null = null;
let activeScope: AppScope = 'public';
let mediaUrls: Record<string, string> = {};
let publishListener: BroadcastChannel | null = null;

function revokeMedia() {
  Object.values(mediaUrls).forEach((url) => {
    if (url.startsWith('blob:')) URL.revokeObjectURL(url);
  });
  mediaUrls = {};
}

function normalizeDoc(input: ScrapbookDoc): ScrapbookDoc {
  return {
    ...input,
    version: 1,
    meta: { ...input.meta, passHash: input.meta.passHash ?? '', passHint: input.meta.passHint ?? '' },
    albums: input.albums ?? [],
    photos: (input.photos ?? []).map((photo) => ({
      ...photo,
      caption: photo.caption ?? '',
      date: photo.date ?? '',
    })),
    letters: input.letters ?? [],
    customAssets: input.customAssets ?? [],
    theme: normalizeTheme(input.theme),
    settings: input.settings ?? { volume: 0.6, music: false, sfx: true },
    pages: (input.pages ?? []).map((page) => ({
      ...page,
      transition: page.transition ?? 'turn',
      elements: page.elements ?? [],
    })),
  };
}

function queueSave(doc: ScrapbookDoc) {
  const state = useAppStore.getState();
  if (state.scope !== 'admin' || !state.user) return;
  useAppStore.setState({ saveState: 'saving', dirty: true, saveError: null });
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    void flushSave(doc);
  }, 550);
}

async function flushSave(doc: ScrapbookDoc, force = false) {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = undefined;
  }
  try {
    const result = await backend.saveDraft(doc, {
      expectedUpdatedAt: baseUpdatedAt,
      force,
    });
    baseUpdatedAt = result.updatedAt;
    useAppStore.setState({
      saveState: 'saved',
      saveError: null,
      dirty: false,
      lastSavedAt: result.updatedAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not save changes.';
    const conflict = (error as { code?: string }).code === 'conflict';
    useAppStore.setState({
      saveState: conflict ? 'conflict' : 'error',
      saveError: message,
      dirty: true,
    });
    useAppStore.getState().notify(message, 'error');
  }
}

function updateDocPage(doc: ScrapbookDoc, pageId: string, updater: (page: Page) => Page) {
  return {
    ...doc,
    pages: doc.pages.map((page) => (page.id === pageId ? updater(page) : page)),
  };
}

function commit(
  updater: (doc: ScrapbookDoc) => ScrapbookDoc,
  options: { history?: boolean } = {},
) {
  const state = useAppStore.getState();
  if (!state.doc) return;
  if (state.scope !== 'admin' || !state.user) return;
  const inGesture = Boolean(state.gestureSnap);
  const addHistory = (options.history ?? true) && !inGesture;
  const next = updater(state.doc);
  next.updatedAt = Date.now();
  useAppStore.setState({
    doc: next,
    ...(addHistory ? { past: [...state.past.slice(-49), state.doc], future: [] } : {}),
    ...(inGesture ? { gestureDirty: true } : {}),
  });
  if (!inGesture) queueSave(next);
}

function maxZ(page: Page): number {
  return page.elements.reduce((max, el) => Math.max(max, el.z), 0);
}

function cascadeSpot(
  page: Page | undefined,
  base: { x: number; y: number },
  maxX: number,
  maxY: number,
) {
  const step = (page?.elements.length ?? 0) % 6;
  return {
    x: Math.min(base.x + step * 4, maxX),
    y: Math.min(base.y + step * 3, maxY),
  };
}

async function loadAdminContent() {
  let draft = await backend.loadDraft();
  if (!draft) {
    draft = createSeedDoc();
    await backend.saveDraft(draft, { force: true });
  }
  const doc = normalizeDoc(draft);
  baseUpdatedAt = doc.updatedAt;
  const [urls, versions, publication] = await Promise.all([
    backend.resolveMedia(doc),
    backend.listVersions().catch(() => [] as VersionSummary[]),
    backend.getPublication().catch(() => null),
  ]);
  revokeMedia();
  mediaUrls = urls;
  applyTheme(doc.theme);
  audio.setPrefs(doc.settings);
  useAppStore.setState({
    doc,
    mediaUrls,
    versions,
    publication,
    saveState: 'saved',
    saveError: null,
    dirty: false,
    lastSavedAt: doc.updatedAt,
    editor: true,
    preview: false,
    selectedId: null,
    pageIndex: 0,
    past: [],
    future: [],
    gestureSnap: null,
  });
}

async function bootstrapLocalPublication() {
  if (backend.mode !== 'local') return;
  let draft = await backend.loadDraft();
  if (!draft) {
    draft = createSeedDoc();
    await backend.saveDraft(draft, { force: true });
  }
  const existing = await backend.loadPublished();
  if (!existing) {
    await backend.publish(draft, 'The original scrapbook');
  }
}

function listenForPublished() {
  if (publishListener || typeof BroadcastChannel === 'undefined') return;
  publishListener = new BroadcastChannel('kabbu-publish');
  publishListener.onmessage = () => {
    const state = useAppStore.getState();
    if (state.scope !== 'public') return;
    void backend.loadPublished().then(async (snapshot) => {
      if (!snapshot) return;
      const doc = normalizeDoc(snapshot.doc);
      const urls = await backend.resolveMedia(doc);
      revokeMedia();
      mediaUrls = urls;
      const latest = useAppStore.getState();
      applyTheme(doc.theme);
      audio.setPrefs(doc.settings);
      useAppStore.setState({
        doc,
        mediaUrls,
        published: snapshot,
        pageIndex: Math.min(latest.pageIndex, Math.max(0, doc.pages.length - 1)),
      });
    });
  };
}

export function validateForPublish(doc: ScrapbookDoc): string[] {
  const problems: string[] = [];
  if (doc.pages.length === 0) problems.push('Add at least one page before publishing.');
  const photoIds = new Set(doc.photos.map((photo) => photo.id));
  const assetIds = new Set(doc.customAssets.map((asset) => asset.id));
  const letterIds = new Set(doc.letters.map((letter) => letter.id));
  doc.pages.forEach((page, index) => {
    if (!page.name.trim()) problems.push(`Page ${index + 1} needs a name.`);
    page.elements.forEach((element) => {
      if (element.kind === 'photo' && !photoIds.has(element.photoId)) {
        problems.push(`Page ${index + 1} uses a photograph that is no longer in the library.`);
      }
      if (element.kind === 'custom' && !assetIds.has(element.assetId)) {
        problems.push(`Page ${index + 1} uses a decoration that was deleted.`);
      }
      if (
        element.kind === 'envelope' &&
        element.letterId &&
        !letterIds.has(element.letterId)
      ) {
        problems.push(`Page ${index + 1} links to a letter that was deleted.`);
      }
    });
  });
  return Array.from(new Set(problems));
}

const uploaders = {
  async photo(input: Parameters<typeof backend.uploadPhoto>[0]) {
    try {
      return await backend.uploadPhoto(input);
    } catch {
      return await backend.uploadPhoto(input);
    }
  },
};

export const useAppStore = create<StoreState>()((set, get) => ({
  booted: false,
  bootError: null,
  scope: 'public',
  user: null,
  authBusy: false,
  authError: null,
  needsSetup: false,
  backendMode: backend.mode,
  backendNote: backend.storageNote,

  doc: null,
  mediaUrls: {},
  published: null,
  publication: null,
  versions: [],
  versionsLoading: false,
  publishing: false,
  publishProgress: null,

  scene: 'welcome',
  editor: false,
  preview: false,
  pageIndex: 0,
  selectedId: null,
  note: null,

  saveState: 'saved',
  saveError: null,
  dirty: false,
  lastSavedAt: null,
  past: [],
  future: [],
  gestureSnap: null,
  gestureDirty: false,
  toast: null,

  boot: async (scope) => {
    if (get().booted && get().scope === scope) return;
    activeScope = scope;
    set({
      booted: false,
      bootError: null,
      scope,
      preview: false,
      selectedId: null,
      pageIndex: 0,
      scene: 'welcome',
      past: [],
      future: [],
      gestureSnap: null,
      note: null,
      authError: null,
    });
    try {
      await backend.init();
      if (scope === 'public') {
        let snapshot = await backend.loadPublished();
        if (!snapshot) {
          await bootstrapLocalPublication();
          snapshot = await backend.loadPublished();
        }
        if (!snapshot) {
          set({ booted: true, doc: null, published: null, editor: false, user: null });
          return;
        }
        const doc = normalizeDoc(snapshot.doc);
        const urls = await backend.resolveMedia(doc);
        revokeMedia();
        mediaUrls = urls;
        applyTheme(doc.theme);
        audio.setPrefs(doc.settings);
        set({
          booted: true,
          doc,
          mediaUrls,
          published: snapshot,
          publication: {
            versionId: snapshot.versionId,
            versionNumber: snapshot.versionNumber,
            publishedAt: snapshot.publishedAt,
            label: snapshot.label,
          },
          editor: false,
          user: null,
          saveState: 'saved',
          dirty: false,
          lastSavedAt: snapshot.publishedAt,
        });
        listenForPublished();
        return;
      }

      const user = await backend.getUser();
      if (!user) {
        const needsSetup = backend.requiresSetup ? await backend.requiresSetup() : false;
        set({ booted: true, user: null, editor: false, doc: null, needsSetup });
        return;
      }
      await loadAdminContent();
      set({ booted: true, user, editor: true, needsSetup: false });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'The scrapbook could not be loaded.';
      if (scope === 'public') {
        const fallback = normalizeDoc(createSeedDoc());
        applyTheme(fallback.theme);
        set({
          booted: true,
          bootError: `${message} Showing a read-only preview instead.`,
          doc: fallback,
          editor: false,
          user: null,
          mediaUrls: {},
        });
      } else {
        set({ booted: true, bootError: message, user: null, doc: null });
      }
    }
  },

  setScene: (scene) => set({ scene, selectedId: null }),
  goToPage: (index) =>
    set((state) => {
      const count = state.doc?.pages.length ?? 0;
      if (!count) return {};
      return {
        pageIndex: Math.max(0, Math.min(count - 1, index)),
        selectedId: null,
      };
    }),
  select: (id) => set({ selectedId: id }),
  setPreview: (preview) => set({ preview, selectedId: null }),

  signIn: async (input) => {
    set({ authBusy: true, authError: null });
    try {
      const user = await backend.signIn(input);
      await loadAdminContent();
      activeScope = 'admin';
      set({
        authBusy: false,
        authError: null,
        user,
        editor: true,
        booted: true,
        scope: 'admin',
        needsSetup: false,
      });
      audio.sfx('chime');
      return true;
    } catch (error) {
      set({
        authBusy: false,
        authError: error instanceof Error ? error.message : 'Sign-in failed.',
      });
      return false;
    }
  },

  setupPasscode: async (passcode) => {
    if (!backend.setup) {
      set({ authError: 'This backend does not use a local passcode.' });
      return false;
    }
    set({ authBusy: true, authError: null });
    try {
      const user = await backend.setup({ passcode });
      await loadAdminContent();
      activeScope = 'admin';
      set({
        authBusy: false,
        user,
        editor: true,
        booted: true,
        scope: 'admin',
        needsSetup: false,
      });
      return true;
    } catch (error) {
      set({
        authBusy: false,
        authError: error instanceof Error ? error.message : 'Could not create the passcode.',
      });
      return false;
    }
  },

  signOut: async () => {
    if (saveTimer) clearTimeout(saveTimer);
    await backend.signOut();
    revokeMedia();
    set({
      user: null,
      editor: false,
      doc: null,
      mediaUrls: {},
      published: null,
      publication: null,
      versions: [],
      past: [],
      future: [],
      dirty: false,
      saveState: 'saved',
      selectedId: null,
      preview: false,
      pageIndex: 0,
    });
  },

  saveNow: async (force = false) => {
    const doc = get().doc;
    if (!doc || get().scope !== 'admin' || !get().user) return;
    await flushSave(doc, force);
  },

  retrySave: async () => {
    await get().saveNow();
  },

  reloadDraft: async () => {
    await loadAdminContent();
    get().notify('Draft reloaded from the backend.', 'success');
  },

  notify: (message, tone = 'info') => {
    set({ toast: { id: Date.now() + Math.random(), message, tone } });
  },
  clearToast: () => set({ toast: null }),
  showNote: (note) => set({ note }),
  hideNote: () => set({ note: null }),

  loadVersions: async () => {
    set({ versionsLoading: true });
    try {
      const versions = await backend.listVersions();
      const publication = await backend.getPublication();
      set({ versions, publication, versionsLoading: false });
    } catch (error) {
      set({ versionsLoading: false });
      get().notify(
        error instanceof Error ? error.message : 'Could not load version history.',
        'error',
      );
    }
  },

  publishNow: async (label) => {
    const doc = get().doc;
    if (!doc) return null;
    if (get().scope !== 'admin' || !get().user) {
      get().notify('Sign in as an administrator to publish.', 'error');
      return null;
    }
    const problems = validateForPublish(doc);
    if (problems.length) {
      get().notify(problems[0], 'error');
      return null;
    }
    set({ publishing: true, publishProgress: { done: 0, total: 0, label: 'Preparing' } });
    try {
      await get().saveNow();
      if (get().saveState === 'error' || get().saveState === 'conflict') {
        throw new Error('Save the draft before publishing.');
      }
      const summary = await backend.publish(doc, label, (progress) => {
        set({ publishProgress: progress });
      });
      const versions = await backend.listVersions().catch(() => get().versions);
      set({
        publishing: false,
        publishProgress: null,
        versions,
        publication: {
          versionId: summary.id,
          versionNumber: summary.versionNumber,
          publishedAt: summary.publishedAt,
          label: summary.label,
        },
      });
      get().notify(`Version ${summary.versionNumber} is live.`, 'success');
      return summary;
    } catch (error) {
      set({ publishing: false, publishProgress: null });
      get().notify(
        error instanceof Error ? error.message : 'Publishing failed.',
        'error',
      );
      return null;
    }
  },

  restoreVersion: async (versionId) => {
    if (get().scope !== 'admin' || !get().user) return;
    try {
      const restored = normalizeDoc(await backend.restoreVersion(versionId));
      const urls = await backend.resolveMedia(restored);
      revokeMedia();
      mediaUrls = urls;
      applyTheme(restored.theme);
      const doc = { ...restored, updatedAt: Date.now() };
      set({
        doc,
        mediaUrls,
        past: [],
        future: [],
        selectedId: null,
        pageIndex: 0,
        saveState: 'saving',
        dirty: true,
      });
      await flushSave(doc);
      get().notify('Version restored into your draft. Publish when you are ready.', 'success');
    } catch (error) {
      get().notify(
        error instanceof Error ? error.message : 'That version could not be restored.',
        'error',
      );
    }
  },

  beginGesture: () => {
    const state = get();
    if (!state.doc || state.gestureSnap) return;
    set({ gestureSnap: structuredClone(state.doc), gestureDirty: false });
  },

  endGesture: () => {
    const state = get();
    if (!state.gestureSnap) return;
    const snap = state.gestureSnap;
    const dirty = state.gestureDirty;
    set({
      gestureSnap: null,
      gestureDirty: false,
      ...(dirty ? { past: [...state.past.slice(-49), snap], future: [] } : {}),
    });
    if (dirty && state.doc) {
      useAppStore.setState({ doc: { ...state.doc } });
      queueSave(state.doc);
    }
  },

  undo: () => {
    const state = get();
    if (!state.doc || state.past.length === 0) return;
    const previous = state.past[state.past.length - 1];
    set({
      doc: previous,
      past: state.past.slice(0, -1),
      future: [structuredClone(state.doc), ...state.future].slice(0, 50),
      selectedId: null,
      pageIndex: Math.min(state.pageIndex, previous.pages.length - 1),
    });
    queueSave(previous);
  },

  redo: () => {
    const state = get();
    if (!state.doc || state.future.length === 0) return;
    const next = state.future[0];
    set({
      doc: next,
      future: state.future.slice(1),
      past: [...state.past.slice(-49), structuredClone(state.doc)],
      selectedId: null,
      pageIndex: Math.min(state.pageIndex, next.pages.length - 1),
    });
    queueSave(next);
  },

  updatePage: (pageId, updater) => {
    commit((doc) => updateDocPage(doc, pageId, updater));
  },

  updatePageMeta: (pageId, patch) => {
    commit((doc) => updateDocPage(doc, pageId, (page) => ({ ...page, ...patch })));
  },

  addPage: (template, atIndex) => {
    const page = buildTemplatePage(template);
    commit((doc) => {
      const pages = [...doc.pages];
      const index = Math.max(0, Math.min(pages.length, atIndex ?? pages.length));
      pages.splice(index, 0, page);
      return { ...doc, pages };
    });
    const doc = get().doc;
    if (doc) {
      const index = doc.pages.findIndex((p) => p.id === page.id);
      set({ pageIndex: index < 0 ? 0 : index, selectedId: null });
    }
    get().notify(`“${page.name}” page added.`, 'success');
    return get().doc?.pages.find((p) => p.id === page.id) ?? page;
  },

  duplicatePage: (pageId) => {
    const state = get();
    if (!state.doc) return;
    const index = state.doc.pages.findIndex((p) => p.id === pageId);
    if (index < 0) return;
    const source = state.doc.pages[index];
    const copy: Page = {
      ...structuredClone(source),
      id: uid('page-'),
      name: `${source.name} copy`,
      elements: source.elements.map((el) => ({
        ...structuredClone(el),
        id: uid(el.kind.slice(0, 3) + '-'),
      })),
    };
    commit((doc) => {
      const pages = [...doc.pages];
      pages.splice(index + 1, 0, copy);
      return { ...doc, pages };
    });
    set({ pageIndex: index + 1, selectedId: null });
    get().notify('Page duplicated.', 'success');
  },

  deletePage: (pageId) => {
    const state = get();
    if (!state.doc || state.doc.pages.length <= 1) {
      state.notify('A scrapbook needs at least one page.', 'error');
      return;
    }
    const index = state.doc.pages.findIndex((p) => p.id === pageId);
    commit((doc) => ({ ...doc, pages: doc.pages.filter((p) => p.id !== pageId) }));
    set({
      pageIndex: Math.max(0, Math.min(index < 0 ? state.pageIndex : index, state.doc.pages.length - 2)),
      selectedId: null,
    });
    get().notify('Page deleted.', 'success');
  },

  movePage: (pageId, direction) => {
    const state = get();
    if (!state.doc) return;
    const index = state.doc.pages.findIndex((p) => p.id === pageId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= state.doc.pages.length) return;
    get().movePageTo(pageId, target);
  },

  movePageTo: (pageId, index) => {
    const state = get();
    if (!state.doc) return;
    const from = state.doc.pages.findIndex((p) => p.id === pageId);
    if (from < 0) return;
    const target = Math.max(0, Math.min(state.doc.pages.length - 1, index));
    if (from === target) return;
    commit((doc) => {
      const pages = [...doc.pages];
      const [moved] = pages.splice(from, 1);
      pages.splice(target, 0, moved);
      return { ...doc, pages };
    });
    set({ pageIndex: target, selectedId: null });
  },

  addElement: (pageId, element) => {
    commit((doc) =>
      updateDocPage(doc, pageId, (page) => ({
        ...page,
        elements: [
          ...page.elements,
          { ...element, z: Math.max(maxZ(page) + 1, element.z) },
        ],
      })),
    );
    set({ selectedId: element.id });
  },

  updateElement: (pageId, elementId, patch) => {
    commit((doc) =>
      updateDocPage(doc, pageId, (page) => ({
        ...page,
        elements: page.elements.map((el) =>
          el.id === elementId ? ({ ...el, ...patch } as ScrapbookElement) : el,
        ),
      })),
    );
  },

  removeElement: (pageId, elementId) => {
    commit((doc) =>
      updateDocPage(doc, pageId, (page) => ({
        ...page,
        elements: page.elements.filter((el) => el.id !== elementId),
      })),
    );
    if (get().selectedId === elementId) set({ selectedId: null });
    get().notify('Element removed.', 'success');
  },

  duplicateElement: (pageId, elementId) => {
    const state = get();
    const page = state.doc?.pages.find((p) => p.id === pageId);
    const element = page?.elements.find((el) => el.id === elementId);
    if (!page || !element) return;
    const copy: ScrapbookElement = {
      ...structuredClone(element),
      id: uid(element.kind.slice(0, 3) + '-'),
      x: Math.min(element.x + 4, 100 - element.w),
      y: Math.min(element.y + 4, 100 - element.h),
      rot: element.rot + 2,
      z: maxZ(page) + 1,
    };
    get().addElement(pageId, copy);
  },

  moveLayer: (pageId, elementId, direction) => {
    commit((doc) =>
      updateDocPage(doc, pageId, (page) => {
        const sorted = [...page.elements].sort((a, b) => a.z - b.z);
        const index = sorted.findIndex((el) => el.id === elementId);
        const target = index + direction;
        if (index < 0 || target < 0 || target >= sorted.length) return page;
        const elZ = sorted[index].z;
        const otherZ = sorted[target].z;
        return {
          ...page,
          elements: page.elements.map((el) => {
            if (el.id === sorted[index].id) return { ...el, z: otherZ };
            if (el.id === sorted[target].id) return { ...el, z: elZ };
            return el;
          }),
        };
      }),
    );
  },

  alignElement: (pageId, elementId, align) => {
    const page = get().doc?.pages.find((p) => p.id === pageId);
    const element = page?.elements.find((el) => el.id === elementId);
    if (!element) return;
    const x = align === 'left' ? 6 : align === 'center' ? (100 - element.w) / 2 : 94 - element.w;
    get().updateElement(pageId, elementId, { x });
  },

  addText: (pageId) => {
    const element = makeText('Write something lovely...', {
      x: 12,
      y: 42,
      w: 76,
      h: 12,
      font: 'hand',
      size: 5.2,
      color: '#493A40',
      align: 'center',
    });
    get().addElement(pageId, element);
  },

  addStickerToPage: (pageId, sticker) => {
    const page = get().doc?.pages.find((p) => p.id === pageId);
    const spot = cascadeSpot(page, { x: 42, y: 40 }, 84, 80);
    const element = makeSticker(sticker, { ...spot, w: 12 });
    get().addElement(pageId, element);
  },

  addEnvelope: (pageId, letterId) => {
    const letter = letterId ? get().doc?.letters.find((item) => item.id === letterId) : undefined;
    const element = makeEnvelope(
      letter?.title ?? 'a little letter',
      letter?.body ?? 'Write the thing you never say out loud. It belongs here.',
      letter?.envelope ?? 'rose',
      { x: 16, y: 34, w: 44, rot: -2 },
    );
    if (letterId) element.letterId = letterId;
    get().addElement(pageId, element);
  },

  addHiddenNote: (pageId) => {
    const element = makeHidden(
      'psst',
      'Write a little secret that appears when this is tapped.',
      'heart',
      { x: 44, y: 44, w: 10 },
    );
    get().addElement(pageId, element);
  },

  addButton: (pageId, targetPageId) => {
    const element = makeButton('turn the page', {
      x: 33,
      y: 78,
      w: 34,
      h: 7,
      tone: 'rose',
      style: 'pill',
    });
    element.interaction = targetPageId
      ? { type: 'go-to-page', targetPageId }
      : { type: 'show-note', message: 'Write what should happen when this button is tapped.' };
    get().addElement(pageId, element);
  },

  addCustomAssetToPage: (pageId, assetId) => {
    const page = get().doc?.pages.find((p) => p.id === pageId);
    const spot = cascadeSpot(page, { x: 30, y: 30 }, 80, 80);
    const element = makeCustomAsset(assetId, { ...spot, w: 18 });
    get().addElement(pageId, element);
  },

  addCustomAssetFile: async (file) => {
    const isSvg = file.type === 'image/svg+xml' || /\.svg$/i.test(file.name);
    const isPng = file.type === 'image/png' || /\.png$/i.test(file.name);
    if (!isSvg && !isPng) {
      get().notify('Choose a transparent PNG or an SVG file.', 'error');
      return null;
    }
    if (file.size > 4 * 1024 * 1024) {
      get().notify('Decorations must be smaller than 4 MB.', 'error');
      return null;
    }
    try {
      const id = uid('asset-');
      const dims = await measureImage(file);
      const result = await backend.uploadAsset({
        id,
        blob: file,
        width: dims.width,
        height: dims.height,
        name: file.name,
        mimeType: isSvg ? 'image/svg+xml' : 'image/png',
      });
      const asset: CustomAsset = {
        id,
        name: file.name.replace(/\.[^.]+$/, '') || 'Decoration',
        format: isSvg ? 'svg' : 'png',
        width: dims.width,
        height: dims.height,
        createdAt: Date.now(),
        ...(result.blobId ? { blobId: result.blobId } : {}),
        ...(result.storagePath ? { storagePath: result.storagePath } : {}),
      };
      set((state) => ({ mediaUrls: { ...state.mediaUrls, [id]: result.url } }));
      mediaUrls[id] = result.url;
      commit((doc) => ({ ...doc, customAssets: [...doc.customAssets, asset] }));
      get().notify('Decoration added to your library.', 'success');
      return asset;
    } catch (error) {
      get().notify(
        error instanceof Error ? error.message : 'That decoration could not be uploaded.',
        'error',
      );
      return null;
    }
  },

  renameCustomAsset: (assetId, name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    commit((doc) => ({
      ...doc,
      customAssets: doc.customAssets.map((asset) =>
        asset.id === assetId ? { ...asset, name: trimmed } : asset,
      ),
    }));
  },

  deleteCustomAsset: (assetId) => {
    const doc = get().doc;
    const asset = doc?.customAssets.find((item) => item.id === assetId);
    if (!doc || !asset) return;
    let used = 0;
    commit((current) => ({
      ...current,
      customAssets: current.customAssets.filter((item) => item.id !== assetId),
      pages: current.pages.map((page) => {
        const elements = page.elements.filter((element) => {
          const remove = element.kind === 'custom' && element.assetId === assetId;
          if (remove) used += 1;
          return !remove;
        });
        return elements.length === page.elements.length ? page : { ...page, elements };
      }),
    }));
    void backend.deleteAsset(asset).catch(() => undefined);
    const url = mediaUrls[assetId];
    if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
    delete mediaUrls[assetId];
    set({ mediaUrls: { ...mediaUrls } });
    get().notify(
      used
        ? `Decoration deleted and removed from ${used} element${used === 1 ? '' : 's'}.`
        : 'Decoration deleted.',
      'success',
    );
  },

  addLetter: (partial) => {
    const letter = makeLetter(partial);
    commit((doc) => ({ ...doc, letters: [letter, ...doc.letters] }));
    get().notify('New letter created.', 'success');
    return letter;
  },

  updateLetter: (letterId, patch) => {
    commit((doc) => ({
      ...doc,
      letters: doc.letters.map((letter) =>
        letter.id === letterId ? { ...letter, ...patch, updatedAt: Date.now() } : letter,
      ),
    }));
  },

  deleteLetter: (letterId) => {
    commit((doc) => ({
      ...doc,
      letters: doc.letters.filter((letter) => letter.id !== letterId),
      pages: doc.pages.map((page) => ({
        ...page,
        elements: page.elements.map((element) =>
          element.kind === 'envelope' && element.letterId === letterId
            ? { ...element, letterId: undefined }
            : element,
        ),
      })),
    }));
    get().notify('Letter deleted. Envelopes keep their short note.', 'success');
  },

  addPhotos: async (files, albumId, onProgress) => {
    const errors: string[] = [];
    const added: PhotoMeta[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      onProgress?.(i, files.length, file.name);
      try {
        const prepared = await prepareImage(file);
        const thumbnail = await makeThumbnail(prepared.blob).catch(() => undefined);
        const id = uid('photo-');
        const result = await uploaders.photo({
          id,
          blob: prepared.blob,
          thumbnail,
          width: prepared.width,
          height: prepared.height,
          name: file.name,
          mimeType: 'image/webp',
        });
        added.push({
          id,
          albumId,
          name: file.name.replace(/\.[^.]+$/, '') || 'Untitled',
          caption: '',
          date: new Date().toISOString().slice(0, 10),
          createdAt: Date.now(),
          width: prepared.width,
          height: prepared.height,
          mimeType: prepared.blob.type || 'image/webp',
          fileSize: prepared.blob.size,
          ...(result.blobId ? { blobId: result.blobId } : {}),
          ...(result.storagePath ? { storagePath: result.storagePath } : {}),
        });
        set((state) => ({ mediaUrls: { ...state.mediaUrls, [id]: result.url } }));
        mediaUrls[id] = result.url;
      } catch (err) {
        errors.push(err instanceof Error ? err.message : `${file.name} could not be processed.`);
      }
    }
    onProgress?.(files.length, files.length, '');
    if (added.length) {
      commit((doc) => ({ ...doc, photos: [...added, ...doc.photos] }));
      get().notify(
        `${added.length} photo${added.length === 1 ? '' : 's'} added to your library.`,
        'success',
      );
    }
    errors.forEach((message) => get().notify(message, 'error'));
    return { added: added.length, errors };
  },

  replacePhotoFile: async (photoId, file) => {
    const photo = get().doc?.photos.find((item) => item.id === photoId);
    if (!photo) return false;
    try {
      const prepared = await prepareImage(file);
      const thumbnail = await makeThumbnail(prepared.blob).catch(() => undefined);
      const result = await backend.replacePhotoFile({
        id: photo.id,
        blob: prepared.blob,
        thumbnail,
        width: prepared.width,
        height: prepared.height,
        name: photo.name,
        mimeType: 'image/webp',
        storagePath: photo.storagePath,
      });
      set((state) => ({ mediaUrls: { ...state.mediaUrls, [photo.id]: result.url } }));
      mediaUrls[photo.id] = result.url;
      get().updatePhoto(photo.id, {
        width: prepared.width,
        height: prepared.height,
        mimeType: prepared.blob.type || 'image/webp',
        fileSize: prepared.blob.size,
        ...(result.blobId ? { blobId: result.blobId } : {}),
        ...(result.storagePath ? { storagePath: result.storagePath } : {}),
      });
      get().notify('Photograph replaced. Every page keeps its layout.', 'success');
      return true;
    } catch (error) {
      get().notify(
        error instanceof Error ? error.message : 'Could not replace this photo.',
        'error',
      );
      return false;
    }
  },

  replacePhoto: async (pageId, elementId, file) => {
    const page = get().doc?.pages.find((item) => item.id === pageId);
    const element = page?.elements.find((item) => item.id === elementId);
    if (!element || element.kind !== 'photo') return false;
    if (get().doc?.photos.some((photo) => photo.id === element.photoId)) {
      return get().replacePhotoFile(element.photoId, file);
    }
    const result = await get().addPhotos([file], null);
    if (!result.added) return false;
    const newest = get().doc?.photos[0];
    if (!newest) return false;
    get().updateElement(pageId, elementId, { photoId: newest.id });
    return true;
  },

  updatePhoto: (photoId, patch) => {
    commit((doc) => ({
      ...doc,
      photos: doc.photos.map((photo) =>
        photo.id === photoId ? { ...photo, ...patch } : photo,
      ),
    }));
  },

  deletePhoto: async (photoId) => {
    const state = get();
    const photo = state.doc?.photos.find((p) => p.id === photoId);
    if (!photo) return;
    let used = 0;
    commit((doc) => ({
      ...doc,
      photos: doc.photos.filter((p) => p.id !== photoId),
      pages: doc.pages.map((page) => {
        const elements = page.elements.filter((element) => {
          const remove = element.kind === 'photo' && element.photoId === photoId;
          if (remove) used += 1;
          return !remove;
        });
        return elements.length === page.elements.length ? page : { ...page, elements };
      }),
    }));
    await backend.deletePhoto(photo).catch(() => undefined);
    const url = mediaUrls[photoId];
    if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
    delete mediaUrls[photoId];
    set({ mediaUrls: { ...mediaUrls } });
    get().notify(
      used
        ? `Photo deleted and removed from ${used} page spot${used === 1 ? '' : 's'}.`
        : 'Photo deleted from your library.',
      'success',
    );
  },

  addPhotoToPage: (photoId, pageId) => {
    const page = get().doc?.pages.find((p) => p.id === pageId);
    const spot = cascadeSpot(page, { x: 20, y: 26 }, 54, 58);
    const element = makePhoto(photoId, {
      ...spot,
      w: 42,
      h: 37.8,
      rot: -2,
      frame: 'classic',
    });
    get().addElement(pageId, element);
    const doc = get().doc;
    const index = doc?.pages.findIndex((p) => p.id === pageId) ?? 0;
    set({ pageIndex: Math.max(0, index) });
    get().notify('Photo placed on the page.', 'success');
  },

  addAlbum: (name) => {
    if (!name.trim()) return;
    commit((doc) => ({
      ...doc,
      albums: [...doc.albums, { id: uid('album-'), name: name.trim() }],
    }));
    get().notify('Album created.', 'success');
  },

  renameAlbum: (albumId, name) => {
    if (!name.trim()) return;
    commit((doc) => ({
      ...doc,
      albums: doc.albums.map((album) =>
        album.id === albumId ? { ...album, name: name.trim() } : album,
      ),
    }));
  },

  deleteAlbum: (albumId) => {
    commit((doc) => ({
      ...doc,
      albums: doc.albums.filter((album) => album.id !== albumId),
      photos: doc.photos.map((photo) =>
        photo.albumId === albumId ? { ...photo, albumId: null } : photo,
      ),
    }));
    get().notify('Album removed — its photos are still in your library.', 'success');
  },

  updateMeta: (patch) => {
    commit((doc) => ({ ...doc, meta: { ...doc.meta, ...patch } }));
  },

  changePasscode: async (newPass) => {
    if (backend.mode === 'supabase') {
      get().notify(
        'Change your password in Supabase Authentication → Users. The editor uses that account.',
        'info',
      );
      return;
    }
    const hash = await hashPasscode(newPass);
    commit((doc) => ({ ...doc, meta: { ...doc.meta, passHash: hash } }));
    get().notify('Admin passcode updated on this device.', 'success');
  },

  updateSettings: (patch) => {
    commit((doc) => ({ ...doc, settings: { ...doc.settings, ...patch } }));
    const settings = get().doc?.settings;
    if (settings) audio.setPrefs(settings);
  },

  updateTheme: (patch) => {
    const doc = get().doc;
    if (!doc) return;
    const theme = normalizeTheme({ ...doc.theme, ...patch });
    applyTheme(theme);
    commit((current) => ({ ...current, theme }));
  },

  restoreBackup: async (doc, blobs) => {
    if (backend.mode === 'supabase') {
      throw new Error(
        'Backup restore is available in local mode. With Supabase, restore through the SQL editor.',
      );
    }
    revokeMedia();
    await clearBlobs();
    const urls: Record<string, string> = {};
    for (const [key, blob] of blobs) {
      await putBlob(key, blob);
    }
    const normalized = normalizeDoc({ ...doc, updatedAt: Date.now() });
    await saveStoredDoc(normalized);
    const resolved = await backend.resolveMedia(normalized);
    Object.assign(urls, resolved);
    mediaUrls = resolved;
    applyTheme(normalized.theme);
    set({
      doc: normalized,
      mediaUrls: urls,
      pageIndex: 0,
      selectedId: null,
      past: [],
      future: [],
      saveState: 'saved',
      dirty: false,
      lastSavedAt: normalized.updatedAt,
      scene: 'book',
    });
    audio.setPrefs(normalized.settings);
  },
}));

/** Warm the public cache before first paint when possible. */
export async function peekLocalDraft(): Promise<ScrapbookDoc | null> {
  try {
    return await loadStoredDoc();
  } catch {
    return null;
  }
}

export function currentScope(): AppScope {
  return activeScope;
}
