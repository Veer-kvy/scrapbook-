import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  BookSummary,
  MakerProfile,
  PublishedBookSummary,
  PublishedState,
  ScrapbookDoc,
  VersionSummary,
} from '../types';
import { createBookDoc } from '../data/seed';
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
  type PublishedLookup,
  type PublishedSnapshot,
  type SaveOptions,
} from './types';

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? '';
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? '';
export const bucket = (import.meta.env.VITE_SUPABASE_BUCKET as string | undefined)?.trim() || 'scrapbook-media';
export const supabaseConfigured = Boolean(url && anonKey);

const MAX_VERSIONS = 25;

let client: SupabaseClient | null = null;

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

function extensionOf(path: string): string {
  return path.split('.').pop() || 'webp';
}

function draftPrefix(bookId: string): string {
  return `draft/books/${bookId}`;
}

interface BookRow {
  id: string;
  slug: string;
  title: string;
  recipient: string | null;
  revision: number;
  updated_at: string;
  published_at: string | null;
  version_number: number | null;
  page_count: number | null;
  photo_count: number | null;
  draft_json: ScrapbookDoc | null;
  reader_lock_hash?: string | null;
}

function toSummary(row: BookRow): BookSummary {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    recipient: row.recipient ?? '',
    updatedAt: Date.parse(row.updated_at) || Date.now(),
    pageCount: Number(row.page_count ?? 0),
    photoCount: Number(row.photo_count ?? 0),
    publishedAt: row.published_at ? Date.parse(row.published_at) : null,
    versionNumber: row.version_number == null ? null : Number(row.version_number),
    readerLocked: Boolean(row.reader_lock_hash),
  };
}

