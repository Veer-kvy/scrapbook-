/**
 * Local-only admin gate used when no Supabase project is configured.
 * Passcodes are stored as a one-way hash. This protects a single-device
 * keepsake from casual access; it is NOT a substitute for server-side
 * authorization — see README → "Backend setup".
 */
export async function hashPasscode(passcode: string): Promise<string> {
  const input = `kabbu-scrapbook::${passcode.trim()}`;
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const data = new TextEncoder().encode(input);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  // crypto.subtle needs a secure context; fall back for plain-HTTP LAN previews.
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < input.length; i++) {
    h1 = Math.imul(h1 ^ input.charCodeAt(i), 0x01000193);
    h2 = Math.imul(h2 ^ input.charCodeAt(input.length - 1 - i), 0x85ebca6b);
  }
  return `fnv-${(h1 >>> 0).toString(16)}${(h2 >>> 0).toString(16)}`;
}

const SESSION_KEY = 'kabbu-admin-session';

export function hasAdminSession(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

export function startAdminSession(): void {
  try {
    sessionStorage.setItem(SESSION_KEY, '1');
  } catch {
    /* storage may be unavailable */
  }
}

export function endAdminSession(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* no-op */
  }
}
