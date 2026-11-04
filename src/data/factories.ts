import type {
  BackgroundId,
  ButtonElement,
  CustomAssetElement,
  EnvelopeElement,
  HiddenElement,
  Letter,
  LetterCategory,
  Page,
  PageTransitionId,
  PhotoElement,
  StickerElement,
  StickerId,
  TemplateId,
  TextElement,
  Tone,
} from '../types';
import { uid } from '../lib/utils';

export const WASHI: StickerId[] = ['washiRose', 'washiGingham', 'washiBlue', 'washiCream'];

export function stickerAspect(sticker: StickerId): number {
  return WASHI.includes(sticker) ? 0.3 : 1;
}

type Opt<T> = Partial<T>;

export function makeText(
  text: string,
  opts: Opt<TextElement> & { x: number; y: number },
): TextElement {
  return {
    id: uid('txt-'),
    kind: 'text',
    w: 60,
    h: 10,
    rot: 0,
    z: 1,
    font: 'serif',
    size: 4,
    color: '#493A40',
    align: 'left',
    style: 'plain',
    lineHeight: 1.25,
    ...opts,
    text,
  };
}

export function makePhoto(
  photoId: string,
  opts: Opt<PhotoElement> & { x: number; y: number },
): PhotoElement {
  return {
    id: uid('pho-'),
    kind: 'photo',
    w: 40,
    h: (opts.w ?? 40) * 0.9,
    rot: 0,
    z: 1,
    frame: 'classic',
    caption: '',
    date: '',
    crop: { zoom: 1, x: 0, y: 0 },
    imageRotate: 0,
    photoId,
    ...opts,
  };
}

export function makeSticker(
  sticker: StickerId,
  opts: Opt<StickerElement> & { x: number; y: number },
): StickerElement {
  const w = opts.w ?? 10;
  return {
    id: uid('stk-'),
    kind: 'sticker',
    w,
    h: opts.h ?? w * stickerAspect(sticker),
    rot: 0,
    z: 1,
    sticker,
    ...opts,
  };
}

export function makeEnvelope(
  title: string,
  note: string,
  tone: Tone,
  opts: Opt<EnvelopeElement> & { x: number; y: number },
): EnvelopeElement {
  const w = opts.w ?? 38;
  return {
    id: uid('env-'),
    kind: 'envelope',
    w,
    h: opts.h ?? w * 0.66,
    rot: 0,
    z: 1,
    title,
    note,
    tone,
    ...opts,
  };
}

export function makeHidden(
  prompt: string,
  note: string,
  sticker: StickerId,
  opts: Opt<HiddenElement> & { x: number; y: number },
): HiddenElement {
  const w = opts.w ?? 10;
  return {
    id: uid('hid-'),
    kind: 'hidden',
    w,
    h: opts.h ?? w,
    rot: 0,
    z: 1,
    prompt,
    note,
    sticker,
    ...opts,
  };
}

export const TEMPLATE_LABELS: Record<TemplateId, string> = {
  welcome: 'Welcome',
  moments: 'Little Moments',
  memories: 'Memories',
  letters: 'Letters',
  openwhen: 'Open When',
  littlethings: 'Little Things',
  final: 'Final Surprise',
  blank: 'Blank Page',
};

export const TRANSITION_OPTIONS: { value: PageTransitionId; label: string; hint: string }[] = [
  { value: 'turn', label: 'Page turn', hint: 'A physical 3D page flip.' },
  { value: 'fade', label: 'Fade', hint: 'Soft cross-fade between pages.' },
  { value: 'slide', label: 'Slide', hint: 'Pages glide sideways.' },
  { value: 'none', label: 'Instant', hint: 'No transition at all.' },
];

export const LETTER_CATEGORIES: { value: LetterCategory; label: string }[] = [
  { value: 'bored', label: 'Open when bored' },
  { value: 'smile', label: 'Open when you need a smile' },
  { value: 'encouragement', label: 'Open when you need encouragement' },
  { value: 'surprise', label: 'A little surprise' },
  { value: 'custom', label: 'Custom category' },
];

export const LETTER_PAPERS: { value: Letter['paper']; label: string }[] = [
  { value: 'lined', label: 'Lined paper' },
  { value: 'plain', label: 'Plain paper' },
  { value: 'floral', label: 'Floral paper' },
  { value: 'kraft', label: 'Kraft paper' },
];

export function makeButton(
  label: string,
  opts: Opt<ButtonElement> & { x: number; y: number },
): ButtonElement {
  return {
    id: uid('btn-'),
    kind: 'button',
    w: 34,
    h: 7,
    rot: 0,
    z: 1,
    label,
    tone: 'rose',
    style: 'pill',
    ...opts,
  };
}

