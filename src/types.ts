export type FontKey = 'display' | 'serif' | 'hand' | 'sans';

export type StickerId =
  | 'heart'
  | 'heartOutline'
  | 'daisy'
  | 'rose'
  | 'tulip'
  | 'butterfly'
  | 'star'
  | 'sparkle'
  | 'bow'
  | 'stamp'
  | 'clip'
  | 'arrow'
  | 'cloud'
  | 'sun'
  | 'moon'
  | 'strawberry'
  | 'smiley'
  | 'leaf'
  | 'envelope'
  | 'crown'
  | 'washiRose'
  | 'washiGingham'
  | 'washiBlue'
  | 'washiCream';

export type FrameStyle = 'classic' | 'cream' | 'taped' | 'rounded' | 'bare';

export type Tone = 'rose' | 'cream' | 'sage' | 'peach';

export type PaletteId = 'rose' | 'sage' | 'lavender' | 'peach' | 'ocean';

export type PageTransitionId = 'turn' | 'fade' | 'slide' | 'none';

export type InteractionType =
  | 'none'
  | 'flip'
  | 'open-letter'
  | 'bloom'
  | 'surprise'
  | 'show-note'
  | 'go-to-page';

export interface ElementInteraction {
  type: InteractionType;
  /** Note, toast or back-of-photo message depending on the element. */
  message?: string;
  letterId?: string;
  targetPageId?: string;
  animation?: 'flip' | 'unfold' | 'bloom' | 'pop' | 'pulse';
}

export type TemplateId =
  | 'welcome'
  | 'moments'
  | 'memories'
  | 'letters'
  | 'openwhen'
  | 'littlethings'
  | 'final'
  | 'blank';

export type BackgroundId =
  | 'cream'
  | 'blush'
  | 'dots'
  | 'grid'
  | 'sprinkle'
  | 'linen'
  | 'ombre';

interface ElementBase {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rot: number;
  z: number;
  locked?: boolean;
  opacity?: number;
  interaction?: ElementInteraction;
}

export interface PhotoElement extends ElementBase {
  kind: 'photo';
  photoId: string;
  frame: FrameStyle;
  caption: string;
  date: string;
  crop: { zoom: number; x: number; y: number };
  imageRotate: number;
}

export interface TextElement extends ElementBase {
  kind: 'text';
  text: string;
  font: FontKey;
  size: number;
  color: string;
  align: 'left' | 'center' | 'right';
  style: 'plain' | 'highlight' | 'underline';
  lineHeight: number;
}

export interface StickerElement extends ElementBase {
  kind: 'sticker';
  sticker: StickerId;
}

export interface EnvelopeElement extends ElementBase {
  kind: 'envelope';
  title: string;
  note: string;
  tone: Tone;
  letterId?: string;
}

export interface HiddenElement extends ElementBase {
  kind: 'hidden';
  prompt: string;
  note: string;
  sticker: StickerId;
}

export interface ButtonElement extends ElementBase {
  kind: 'button';
  label: string;
  tone: Tone;
  style: 'pill' | 'rounded' | 'square' | 'outline' | 'soft';
}

export interface CustomAssetElement extends ElementBase {
  kind: 'custom';
  assetId: string;
}

export type ScrapbookElement =
  | PhotoElement
  | TextElement
  | StickerElement
  | EnvelopeElement
  | HiddenElement
  | ButtonElement
  | CustomAssetElement;

export interface Page {
  id: string;
  name: string;
  template: TemplateId;
  bg: BackgroundId;
  transition?: PageTransitionId;
  elements: ScrapbookElement[];
}

export interface Album {
  id: string;
  name: string;
}

export interface PhotoMeta {
  id: string;
  albumId: string | null;
  name: string;
  caption: string;
  date: string;
  createdAt: number;
  width: number;
  height: number;
  /** blob stored in IndexedDB (local backend) */
  blobId?: string;
  /** object path inside the Supabase storage bucket */
  storagePath?: string;
  mimeType?: string;
  fileSize?: number;
  /** static seed asset */
  src?: string;
}

export interface CustomAsset {
  id: string;
  name: string;
  format: 'png' | 'svg';
  width: number;
  height: number;
  createdAt: number;
  blobId?: string;
  storagePath?: string;
}

export type LetterCategory = 'bored' | 'smile' | 'encouragement' | 'surprise' | 'custom';

export interface Letter {
  id: string;
  title: string;
  category: LetterCategory;
  customCategory: string;
  body: string;
  font: FontKey;
  inkColor: string;
  fontSize: number;
  paper: 'lined' | 'plain' | 'floral' | 'kraft';
  envelope: Tone;
  animation: 'unfold' | 'fade' | 'slide';
  hiddenMessage: string;
  createdAt: number;
  updatedAt: number;
}

export interface ThemeSettings {
  palette: PaletteId;
  paperTexture: 'paper' | 'linen' | 'grain' | 'plain';
  headingFont: FontKey;
  handFont: FontKey;
  bodyFont: FontKey;
  polaroid: 'classic' | 'soft' | 'retro' | 'clean';
  shadow: 'soft' | 'medium' | 'deep' | 'none';
  buttonStyle: 'pill' | 'rounded' | 'square';
  animation: 'full' | 'gentle' | 'calm';
  decorations: boolean;
}

export interface ScrapbookMeta {
  title: string;
  subtitle: string;
  recipient: string;
  sender: string;
  welcomeNote: string;
  coverNote: string;
  passHash: string;
  passHint: string;
}

export interface ScrapbookSettings {
  volume: number;
  music: boolean;
  sfx: boolean;
}

export interface ScrapbookDoc {
  version: number;
  meta: ScrapbookMeta;
  pages: Page[];
  albums: Album[];
  photos: PhotoMeta[];
  letters: Letter[];
  customAssets: CustomAsset[];
  theme: ThemeSettings;
  settings: ScrapbookSettings;
  updatedAt: number;
}

export interface VersionSummary {
  id: string;
  versionNumber: number;
  label: string;
  publishedAt: number;
  pageCount: number;
  photoCount: number;
  letterCount: number;
}

export interface PublishedState {
  versionId: string;
  versionNumber: number;
  publishedAt: number;
  label: string;
}

export interface StoredVersion extends VersionSummary {
  doc: ScrapbookDoc;
}

export interface CloudConfig {
  configured: boolean;
  url?: string;
}
