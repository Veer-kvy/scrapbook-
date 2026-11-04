import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  CustomAsset,
  ElementInteraction,
  Letter,
  Page,
  PhotoMeta,
  PublishedState,
  ScrapbookDoc,
  ScrapbookElement,
  ScrapbookMeta,
  ScrapbookSettings,
  ThemeSettings,
  VersionSummary,
} from '../types';
import { DEFAULT_THEME, normalizeTheme } from '../data/theme';
import { makeLetter } from '../data/factories';
import {
  conflictError,
  type AuthUser,
  type ContentBackend,
  type MediaUploadInput,
  type MediaUploadResult,
  type PublishProgress,
  type PublishedSnapshot,
  type SaveOptions,
} from './types';

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? '';
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? '';
export const bucket = (import.meta.env.VITE_SUPABASE_BUCKET as string | undefined)?.trim() || 'scrapbook-media';
export const supabaseConfigured = Boolean(url && anonKey);

let client: SupabaseClient | null = null;
let revision: number | null = null;
let hasSettings = false;

async function getClient(): Promise<SupabaseClient> {
  if (!supabaseConfigured) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }
  if (!client) {
    const { createClient } = await import('@supabase/supabase-js');
    client = createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  }
  return client;
}

function fail(error: { message: string } | null, fallback: string): never {
  throw new Error(error?.message ? `${fallback} (${error.message})` : fallback);
}

function extensionFor(mime: string): string {
  if (mime.includes('png')) return 'png';
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
  if (mime.includes('svg')) return 'svg';
  return 'webp';
}

function filePathFor(folder: string, id: string, mime: string): string {
  return `${folder}/${id}.${extensionFor(mime)}`;
}

async function signedUrlMap(sb: SupabaseClient, paths: string[]): Promise<Record<string, string>> {
  const unique = Array.from(new Set(paths.filter(Boolean)));
  if (!unique.length) return {};
  const { data, error } = await sb.storage.from(bucket).createSignedUrls(unique, 60 * 60 * 24);
  if (error) fail(error, 'Could not create image links');
  const map: Record<string, string> = {};
  (data ?? []).forEach((entry) => {
    if (entry.path && entry.signedUrl) map[entry.path] = entry.signedUrl;
  });
  return map;
}

function mergeInteraction(
  element: ScrapbookElement,
  interactions: Map<string, ElementInteraction>,
): ScrapbookElement {
  const interaction = interactions.get(element.id);
  return interaction ? { ...element, interaction } : element;
}

interface SettingsRow {
  id: number;
  meta_json: ScrapbookMeta | null;
  theme_json: ThemeSettings | null;
  settings_json: ScrapbookSettings | null;
  albums_json: { id: string; name: string }[] | null;
  revision: number;
  updated_at: string;
}

/**
 * Supabase backend: authentication and authorization come from Supabase Auth
 * plus row-level security; image binaries live in a private Storage bucket and
 * only their metadata is stored in Postgres. The public site reads published
 * snapshots exclusively through the `get_published_snapshot` RPC.
 */