export function makeCustomAsset(
  assetId: string,
  opts: Opt<CustomAssetElement> & { x: number; y: number },
): CustomAssetElement {
  const w = opts.w ?? 14;
  return {
    id: uid('cst-'),
    kind: 'custom',
    w,
    h: opts.h ?? w,
    rot: 0,
    z: 1,
    assetId,
    ...opts,
  };
}

export function makeLetter(opts: Partial<Letter> = {}): Letter {
  const now = Date.now();
  return {
    id: uid('letter-'),
    title: 'A letter for you',
    category: 'custom',
    customCategory: '',
    body: 'Write the thing you want them to read on the day they need it.',
    font: 'hand',
    inkColor: '#493A40',
    fontSize: 5,
    paper: 'lined',
    envelope: 'rose',
    animation: 'unfold',
    hiddenMessage: '',
    createdAt: now,
    updatedAt: now,
    ...opts,
  };
}

export const TEMPLATE_BG: Record<TemplateId, BackgroundId> = {
  welcome: 'cream',
  moments: 'blush',
  memories: 'dots',
  letters: 'linen',
  openwhen: 'cream',
  littlethings: 'sprinkle',
  final: 'ombre',
  blank: 'cream',
};

export const BACKGROUNDS: { id: BackgroundId; label: string }[] = [
  { id: 'cream', label: 'Cream paper' },
  { id: 'blush', label: 'Blush paper' },
  { id: 'dots', label: 'Pin dots' },
  { id: 'grid', label: 'Notebook grid' },
  { id: 'sprinkle', label: 'Sprinkles' },
  { id: 'linen', label: 'Linen' },
  { id: 'ombre', label: 'Soft ombre' },
];

export const TEMPLATE_GUIDE: Record<TemplateId, string> = {
  welcome: 'A soft opening note with a photo and a handwritten hello.',
  moments: 'A scattered collage of polaroids, dates and washi tape.',
  memories: 'A larger, editorial photo layout with a quote.',
  letters: 'Envelopes that open into handwritten letters.',
  openwhen: 'Four “open when…” envelopes for different moods.',
  littlethings: 'Tiny facts, notes and hidden surprises.',
  final: 'A quiet closing page with one last secret.',
  blank: 'An empty page — add photos, text and stickers.',
};

