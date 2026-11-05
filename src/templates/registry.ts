import type {
  CustomTemplate,
  Page,
  PageStyle,
  PhotoElement,
  ScrapbookElement,
  TemplateCategory,
  TemplateId,
} from '../types';
import { TEMPLATE_LABELS } from '../data/factories';
import { uid } from '../lib/utils';
import { BUILTIN_TEMPLATES } from './definitions';
import { CATEGORY_LABELS, type TemplateDefinition } from './types';

export const TEMPLATE_CATEGORIES = Object.keys(CATEGORY_LABELS) as TemplateCategory[];

export const NEUTRAL_STYLE: PageStyle = {
  accent: '#C98C9D',
  tint: 'none',
  border: 'none',
  shadow: 'none',
  entrance: 'none',
  hover: 'none',
  decor: false,
};

export function getTemplate(id: TemplateId): TemplateDefinition | undefined {
  return BUILTIN_TEMPLATES.find((template) => template.id === id);
}

export function isLibraryTemplate(id: TemplateId): boolean {
  return Boolean(getTemplate(id));
}

/** Style for any page, including pages saved before templates had styles. */
export function pageStyle(page: Page): PageStyle {
  if (page.style) return page.style;
  return getTemplate(page.template)?.style ?? NEUTRAL_STYLE;
}

export function templateDisplayName(page: Page, customTemplates?: CustomTemplate[]): string {
  if (page.template === 'custom') {
    const saved = page.customTemplateId
      ? customTemplates?.find((template) => template.id === page.customTemplateId)
      : undefined;
    return page.templateName || saved?.name || 'My template';
  }
  return TEMPLATE_LABELS[page.template] ?? 'Custom layout';
}

export function cloneElements(elements: ScrapbookElement[]): ScrapbookElement[] {
  return elements.map((element) => {
    const copy = {
      ...structuredClone(element),
      id: uid(element.kind.slice(0, 3) + '-'),
    } as ScrapbookElement;
    if (copy.kind === 'photo') copy.crop = { ...copy.crop };
    return copy;
  });
}

export function buildPageFromTemplate(id: TemplateId, name?: string): Page | null {
  const definition = getTemplate(id);
  if (!definition) return null;
  const page = definition.build();
  return name?.trim() ? { ...page, name: name.trim() } : page;
}

/** Same template, with library photographs dropped into its slots for a live preview. */
export function previewPageFromTemplate(id: TemplateId, photoIds: string[]): Page | null {
  const page = buildPageFromTemplate(id);
  if (!page) return null;
  let next = 0;
  return {
    ...page,
    elements: page.elements.map((element) => {
      if (element.kind !== 'photo') return element;
      const photoId = photoIds[next % Math.max(photoIds.length, 1)];
      next += 1;
      return photoIds.length > 0 ? { ...element, photoId } : element;
    }),
  };
}

interface PreviousPhoto {
  photoId: string;
  caption: string;
  date: string;
}

function previousPhotos(page: Page): PreviousPhoto[] {
  return page.elements
    .filter((element): element is PhotoElement => element.kind === 'photo')
    .map((element) => ({
      photoId: element.photoId,
      caption: element.caption,
      date: element.date,
    }))
    .filter((photo) => Boolean(photo.photoId));
}

function withPhotos(page: Page, photos: PreviousPhoto[], keepPhotos: boolean): Page {
  if (!keepPhotos || photos.length === 0) return page;
  let index = 0;
  return {
    ...page,
    elements: page.elements.map((element) => {
      if (element.kind !== 'photo' || index >= photos.length) return element;
      const old = photos[index];
      index += 1;
      return {
        ...element,
        photoId: old.photoId,
        caption: old.caption || element.caption,
        date: old.date || element.date,
      };
    }),
  };
}

/**
 * Swap a page's design while keeping its name and (by default) its photographs.
 * The page id stays the same so links, buttons and history keep pointing at it.
 */
export function applyTemplateToPage(
  page: Page,
  templatePage: Page,
  options: { keepPhotos?: boolean; customName?: string } = {},
): Page {
  const keepPhotos = options.keepPhotos ?? true;
  const next = withPhotos(
    { ...templatePage, id: page.id, name: page.name },
    previousPhotos(page),
    keepPhotos,
  );
  return {
    ...next,
    id: page.id,
    name: page.name,
    templateName: options.customName,
    customTemplateId: undefined,
    elements: cloneElements(next.elements),
  };
}

export function pageFromCustomTemplate(
  template: CustomTemplate,
  page?: { id: string; name: string },
): Page {
  return {
    id: page?.id ?? uid('page-'),
    name: page?.name ?? template.name,
    template: 'custom',
    templateName: template.name,
    customTemplateId: template.id,
    bg: template.bg,
    transition: template.transition,
    style: { ...template.style },
    elements: cloneElements(template.elements),
  };
}

export function applyCustomTemplateToPage(
  page: Page,
  template: CustomTemplate,
  options: { keepPhotos?: boolean } = {},
): Page {
  const built = pageFromCustomTemplate(template, { id: page.id, name: page.name });
  return withPhotos(built, previousPhotos(page), options.keepPhotos ?? true);
}

export function pageToCustomTemplate(
  page: Page,
  input: { name: string; description?: string },
  id?: string,
): CustomTemplate {
  const now = Date.now();
  return {
    id: id ?? uid('tpl-'),
    name: input.name.trim() || `${page.name} template`,
    description: input.description?.trim() ?? '',
    version: 1,
    bg: page.bg,
    transition: page.transition ?? 'turn',
    style: { ...pageStyle(page) },
    elements: cloneElements(page.elements),
    createdAt: now,
    updatedAt: now,
  };
}

/** Templates that fit the search box and the active category chip. */
export function filterTemplates(
  templates: TemplateDefinition[],
  query: string,
  category: TemplateCategory | 'all',
): TemplateDefinition[] {
  const needle = query.trim().toLowerCase();
  return templates.filter((template) => {
    if (category !== 'all' && !template.categories.includes(category)) return false;
    if (!needle) return true;
    const haystack = [template.name, template.tagline, template.description, ...template.categories]
      .join(' ')
      .toLowerCase();
    return haystack.includes(needle);
  });
}
