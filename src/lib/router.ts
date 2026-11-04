export function readHash(): string {
  if (typeof window === 'undefined') return '/';
  const raw = window.location.hash.replace(/^#/, '');
  if (!raw) return '/';
  const path = raw.split('?')[0];
  return path.startsWith('/') ? path : `/${path}`;
}

export function navigate(path: string, replace = false) {
  if (typeof window === 'undefined') return;
  const next = path.startsWith('/') ? path : `/${path}`;
  if (readHash() === next) return;
  if (replace) {
    window.history.replaceState(null, '', `#${next}`);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    return;
  }
  window.location.hash = next;
}

export function isAdminRoute(path: string): boolean {
  return path === '/admin' || path.startsWith('/admin/');
}
