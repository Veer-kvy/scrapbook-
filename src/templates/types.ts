import type {
  BackgroundId,
  Page,
  PageStyle,
  PageTransitionId,
  TemplateCategory,
  TemplateContentType,
  TemplateId,
} from '../types';

export interface TemplateDefinition {
  id: TemplateId;
  name: string;
  tagline: string;
  description: string;
  /** Primary design family, used for the category chips. */
  category: TemplateCategory;
  categories: TemplateCategory[];
  supports: TemplateContentType[];
  version: number;
  accent: string;
  bg: BackgroundId;
  transition: PageTransitionId;
  style: PageStyle;
  build: () => Page;
}

export const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  romantic: 'Romantic',
  vintage: 'Vintage',
  minimal: 'Minimal',
  floral: 'Floral',
  polaroid: 'Polaroid',
  journal: 'Journal',
  collage: 'Collage',
  letter: 'Letter',
  interactive: 'Interactive',
  surprise: 'Surprise',
};

export const CONTENT_LABELS: Record<TemplateContentType, string> = {
  photos: 'Photos',
  captions: 'Captions',
  dates: 'Dates',
  text: 'Text',
  letters: 'Letters',
  hidden: 'Hidden notes',
  buttons: 'Buttons',
  stickers: 'Stickers',
  timeline: 'Timeline',
};