function withoutSecrets(doc: ScrapbookDoc): ScrapbookDoc {
  return {
    ...structuredClone(doc),
    meta: { ...doc.meta, passHash: '', passHint: '' },
  };
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

/** Removes every stored object belonging to one published version. */
async function removeVersionMedia(sb: SupabaseClient, versionId: string): Promise<void> {
  for (const folder of ['media', 'assets']) {
    const prefix = `published/${versionId}/${folder}`;
    const { data } = await sb.storage.from(bucket).list(prefix, { limit: 1000 });
    const paths = (data ?? []).filter((entry) => entry.id).map((entry) => `${prefix}/${entry.name}`);
    if (paths.length) await sb.storage.from(bucket).remove(paths);
  }
}

/**
 * Deep-copies a draft for a new book: ids are remapped everywhere they are
 * referenced, and stored photographs are copied into the new book's folder so
 * deleting the source book never leaves the copy with broken images.
 */
async function cloneDraftDoc(
  sb: SupabaseClient,
  source: ScrapbookDoc,
  title: string,
  bookId: string,
): Promise<ScrapbookDoc> {
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
    if (photo.storagePath?.startsWith('draft/')) {
      const to = `${draftPrefix(bookId)}/media/${id}.${extensionOf(photo.storagePath)}`;
      const { error } = await sb.storage.from(bucket).copy(photo.storagePath, to);
      if (!error) photo.storagePath = to;
    }
    photo.id = id;
    photo.albumId = photo.albumId ? (albumMap.get(photo.albumId) ?? null) : null;
  }

  const assetMap = new Map<string, string>();
  for (const asset of doc.customAssets) {
    const id = uid('asset-');
    assetMap.set(asset.id, id);
    if (asset.storagePath?.startsWith('draft/')) {
      const to = `${draftPrefix(bookId)}/assets/${id}.${extensionOf(asset.storagePath)}`;
      const { error } = await sb.storage.from(bucket).copy(asset.storagePath, to);
      if (!error) asset.storagePath = to;
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

  doc.meta = { ...doc.meta, title, passHash: '', passHint: '' };
  doc.updatedAt = Date.now();
  return doc;
}

/**
 * Supabase backend: authentication and authorization come from Supabase Auth
 * plus row-level security; image binaries live in a private Storage bucket and
 * only metadata is stored in Postgres. Each scrapbook is a row in `books` with
 * a unique slug, and readers resolve `#/s/<slug>` through a security-definer
 * RPC that only ever returns published snapshots.
 */
export const supabaseBackend: ContentBackend = {
  mode: 'supabase',
  label: 'Supabase cloud',
  storageNote:
    'Drafts and media sync to your Supabase project; readers open each published scrapbook through its own link.',

  async init() {
    const sb = await getClient();
    await sb.auth.getSession();
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

  /* ------------------------------------------------------------- library */

  async listBooks(): Promise<BookSummary[]> {
    const sb = await getClient();
    const { data, error } = await sb.from('books').select('*').order('updated_at', { ascending: false });
    if (error) fail(error, 'Could not load your scrapbooks');
    return (data ?? []).map((row) => toSummary(row as BookRow));
  },

  async createBook(title: string): Promise<BookSummary> {
    const sb = await getClient();
    const { data: existing, error: listError } = await sb.from('books').select('slug');
    if (listError) fail(listError, 'Could not load your scrapbooks');
    const name = title.trim() || 'A new scrapbook';
    const doc = createBookDoc(name);
    const slug = uniqueSlug(name, (existing ?? []).map((row) => row.slug as string));
    const { data, error } = await sb
      .from('books')
      .insert({
        slug,
        title: doc.meta.title,
        recipient: doc.meta.recipient,
        page_count: doc.pages.length,
        photo_count: doc.photos.length,
        updated_at: new Date(doc.updatedAt).toISOString(),
        draft_json: doc,
      })
      .select('*')
      .single<BookRow>();
    if (error) fail(error, 'Could not create the scrapbook');
    return toSummary(data);
  },

  async duplicateBook(bookId: string): Promise<BookSummary> {
    const sb = await getClient();
    const { data: source, error } = await sb
      .from('books')
      .select('*')
      .eq('id', bookId)
      .maybeSingle<BookRow>();
    if (error) fail(error, 'Could not read that scrapbook');
    if (!source) throw new Error('That scrapbook could not be found.');
    if (!source.draft_json) throw new Error('That scrapbook has no draft to copy yet.');

    const { data: existing } = await sb.from('books').select('slug');
    const title = `${source.title} copy`;
    const slug = uniqueSlug(title, (existing ?? []).map((row) => row.slug as string));
    const newId = crypto.randomUUID();
    const doc = await cloneDraftDoc(sb, source.draft_json, title, newId);

    const { data, error: insertError } = await sb
      .from('books')
      .insert({
        id: newId,
        slug,
        title: doc.meta.title,
        recipient: doc.meta.recipient,
        page_count: doc.pages.length,
        photo_count: doc.photos.length,
        updated_at: new Date(doc.updatedAt).toISOString(),
        draft_json: doc,
      })
      .select('*')
      .single<BookRow>();
    if (insertError) fail(insertError, 'Could not copy the scrapbook');
    return toSummary(data);
  },

  async updateBook(bookId: string, patch: BookPatch): Promise<BookSummary> {
    const sb = await getClient();
    const { data: book, error } = await sb
      .from('books')
      .select('*')
      .eq('id', bookId)
      .maybeSingle<BookRow>();
    if (error) fail(error, 'Could not read that scrapbook');
    if (!book) throw new Error('That scrapbook could not be found.');

    const update: Record<string, unknown> = {};

    if (patch.slug != null && patch.slug !== book.slug) {
      const slug = slugify(patch.slug);
      if (slug !== patch.slug.trim()) {
        throw new Error('Use lowercase letters, numbers and dashes for the link.');
      }
      const { data: taken, error: takenError } = await sb
        .from('books')
        .select('id')
        .eq('slug', slug)
        .neq('id', bookId)
        .maybeSingle();
      if (takenError) fail(takenError, 'Could not check that link');
      if (taken) throw new Error('That link is already used by another scrapbook.');
      update.slug = slug;
    }

    const nextTitle = patch.title != null ? patch.title.trim() || book.title : book.title;
    const nextRecipient = patch.recipient != null ? patch.recipient : (book.recipient ?? '');
    if (patch.title != null) update.title = nextTitle;
    if (patch.recipient != null) update.recipient = nextRecipient;
    if (patch.title != null || patch.recipient != null) {
      const updatedAt = Date.now();
      update.updated_at = new Date(updatedAt).toISOString();
      if (book.draft_json) {
        update.draft_json = {
          ...book.draft_json,
          meta: { ...book.draft_json.meta, title: nextTitle, recipient: nextRecipient },
          updatedAt,
        };
      }
    }

    if (!Object.keys(update).length) return toSummary(book);
    const { data, error: updateError } = await sb
      .from('books')
      .update(update)
      .eq('id', bookId)
      .select('*')
      .single<BookRow>();
    if (updateError) fail(updateError, 'Could not update the scrapbook');
    return toSummary(data);
  },

  async deleteBook(bookId: string): Promise<void> {
    const sb = await getClient();
    const { data: versions } = await sb.from('scrapbook_versions').select('id').eq('book_id', bookId);
    for (const version of versions ?? []) {
      await removeVersionMedia(sb, version.id as string);
    }

    for (const folder of ['media', 'assets', 'thumbs']) {
      const prefix = `${draftPrefix(bookId)}/${folder}`;
      const { data } = await sb.storage.from(bucket).list(prefix, { limit: 1000 });
      const paths = (data ?? []).filter((entry) => entry.id).map((entry) => `${prefix}/${entry.name}`);
      if (paths.length) await sb.storage.from(bucket).remove(paths);
    }

    const { error } = await sb.from('books').delete().eq('id', bookId);
    if (error) fail(error, 'Could not delete the scrapbook');
  },

  /* -------------------------------------------------------------- drafts */

  async loadDraft(bookId: string): Promise<ScrapbookDoc | null> {
    const sb = await getClient();
    const { data, error } = await sb
      .from('books')
      .select('draft_json')
      .eq('id', bookId)
      .maybeSingle<{ draft_json: ScrapbookDoc | null }>();
    if (error) fail(error, 'Could not load the scrapbook draft');
    return data?.draft_json ?? null;
  },

  async saveDraft(bookId: string, doc: ScrapbookDoc, options: SaveOptions = {}) {
    const sb = await getClient();
    const { data: current, error: readError } = await sb
      .from('books')
      .select('revision')
      .eq('id', bookId)
      .maybeSingle<{ revision: number }>();
    if (readError) fail(readError, 'Could not save the draft');
    if (!current) throw new Error('That scrapbook could not be found.');
    const revision = Number(current.revision ?? 0);

    const payload = {
      title: doc.meta.title.trim() || 'Untitled scrapbook',
      recipient: doc.meta.recipient,
      page_count: doc.pages.length,
      photo_count: doc.photos.length,
      updated_at: new Date(doc.updatedAt).toISOString(),
      draft_json: doc,
      revision: revision + 1,
    };

    if (options.force) {
      const { error } = await sb.from('books').update(payload).eq('id', bookId);
      if (error) fail(error, 'Could not save the draft');
    } else {
      const { data, error } = await sb
        .from('books')
        .update(payload)
        .eq('id', bookId)
        .eq('revision', revision)
        .select('revision')
        .maybeSingle();
      if (error) fail(error, 'Could not save the draft');
      if (!data) {
        throw conflictError(
          'Another editor saved a newer draft. Reload it or choose “keep my version”.',
        );
      }
    }
    return { updatedAt: doc.updatedAt };
  },

  /* ----------------------------------------------------------- publishing */

  async loadPublished(bookId: string): Promise<PublishedSnapshot | null> {
    const sb = await getClient();
    const { data, error } = await sb
      .from('scrapbook_publication')
      .select('version_id, published_at, scrapbook_versions(version_number, label, snapshot_json)')
      .eq('book_id', bookId)
      .maybeSingle();
    if (error) fail(error, 'Could not load the published scrapbook');
    if (!data) return null;
    const version = Array.isArray(data.scrapbook_versions)
      ? data.scrapbook_versions[0]
      : data.scrapbook_versions;
    if (!version?.snapshot_json) return null;
    return {
      doc: version.snapshot_json as ScrapbookDoc,
      publishedAt: Date.parse(data.published_at as string),
      versionId: data.version_id as string,
      versionNumber: Number(version.version_number ?? 0),
      label: (version.label as string) ?? '',
    };
  },

  async findPublishedBySlug(slug: string, passcode?: string): Promise<PublishedLookup | null> {
    const sb = await getClient();
    const { data, error } = await sb.rpc('get_published_by_slug', {
      p_slug: slug,
      p_passcode: passcode ?? null,
    });
    if (error) fail(error, 'Could not open that scrapbook');
    if (!data) return null;
    if ((data as { locked?: boolean }).locked === true) return { locked: true };
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

  async listPublishedBooks(): Promise<PublishedBookSummary[]> {
    const sb = await getClient();
    const { data, error } = await sb.rpc('list_published_books');
    if (error) fail(error, 'Could not load the shelf');
    return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
      id: row.id as string,
      slug: row.slug as string,
      title: (row.title as string) ?? '',
      subtitle: (row.subtitle as string) ?? '',
      recipient: (row.recipient as string) ?? '',
      sender: (row.sender as string) ?? '',
      publishedAt: Number(row.publishedAt ?? 0),
      versionNumber: Number(row.versionNumber ?? 0),
      pageCount: Number(row.pageCount ?? 0),
      locked: Boolean(row.locked),
    }));
  },

  async setReaderLock(bookId: string, passcode: string | null): Promise<void> {
    const sb = await getClient();
    const { error } = await sb.rpc('set_reader_lock', {
      p_book_id: bookId,
      p_passcode: passcode,
    });
    if (error) fail(error, 'Could not save the reader passcode');
  },

  async listVersions(bookId: string): Promise<VersionSummary[]> {
    const sb = await getClient();
    const { data, error } = await sb
      .from('scrapbook_versions')
      .select('id, version_number, label, published_at, page_count, photo_count, letter_count')
      .eq('book_id', bookId)
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

  async publish(
    bookId: string,
    doc: ScrapbookDoc,
    label: string,
    onProgress: (progress: PublishProgress) => void = () => undefined,
  ): Promise<VersionSummary> {
    const sb = await getClient();
    const versionId = crypto.randomUUID();
    const snapshot = withoutSecrets(doc);

    const media = [
      ...snapshot.photos
        .filter((photo) => photo.storagePath)
        .map((photo) => ({ folder: 'media', item: photo })),
      ...snapshot.customAssets
        .filter((asset) => asset.storagePath)
        .map((asset) => ({ folder: 'assets', item: asset })),
    ];
    let done = 0;
    for (const entry of media) {
      const from = entry.item.storagePath!;
      const to = `published/${versionId}/${entry.folder}/${entry.item.id}.${extensionOf(from)}`;
      const { error } = await sb.storage.from(bucket).copy(from, to);
      if (error) {
        fail(error, 'A photograph could not be copied into the published version');
      }
      entry.item.storagePath = to;
      done += 1;
      onProgress({ done, total: media.length, label: entry.item.id });
    }

    const { data, error } = await sb.rpc('publish_version', {
      p_book_id: bookId,
      p_snapshot: snapshot,
      p_label: label.trim() || 'Version',
      p_page_count: snapshot.pages.length,
      p_photo_count: snapshot.photos.length,
      p_letter_count: snapshot.letters.length,
    });
    if (error) fail(error, 'Publishing failed');
    const row = (Array.isArray(data) ? data[0] : data) as
      | { id: string; version_number: number; published_at: string }
      | null;

    const { data: all } = await sb
      .from('scrapbook_versions')
      .select('id')
      .eq('book_id', bookId)
      .order('version_number', { ascending: false });
    for (const stale of (all ?? []).slice(MAX_VERSIONS)) {
      await removeVersionMedia(sb, stale.id as string);
      await sb.from('scrapbook_versions').delete().eq('id', stale.id);
    }

    return {
      id: row?.id ?? versionId,
      versionNumber: Number(row?.version_number ?? 0),
      label: label.trim() || `Version ${row?.version_number ?? ''}`.trim(),
      publishedAt: row?.published_at ? Date.parse(row.published_at as string) : Date.now(),
      pageCount: snapshot.pages.length,
      photoCount: snapshot.photos.length,
      letterCount: snapshot.letters.length,
    };
  },

  async restoreVersion(bookId: string, versionId: string): Promise<ScrapbookDoc> {
    const sb = await getClient();
    const { data, error } = await sb
      .from('scrapbook_versions')
      .select('snapshot_json')
      .eq('id', versionId)
      .eq('book_id', bookId)
      .maybeSingle();
    if (error) fail(error, 'Could not read that version');
    if (!data) throw new Error('That published version could not be found.');
    return data.snapshot_json as ScrapbookDoc;
  },

  async getPublication(bookId: string): Promise<PublishedState | null> {
    const sb = await getClient();
    const { data, error } = await sb
      .from('scrapbook_publication')
      .select('version_id, published_at, scrapbook_versions(version_number, label)')
      .eq('book_id', bookId)
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

  /* -------------------------------------------------------------- profile */

  async loadProfile(): Promise<MakerProfile | null> {
    const sb = await getClient();
    const { data, error } = await sb
      .from('scrapbook_profile')
      .select('profile_json')
      .eq('id', 1)
      .maybeSingle<{ profile_json: MakerProfile | null }>();
    if (error) return null;
    return data?.profile_json ?? null;
  },

  async saveProfile(profile: MakerProfile): Promise<void> {
    const sb = await getClient();
    const { error } = await sb
      .from('scrapbook_profile')
      .upsert(
        { id: 1, profile_json: profile, updated_at: new Date().toISOString() },
        { onConflict: 'id' },
      );
    if (error) fail(error, 'Could not save your profile');
  },

  async loadPublicProfile(): Promise<MakerProfile | null> {
    const sb = await getClient();
    const { data, error } = await sb.rpc('get_maker_profile');
    if (error) return null;
    return (data as MakerProfile | null) ?? null;
  },

  /* ---------------------------------------------------------------- media */

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
    const book = input.bookId ?? 'shared';
    const path = `${draftPrefix(book)}/media/${input.id}.${extensionFor(input.blob.type || input.mimeType)}`;
    const { error } = await sb.storage.from(bucket).upload(path, input.blob, {
      contentType: input.blob.type || input.mimeType,
      upsert: true,
    });
    if (error) fail(error, 'Could not upload the photograph');
    if (input.thumbnail) {
      await sb.storage
        .from(bucket)
        .upload(`${draftPrefix(book)}/thumbs/${input.id}.webp`, input.thumbnail, {
          contentType: 'image/webp',
          upsert: true,
        });
    }
    const map = await signedUrlMap(sb, [path]);
    return { storagePath: path, url: map[path] ?? '' };
  },

  async replacePhotoFile(input: MediaUploadInput): Promise<MediaUploadResult> {
    const sb = await getClient();
    const book = input.bookId ?? 'shared';
    const path =
      input.storagePath ||
      `${draftPrefix(book)}/media/${input.id}.${extensionFor(input.blob.type || input.mimeType)}`;
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
    const book = input.bookId ?? 'shared';
    const path = `${draftPrefix(book)}/assets/${input.id}.${extensionFor(input.blob.type || input.mimeType)}`;
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
