import type {
  BookSummary,
  MakerProfile,
  PublishedBookSummary,
  PublishedState,
  ScrapbookDoc,
  VersionSummary,
} from '../types';

export type BackendMode = 'local' | 'supabase';

export interface AuthUser {
  email: string | null;
  name: string;
}

export interface SignInInput {
  email?: string;
  password?: string;
  passcode?: string;
}

export interface MediaUploadInput {
  id: string;
  /** Scrapbook the media belongs to; used to namespace files in cloud storage. */
  bookId?: string;
  blob: Blob;
  thumbnail?: Blob;
  width: number;
  height: number;
  name: string;
  mimeType: string;
  /** Existing storage path, used when replacing a photo file in place. */
  storagePath?: string;
}

export interface MediaUploadResult {
  url: string;
  blobId?: string;
  storagePath?: string;
}

export interface SaveOptions {
  /** Overwrite even when another writer saved a newer revision. */
  force?: boolean;
  /** The updatedAt revision this edit was based on, for conflict detection. */
  expectedUpdatedAt?: number | null;
}

export interface PublishProgress {
  done: number;
  total: number;
  label: string;
}

export interface PublishedSnapshot {
  doc: ScrapbookDoc;
  publishedAt: number;
  versionId: string;
  versionNumber: number;
  label: string;
}

export interface BookPatch {
  title?: string;
  slug?: string;
  recipient?: string;
}

/**
 * The contract every content store implements. The local adapter persists to
 * IndexedDB; the Supabase adapter persists to Postgres + Storage and enforces
 * authorization with signed-in sessions and RLS.
 *
 * Every book-scoped call takes an explicit `bookId`, so several scrapbooks can
 * live side by side and each gets its own public link.
 */
export interface ContentBackend {
  mode: BackendMode;
  label: string;
  /** Short, honest description of where content lives right now. */
  storageNote: string;

  init(): Promise<void>;
  getUser(): Promise<AuthUser | null>;
  signIn(input: SignInInput): Promise<AuthUser>;
  signOut(): Promise<void>;
  onAuthChange(listener: (user: AuthUser | null) => void): () => void;
  /** True when the backend has no administrator configured yet (local first run). */
  requiresSetup?(): Promise<boolean>;
  /** Creates the very first administrator (local passcode). */
  setup?(input: SignInInput): Promise<AuthUser>;
  /** Local passcode only; cloud accounts change the password in Supabase. */
  changePasscode?(newPass: string): Promise<void>;

  listBooks(): Promise<BookSummary[]>;
  createBook(title: string): Promise<BookSummary>;
  duplicateBook(bookId: string): Promise<BookSummary>;
  updateBook(bookId: string, patch: BookPatch): Promise<BookSummary>;
  deleteBook(bookId: string): Promise<void>;

  loadDraft(bookId: string): Promise<ScrapbookDoc | null>;
  saveDraft(bookId: string, doc: ScrapbookDoc, options?: SaveOptions): Promise<{ updatedAt: number }>;

  loadPublished(bookId: string): Promise<PublishedSnapshot | null>;
  findPublishedBySlug(slug: string): Promise<PublishedSnapshot | null>;
  listPublishedBooks(): Promise<PublishedBookSummary[]>;
  listVersions(bookId: string): Promise<VersionSummary[]>;
  publish(
    bookId: string,
    doc: ScrapbookDoc,
    label: string,
    onProgress?: (progress: PublishProgress) => void,
  ): Promise<VersionSummary>;
  restoreVersion(bookId: string, versionId: string): Promise<ScrapbookDoc>;
  getPublication(bookId: string): Promise<PublishedState | null>;

  loadProfile(): Promise<MakerProfile | null>;
  saveProfile(profile: MakerProfile): Promise<void>;
  /** Profile as shown on the public shelf, readable without signing in. */
  loadPublicProfile?(): Promise<MakerProfile | null>;

  resolveMedia(doc: ScrapbookDoc): Promise<Record<string, string>>;
  uploadPhoto(input: MediaUploadInput): Promise<MediaUploadResult>;
  replacePhotoFile(input: MediaUploadInput): Promise<MediaUploadResult>;
  deletePhoto(photo: { id: string; blobId?: string; storagePath?: string }): Promise<void>;
  uploadAsset(input: MediaUploadInput): Promise<MediaUploadResult>;
  deleteAsset(asset: { id: string; blobId?: string; storagePath?: string }): Promise<void>;
}

export type BackendConflictError = Error & { code: 'conflict' };

export function conflictError(message: string): BackendConflictError {
  const error = new Error(message) as BackendConflictError;
  error.code = 'conflict';
  return error;
}