export function buildTemplatePage(template: TemplateId, name?: string): Page {
  const id = uid('page-');
  const base = {
    id,
    name: name ?? TEMPLATE_LABELS[template],
    template,
    bg: TEMPLATE_BG[template],
    transition: 'turn' as PageTransitionId,
  };
  const z = (n: number) => n;

  switch (template) {
    case 'welcome':
      return {
        ...base,
        elements: [
          makeText('Hey, you', {
            x: 7,
            y: 9,
            w: 84,
            h: 15,
            font: 'display',
            size: 11,
            z: z(3),
          }),
          makeText('a new little chapter', {
            x: 9,
            y: 23,
            w: 70,
            h: 8,
            font: 'hand',
            size: 5.6,
            color: '#9C6474',
            rot: -2,
            z: z(3),
          }),
          makeText('Paste a favourite photo here, then write why it matters.', {
            x: 12,
            y: 48,
            w: 54,
            h: 18,
            font: 'hand',
            size: 4.6,
            color: '#9C6474',
            lineHeight: 1.35,
            z: z(3),
          }),
          makeSticker('washiCream', { x: 10, y: 33, w: 28, h: 6.4, rot: -14, z: z(5) }),
          makeSticker('heart', { x: 78, y: 40, w: 12, rot: 12, z: z(4) }),
          makeSticker('daisy', { x: 64, y: 70, w: 14, rot: -8, z: z(4) }),
          makeSticker('sparkle', { x: 42, y: 82, w: 8, z: z(4) }),
        ],
      };
    case 'moments':
      return {
        ...base,
        elements: [
          makeText('Little Moments', {
            x: 6,
            y: 4,
            w: 88,
            h: 10,
            font: 'display',
            size: 9,
            z: z(4),
          }),
          makeText('the ones I replay on loop', {
            x: 7,
            y: 13,
            w: 80,
            h: 7,
            font: 'hand',
            size: 4.8,
            color: '#9C6474',
            rot: -1,
            z: z(4),
          }),
          makeText('14 feb · golden hour', {
            x: 8,
            y: 64,
            w: 40,
            h: 6,
            font: 'hand',
            size: 3.6,
            color: '#C98C9D',
            rot: -3,
            z: z(4),
          }),
          makeSticker('washiRose', { x: 58, y: 18, w: 28, h: 6, rot: 8, z: z(6) }),
          makeSticker('star', { x: 86, y: 12, w: 9, rot: 8, z: z(5) }),
          makeSticker('arrow', { x: 72, y: 52, w: 11, rot: 22, z: z(5) }),
          makeSticker('heartOutline', { x: 12, y: 72, w: 8, rot: -10, z: z(5) }),
          makeText('proof that ordinary days can sparkle', {
            x: 8,
            y: 87,
            w: 84,
            h: 8,
            font: 'hand',
            size: 4.4,
            color: '#9C6474',
            align: 'center',
            rot: -1,
            z: z(4),
          }),
        ],
      };
    case 'memories':
      return {
        ...base,
        elements: [
          makeText('Memories', { x: 6, y: 4, w: 60, h: 10, font: 'display', size: 9, z: z(4) }),
          makeText('collected, not posed', {
            x: 7,
            y: 14,
            w: 60,
            h: 7,
            font: 'hand',
            size: 4.4,
            color: '#9C6474',
            z: z(4),
          }),
          makeText('some days just feel like home.', {
            x: 6,
            y: 78,
            w: 88,
            h: 12,
            font: 'hand',
            size: 6,
            color: '#9C6474',
            align: 'center',
            rot: -1,
            z: z(5),
          }),
          makeSticker('washiCream', { x: 48, y: 68, w: 22, h: 5.5, rot: -12, z: z(6) }),
          makeSticker('sparkle', { x: 88, y: 34, w: 8, z: z(5) }),
          makeSticker('leaf', { x: 7, y: 84, w: 9, rot: -18, z: z(5) }),
          makeSticker('stamp', { x: 66, y: 84, w: 10, rot: 8, z: z(5) }),
          makeSticker('heart', { x: 15, y: 22, w: 8, rot: 14, z: z(5) }),
        ],
      };
    case 'letters':
      return {
        ...base,
        elements: [
          makeText('Letters', { x: 6, y: 4, w: 88, h: 10, font: 'display', size: 9.5, z: z(4) }),
          makeText("words I couldn't say out loud", {
            x: 7,
            y: 13,
            w: 85,
            h: 7,
            font: 'hand',
            size: 4.6,
            color: '#9C6474',
            z: z(4),
          }),
          makeEnvelope('for you', 'Write the thing you never say out loud. It belongs here.', 'rose', {
            x: 7,
            y: 32,
            w: 40,
            rot: -3,
            z: z(3),
          }),
          makeEnvelope('one more thing', 'A second letter for a rainy day.', 'cream', {
            x: 51,
            y: 48,
            w: 40,
            rot: 4,
            z: z(4),
          }),
          makeText('open me ↗', {
            x: 26,
            y: 62,
            w: 22,
            h: 6,
            font: 'hand',
            size: 4.2,
            color: '#C98C9D',
            rot: -8,
            z: z(5),
          }),
          makeSticker('stamp', { x: 79, y: 26, w: 11, rot: 10, z: z(6) }),
          makeSticker('clip', { x: 15, y: 27, w: 8, rot: -15, z: z(6) }),
          makeSticker('washiGingham', { x: 58, y: 80, w: 24, h: 5, rot: 6, z: z(5) }),
          makeText('saved for the days you need them', {
            x: 10,
            y: 86,
            w: 80,
            h: 7,
            font: 'hand',
            size: 4.4,
            color: '#C98C9D',
            align: 'center',
            rot: -1,
            z: z(4),
          }),
        ],
      };
    case 'openwhen':
      return {
        ...base,
        elements: [
          makeText('Open When...', { x: 6, y: 3.5, w: 88, h: 10, font: 'display', size: 9, z: z(4) }),
          makeText('little envelopes for big feelings', {
            x: 7,
            y: 12,
            w: 80,
            h: 7,
            font: 'hand',
            size: 4.4,
            color: '#9C6474',
            z: z(4),
          }),
          makeEnvelope("open when you're bored", 'Write a tiny game, a memory, or a dare here.', 'peach', {
            x: 7,
            y: 22,
            w: 37,
            rot: -3,
            z: z(3),
          }),
          makeEnvelope('open when you need a smile', 'A memory that always makes you laugh.', 'rose', {
            x: 54,
            y: 26,
            w: 37,
            rot: 4,
            z: z(4),
          }),
          makeEnvelope('open when you need encouragement', 'Words for a hard day.', 'sage', {
            x: 9,
            y: 54,
            w: 37,
            rot: 3,
            z: z(3),
          }),
          makeEnvelope('open when you want a surprise', 'A little secret, just for you.', 'cream', {
            x: 52,
            y: 58,
            w: 37,
            rot: -4,
            z: z(4),
          }),
          makeSticker('heart', { x: 44, y: 46, w: 10, rot: 12, z: z(5) }),
          makeSticker('star', { x: 47, y: 83, w: 9, z: z(5) }),
          makeText('choose one. no rules.', {
            x: 68,
            y: 86,
            w: 26,
            h: 7,
            font: 'hand',
            size: 4,
            color: '#C98C9D',
            rot: 6,
            z: z(5),
          }),
        ],
      };
    case 'littlethings':
      return {
        ...base,
        elements: [
          makeText('Little Things', { x: 6, y: 4, w: 88, h: 10, font: 'display', size: 9, z: z(4) }),
          makeText('about you, in no particular order', {
            x: 7,
            y: 12,
            w: 80,
            h: 7,
            font: 'hand',
            size: 4.2,
            color: '#9C6474',
            z: z(4),
          }),
          makeText(
            '01  you hum when you are happy\n02  you always share the last bite\n03  your laugh has a hiccup in it\n04  you keep every little ticket',
            {
              x: 8,
              y: 21,
              w: 52,
              h: 40,
              font: 'hand',
              size: 4.3,
              color: '#493A40',
              lineHeight: 1.9,
              z: z(4),
            },
          ),
          makeHidden('psst', 'A hidden note goes here. Tap it in viewing mode.', 'heart', {
            x: 9,
            y: 63,
            w: 10,
            rot: -6,
            z: z(5),
          }),
          makeHidden('open me', 'Another tiny secret. Only the reader finds it.', 'daisy', {
            x: 26,
            y: 66,
            w: 9,
            rot: 8,
            z: z(5),
          }),
          makeHidden('one more', 'A third hidden note. Make it something only they would know.', 'strawberry', {
            x: 43,
            y: 62,
            w: 9,
            rot: -4,
            z: z(5),
          }),
          makeSticker('clip', { x: 88, y: 14, w: 8, rot: 12, z: z(5) }),
          makeSticker('arrow', { x: 60, y: 56, w: 10, rot: 40, z: z(5) }),
          makeText('and a hundred more I am still collecting.', {
            x: 10,
            y: 83,
            w: 80,
            h: 8,
            font: 'hand',
            size: 5,
            color: '#9C6474',
            align: 'center',
            rot: -1,
            z: z(4),
          }),
        ],
      };
    case 'final':
      return {
        ...base,
        elements: [
          makeSticker('daisy', { x: 7, y: 10, w: 16, rot: -10, z: z(3) }),
          makeSticker('tulip', { x: 78, y: 8, w: 14, rot: 10, z: z(3) }),
          makeSticker('rose', { x: 82, y: 70, w: 14, rot: -6, z: z(3) }),
          makeSticker('leaf', { x: 6, y: 72, w: 12, rot: 15, z: z(3) }),
          makeSticker('sparkle', { x: 20, y: 30, w: 7, z: z(4) }),
          makeSticker('star', { x: 76, y: 30, w: 7, z: z(4) }),
          makeSticker('butterfly', { x: 70, y: 78, w: 11, rot: -10, z: z(4) }),
          makeText('the last page', {
            x: 30,
            y: 8,
            w: 40,
            h: 5,
            font: 'sans',
            size: 2.4,
            color: '#C98C9D',
            align: 'center',
            z: z(4),
          }),
          makeText('If you reached this page, you found every little secret.', {
            x: 10,
            y: 20,
            w: 80,
            h: 10,
            font: 'hand',
            size: 4.8,
            color: '#9C6474',
            align: 'center',
            rot: -1,
            z: z(4),
          }),
          makeText("I'd choose you.\nIn every life.\nIn every little universe.", {
            x: 8,
            y: 32,
            w: 84,
            h: 32,
            font: 'display',
            size: 8,
            color: '#493A40',
            align: 'center',
            lineHeight: 1.2,
            z: z(4),
          }),
          makeText('— always, me', {
            x: 55,
            y: 64,
            w: 32,
            h: 7,
            font: 'hand',
            size: 4.6,
            color: '#C98C9D',
            align: 'right',
            rot: -3,
            z: z(4),
          }),
          makeHidden('tap the heart', 'Replace this with your final surprise.', 'heart', {
            x: 44,
            y: 72,
            w: 12,
            rot: 0,
            z: z(6),
          }),
          makeText('tap the heart', {
            x: 38,
            y: 86,
            w: 24,
            h: 5,
            font: 'hand',
            size: 3.4,
            color: '#C98C9D',
            align: 'center',
            z: z(4),
          }),
        ],
      };
    default:
      return { ...base, elements: [] };
  }
}
