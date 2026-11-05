/** URL-safe slug used for a scrapbook's public link. */
export function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 40)
    .replace(/^-+|-+$/g, '');
  return base || 'scrapbook';
}

export function randomSuffix(length = 4): string {
  const alphabet = 'abcdefghijkmnpqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

/** True when `value` looks like something safe to put in a link. */
export function isValidSlug(value: string): boolean {
  return /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$/.test(value);
}

/** Builds a slug that is not already used by another scrapbook. */
export function uniqueSlug(title: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  const base = slugify(title);
  if (!used.has(base) && base.length >= 3) return base;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = `${base}-${randomSuffix()}`;
    if (!used.has(candidate)) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

/** Absolute link people can open on any device. Works under a Pages subpath. */
export function publicLink(slug: string): string {
  if (typeof window === 'undefined') return `#/s/${slug}`;
  const { origin, pathname } = window.location;
  const base = pathname.endsWith('/') ? pathname : `${pathname}/`;
  return `${origin}${base}#/s/${slug}`;
}

/** Absolute link to the public shelf with every published scrapbook. */
export function shelfLink(): string {
  if (typeof window === 'undefined') return '#/';
  const { origin, pathname } = window.location;
  const base = pathname.endsWith('/') ? pathname : `${pathname}/`;
  return `${origin}${base}#/`;
}