export const supabaseBackend: ContentBackend = {
  mode: 'supabase',
  label: 'Supabase cloud',
  storageNote: 'Drafts and media sync to your Supabase project; the public site reads published versions.',

  async init() {
    const sb = await getClient();
    const { data } = await sb.auth.getSession();
    if (data.session?.user) {
      revision = null;
    }
  },

  async getUser(): Promise<AuthUser | null> {
    const sb = await getClient();
    const { data } = await sb.auth.getSession();
    const user = data.session?.user;
    if (!user) return null;
    return { email: user.email ?? null, name: user.email ?? 'Administrator' };
  },

  async signIn(input) {
    if (!input.email || !input.password) {
      throw new Error('Enter the administrator email and password.');
    }
    const sb = await getClient();
    const { data, error } = await sb.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });
    if (error) fail(error, 'Sign-in failed');
    return { email: data.user.email ?? input.email, name: data.user.email ?? 'Administrator' };
  },

  async signOut() {
    const sb = await getClient();
    await sb.auth.signOut();
    revision = null;
    hasSettings = false;
  },

  onAuthChange(listener) {
    let unsubscribe: (() => void) | null = null;
    void getClient().then((sb) => {
      const { data } = sb.auth.onAuthStateChange((_event, session) => {
        const user = session?.user;
        listener(user ? { email: user.email ?? null, name: user.email ?? 'Administrator' } : null);
      });
      unsubscribe = () => data.subscription.unsubscribe();
    });
    return () => unsubscribe?.();
  },

  async loadDraft(): Promise<ScrapbookDoc | null> {
    const sb = await getClient();
    const { data: settings, error } = await sb
      .from('scrapbook_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle<SettingsRow>();
    if (error) fail(error, 'Could not load the scrapbook draft');
    if (!settings) {
      revision = 0;
      hasSettings = false;
      return null;
    }
    revision = Number(settings.revision ?? 0);
    hasSettings = true;

    const [pagesResult, mediaResult, lettersResult, assetsResult, interactionsResult] =
      await Promise.all([
        sb.from('scrapbook_pages').select('*').order('page_order', { ascending: true }),
        sb.from('media_assets').select('*').order('created_at', { ascending: false }),
        sb.from('letters').select('*').order('created_at', { ascending: true }),
        sb.from('scrapbook_assets').select('*').order('created_at', { ascending: true }),
        sb.from('scrapbook_interactions').select('*'),
      ]);
    if (pagesResult.error) fail(pagesResult.error, 'Could not load pages');
    if (mediaResult.error) fail(mediaResult.error, 'Could not load photographs');
    if (lettersResult.error) fail(lettersResult.error, 'Could not load letters');

    const interactions = new Map<string, ElementInteraction>();
    for (const row of interactionsResult.data ?? []) {
      interactions.set(row.element_id as string, row.interaction_config as ElementInteraction);
    }

    const pages: Page[] = (pagesResult.data ?? []).map((row) => {
      const content = (row.content_json ?? {}) as Partial<Page>;
      return {
        id: row.id as string,
        name: (row.title as string) || 'Untitled page',
        template: ((row.page_type as Page['template']) ?? 'blank') as Page['template'],
        bg: (content.bg ?? 'cream') as Page['bg'],
        transition: content.transition ?? 'turn',
        elements: (content.elements ?? []).map((element) =>
          mergeInteraction(element as ScrapbookElement, interactions),
        ),
      };
    });

    const photos: PhotoMeta[] = (mediaResult.data ?? []).map((row) => {
      const meta = (row.metadata_json ?? {}) as Partial<PhotoMeta>;
      return {
        id: row.id as string,
        albumId: meta.albumId ?? null,
        name: meta.name ?? (row.filename as string) ?? 'Untitled',
        caption: meta.caption ?? '',
        date: meta.date ?? '',
        createdAt: meta.createdAt ?? Date.parse(row.created_at as string),
        width: meta.width ?? 0,
        height: meta.height ?? 0,
        storagePath: (row.file_path as string) || undefined,
        mimeType: (row.mime_type as string) ?? undefined,
        fileSize: Number(row.file_size ?? 0) || undefined,
        src: meta.src,
      };
    });

    const letters: Letter[] = (lettersResult.data ?? []).map((row) => {
      const design = (row.design_json ?? {}) as Partial<Letter>;
      return makeLetter({
        ...design,
        id: row.id as string,
        title: (row.title as string) || 'A letter',
        category: (row.category as Letter['category']) ?? 'custom',
        body: (row.content as string) ?? '',
        createdAt: Date.parse(row.created_at as string) || Date.now(),
        updatedAt: Date.parse(row.updated_at as string) || Date.now(),
      });
    });

    const customAssets: CustomAsset[] = (assetsResult.data ?? []).map((row) => ({
      id: row.id as string,
      name: (row.name as string) ?? 'Decoration',
      format: ((row.mime_type as string)?.includes('svg') ? 'svg' : 'png') as CustomAsset['format'],
      width: Number(row.width ?? 0),
      height: Number(row.height ?? 0),
      createdAt: Date.parse(row.created_at as string) || Date.now(),
      storagePath: (row.file_path as string) ?? undefined,
    }));

    return {
      version: 1,
      meta: settings.meta_json ?? {
        title: 'Kabbu’s Little Scrapbook',
        subtitle: 'a collection of little moments, kept safe',
        recipient: 'Kabbu',
        sender: 'yours, always',
        welcomeNote: 'Someone made a little something for you…',
        coverNote: 'for the ordinary days that felt like a story',
        passHash: '',
        passHint: '',
      },
      theme: normalizeTheme(settings.theme_json ?? DEFAULT_THEME),
      albums: settings.albums_json ?? [],
      pages,
      photos,
      letters,
      customAssets,
      settings: settings.settings_json ?? { volume: 0.6, music: false, sfx: true },
      updatedAt: Date.parse(settings.updated_at) || Date.now(),
    };
  },

  async saveDraft(doc, options: SaveOptions = {}) {
    const sb = await getClient();
    const nowIso = new Date(doc.updatedAt).toISOString();
    const current = revision ?? Number((await fetchRevision(sb)) ?? 0);
    const nextRevision = current + 1;

    const settingsPayload = {
      id: 1,
      meta_json: doc.meta,
      theme_json: doc.theme,
      settings_json: doc.settings,
      albums_json: doc.albums,
      revision: nextRevision,
      updated_at: nowIso,
    };

    if (!hasSettings) {
      const { error } = await sb.from('scrapbook_settings').upsert(settingsPayload, { onConflict: 'id' });
      if (error) fail(error, 'Could not create the draft');
      hasSettings = true;
      revision = nextRevision;
    } else if (options.force) {
      const { error } = await sb.from('scrapbook_settings').upsert(settingsPayload, { onConflict: 'id' });
      if (error) fail(error, 'Could not save the draft');
      revision = nextRevision;
    } else {
      const { data, error } = await sb
        .from('scrapbook_settings')
        .update({ ...settingsPayload, id: undefined })
        .eq('id', 1)
        .eq('revision', current)
        .select('revision')
        .maybeSingle();
      if (error) fail(error, 'Could not save the draft');
      if (!data) {
        revision = Number((await fetchRevision(sb)) ?? current);
        throw conflictError(
          'Another editor saved a newer draft. Reload it or choose “keep my version”.',
        );
      }
      revision = nextRevision;
    }

    const pageRows = doc.pages.map((page, index) => ({
      id: page.id,
      title: page.name,
      page_type: page.template,
      page_order: index,
      status: 'draft',
      content_json: {
        bg: page.bg,
        transition: page.transition ?? 'turn',
        elements: page.elements.map(({ interaction: _interaction, ...rest }) => rest),
      },
      updated_at: nowIso,
    }));
    await replaceRows(sb, 'scrapbook_pages', pageRows);

    const mediaRows = doc.photos
      .filter((photo) => photo.storagePath || photo.src)
      .map((photo) => ({
        id: photo.id,
        file_path: photo.storagePath ?? '',
        thumbnail_path: photo.storagePath
          ? `draft/thumbnails/${photo.id}.webp`
          : null,
        filename: photo.name,
        mime_type: photo.mimeType ?? (photo.src ? undefined : 'image/webp'),
        file_size: photo.fileSize ?? 0,
        metadata_json: {
          albumId: photo.albumId,
          name: photo.name,
          caption: photo.caption,
          date: photo.date,
          width: photo.width,
          height: photo.height,
          createdAt: photo.createdAt,
          src: photo.src,
        },
        created_at: new Date(photo.createdAt).toISOString(),
      }));
    await replaceRows(sb, 'media_assets', mediaRows);

    const letterRows = doc.letters.map((letter) => ({
      id: letter.id,
      title: letter.title,
      category: letter.category,
      content: letter.body,
      design_json: {
        font: letter.font,
        inkColor: letter.inkColor,
        fontSize: letter.fontSize,
        paper: letter.paper,
        envelope: letter.envelope,
        animation: letter.animation,
        hiddenMessage: letter.hiddenMessage,
        customCategory: letter.customCategory,
      },
      created_at: new Date(letter.createdAt).toISOString(),
      updated_at: nowIso,
    }));
    await replaceRows(sb, 'letters', letterRows);

    const assetRows = doc.customAssets
      .filter((asset) => asset.storagePath)
      .map((asset) => ({
        id: asset.id,
        name: asset.name,
        file_path: asset.storagePath,
        mime_type: asset.format === 'svg' ? 'image/svg+xml' : 'image/png',
        width: asset.width,
        height: asset.height,
        created_at: new Date(asset.createdAt).toISOString(),
      }));
    await replaceRows(sb, 'scrapbook_assets', assetRows);

    const { error: clearError } = await sb
      .from('scrapbook_interactions')
      .delete()
      .neq('id', '__none__');
    if (clearError) fail(clearError, 'Could not update interactions');
    const interactionRows = doc.pages.flatMap((page) =>
      page.elements
        .filter((element) => element.interaction)
        .map((element) => ({
          id: `${page.id}::${element.id}`,
          page_id: page.id,
          element_id: element.id,
          interaction_type: element.interaction!.type,
          interaction_config: element.interaction!,
        })),
    );
    if (interactionRows.length) {
      const { error } = await sb.from('scrapbook_interactions').insert(interactionRows);
      if (error) fail(error, 'Could not save interactions');
    }

    return { updatedAt: doc.updatedAt };
  },

  async loadPublished(): Promise<PublishedSnapshot | null> {
    const sb = await getClient();
    const { data, error } = await sb.rpc('get_published_snapshot');
    if (error) fail(error, 'Could not load the published scrapbook');
    if (!data) return null;
    const payload = data as {
      versionId: string;
      versionNumber: number;
      label: string;
      publishedAt: number;
      doc: ScrapbookDoc;
    };
    return {
      versionId: payload.versionId,
      versionNumber: Number(payload.versionNumber),
      label: payload.label,
      publishedAt: Number(payload.publishedAt),
      doc: payload.doc,
    };
  },

  async listVersions(): Promise<VersionSummary[]> {
    const sb = await getClient();
    const { data, error } = await sb
      .from('scrapbook_versions')
      .select('id, version_number, label, published_at, page_count, photo_count, letter_count')
      .order('version_number', { ascending: false });
    if (error) fail(error, 'Could not load version history');
    return (data ?? []).map((row) => ({
      id: row.id as string,
      versionNumber: Number(row.version_number),
      label: (row.label as string) ?? '',
      publishedAt: Date.parse(row.published_at as string),
      pageCount: Number(row.page_count ?? 0),
      photoCount: Number(row.photo_count ?? 0),
      letterCount: Number(row.letter_count ?? 0),
    }));
  },

  async publish(doc, label, onProgress: (progress: PublishProgress) => void = () => undefined) {
    const sb = await getClient();
    const versionId = crypto.randomUUID();
    const snapshot = structuredClone(doc);
    snapshot.meta = { ...snapshot.meta, passHash: '', passHint: '' };

    const media = [
      ...snapshot.photos.filter((photo) => photo.storagePath),
      ...snapshot.customAssets.filter((asset) => asset.storagePath),
    ];
    let done = 0;
    for (const item of media) {
      const from = item.storagePath!;
      const ext = from.split('.').pop() || 'webp';
      const prefix = 'format' in item ? `published/${versionId}/assets` : `published/${versionId}/media`;
      const to = `${prefix}/${item.id}.${ext}`;
      const { error } = await sb.storage.from(bucket).copy(from, to);
      if (error) {
        fail(error, 'A photograph could not be copied into the published version');
      }
      item.storagePath = to;
      done += 1;
      onProgress({ done, total: media.length, label: item.id });
    }

    const { data, error } = await sb.rpc('publish_version', {
      p_snapshot: snapshot,
      p_label: label.trim() || `Version`,
      p_page_count: snapshot.pages.length,
      p_photo_count: snapshot.photos.length,
      p_letter_count: snapshot.letters.length,
    });
    if (error) fail(error, 'Publishing failed');
    const row = Array.isArray(data) ? data[0] : data;
    return {
      id: (row?.id as string) ?? versionId,
      versionNumber: Number(row?.version_number ?? 0),
      label: label.trim() || `Version ${row?.version_number ?? ''}`.trim(),
      publishedAt: row?.published_at ? Date.parse(row.published_at as string) : Date.now(),
      pageCount: snapshot.pages.length,
      photoCount: snapshot.photos.length,
      letterCount: snapshot.letters.length,
    };
  },

  async restoreVersion(versionId) {
    const sb = await getClient();
    const { data, error } = await sb
      .from('scrapbook_versions')
      .select('snapshot_json')
      .eq('id', versionId)
      .maybeSingle();
    if (error) fail(error, 'Could not read that version');
    if (!data) throw new Error('That published version could not be found.');
    return data.snapshot_json as ScrapbookDoc;
  },

  async getPublication(): Promise<PublishedState | null> {
    const sb = await getClient();
    const { data, error } = await sb
      .from('scrapbook_publication')
      .select('version_id, published_at, scrapbook_versions(version_number, label)')
      .eq('id', 1)
      .maybeSingle();
    if (error) return null;
    if (!data) return null;
    const version = Array.isArray(data.scrapbook_versions)
      ? data.scrapbook_versions[0]
      : data.scrapbook_versions;
    return {
      versionId: data.version_id as string,
      versionNumber: Number(version?.version_number ?? 0),
      publishedAt: Date.parse(data.published_at as string),
      label: (version?.label as string) ?? '',
    };
  },

  async resolveMedia(doc) {
    const sb = await getClient();
    const paths = [
      ...doc.photos.map((photo) => photo.storagePath),
      ...doc.customAssets.map((asset) => asset.storagePath),
    ].filter((path): path is string => Boolean(path));
    const map = await signedUrlMap(sb, paths);
    const urls: Record<string, string> = {};
    for (const photo of doc.photos) {
      if (photo.storagePath && map[photo.storagePath]) urls[photo.id] = map[photo.storagePath];
    }
    for (const asset of doc.customAssets) {
      if (asset.storagePath && map[asset.storagePath]) urls[asset.id] = map[asset.storagePath];
    }
    return urls;
  },

  async uploadPhoto(input: MediaUploadInput): Promise<MediaUploadResult> {
    const sb = await getClient();
    const path = filePathFor('draft/media', input.id, input.blob.type || input.mimeType);
    const { error } = await sb.storage.from(bucket).upload(path, input.blob, {
      contentType: input.blob.type || input.mimeType,
      upsert: true,
    });
    if (error) fail(error, 'Could not upload the photograph');
    if (input.thumbnail) {
      const thumbPath = `draft/thumbnails/${input.id}.webp`;
      const thumb = await sb.storage.from(bucket).upload(thumbPath, input.thumbnail, {
        contentType: 'image/webp',
        upsert: true,
      });
      if (thumb.error) {
        // A missing thumbnail must not lose the photograph itself.
      }
    }
    const map = await signedUrlMap(sb, [path]);
    return { storagePath: path, url: map[path] ?? '' };
  },

  async replacePhotoFile(input) {
    const sb = await getClient();
    const path = input.storagePath || filePathFor('draft/media', input.id, input.blob.type || input.mimeType);
    const { error } = await sb.storage.from(bucket).upload(path, input.blob, {
      contentType: input.blob.type || input.mimeType,
      upsert: true,
    });
    if (error) fail(error, 'Could not replace the photograph');
    const map = await signedUrlMap(sb, [path]);
    return { storagePath: path, url: map[path] ?? '' };
  },

  async deletePhoto(photo) {
    if (!photo.storagePath || !photo.storagePath.startsWith('draft/')) return;
    const sb = await getClient();
    await sb.storage.from(bucket).remove([photo.storagePath]);
  },

  async uploadAsset(input) {
    const sb = await getClient();
    const path = filePathFor('draft/assets', input.id, input.blob.type || input.mimeType);
    const { error } = await sb.storage.from(bucket).upload(path, input.blob, {
      contentType: input.blob.type || input.mimeType,
      upsert: true,
    });
    if (error) fail(error, 'Could not upload the decoration');
    const map = await signedUrlMap(sb, [path]);
    return { storagePath: path, url: map[path] ?? '' };
  },

  async deleteAsset(asset) {
    if (!asset.storagePath || !asset.storagePath.startsWith('draft/')) return;
    const sb = await getClient();
    await sb.storage.from(bucket).remove([asset.storagePath]);
  },
};

async function fetchRevision(sb: SupabaseClient): Promise<number | null> {
  const { data } = await sb.from('scrapbook_settings').select('revision').eq('id', 1).maybeSingle();
  return data ? Number(data.revision ?? 0) : null;
}

async function replaceRows(
  sb: SupabaseClient,
  table: string,
  rows: Record<string, unknown>[],
): Promise<void> {
  if (rows.length) {
    const { error } = await sb.from(table).upsert(rows, { onConflict: 'id' });
    if (error) fail(error, `Could not save ${table.replace(/_/g, ' ')}`);
  }
  const { data: existing, error: readError } = await sb.from(table).select('id');
  if (readError) fail(readError, `Could not update ${table.replace(/_/g, ' ')}`);
  const keep = new Set(rows.map((row) => row.id as string));
  const stale = (existing ?? [])
    .map((row) => row.id as string)
    .filter((id) => !keep.has(id));
  if (stale.length) {
    const { error } = await sb.from(table).delete().in('id', stale);
    if (error) fail(error, `Could not clean up ${table.replace(/_/g, ' ')}`);
  }
}
