import { localBackend } from './local';
import { supabaseBackend, supabaseConfigured } from './supabase';
import type { ContentBackend } from './types';

/**
 * Chooses the content store at build time. When Supabase credentials are
 * present the cloud adapter is used; otherwise the scrapbook runs against a
 * local IndexedDB backend so every screen stays functional without a server.
 */
export const backend: ContentBackend = supabaseConfigured ? supabaseBackend : localBackend;
export const backendMode = backend.mode;

export const BACKEND_HINT = supabaseConfigured
  ? 'Connected to Supabase. Sign-in and every write are enforced by Supabase Auth and row-level security.'
  : 'Local development mode. Drafts, versions and photographs live in this browser; the admin passcode is a local gate, not server-side authorization. See README → Backend setup to connect Supabase.';

export type { AuthUser, ContentBackend, PublishedSnapshot } from './types';
export { conflictError } from './types';
