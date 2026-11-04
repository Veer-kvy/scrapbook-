/**
 * Cloud sync is optional. Without Supabase credentials the scrapbook runs
 * fully locally (IndexedDB). See README → "Cloud sync" for the schema,
 * policies and the two environment variables needed to enable it.
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const cloudConfig = {
  url: url?.trim() || '',
  anonKey: anonKey?.trim() || '',
};

export const cloudConfigured = Boolean(cloudConfig.url && cloudConfig.anonKey);

export const CLOUD_SETUP_HINT =
  'This keepsake is saved on this device. Cloud sync is not included in this build; a production deployment needs a backend such as Supabase with private storage, row-level security and server-side passcode checks — see the README.';
