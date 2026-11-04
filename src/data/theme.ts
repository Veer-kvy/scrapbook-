import type { FontKey, PaletteId, ThemeSettings } from '../types';

export const DEFAULT_THEME: ThemeSettings = {
  palette: 'rose',
  paperTexture: 'paper',
  headingFont: 'display',
  handFont: 'hand',
  bodyFont: 'sans',
  polaroid: 'classic',
  shadow: 'medium',
  buttonStyle: 'pill',
  animation: 'full',
  decorations: true,
};

export const FONT_STACKS: Record<FontKey, string> = {
  display: "'Playfair Display Variable', Georgia, 'Times New Roman', serif",
  serif: "'Cormorant Garamond Variable', Georgia, serif",
  hand: "'Caveat Variable', 'Segoe Print', 'Bradley Hand', cursive",
  sans: "'Inter Variable', ui-sans-serif, system-ui, sans-serif",
};

export const FONT_OPTIONS: { value: FontKey; label: string }[] = [
  { value: 'display', label: 'Playfair' },
  { value: 'serif', label: 'Cormorant' },
  { value: 'hand', label: 'Caveat' },
  { value: 'sans', label: 'Inter' },
];

interface Palette {
  label: string;
  swatch: string;
  rose: string;
  deeprose: string;
  blush: string;
  soft: string;
  peach: string;
  ink: string;
  paper: string;
  parchment: string;
  backdrop: [string, string, string];
}

export const PALETTES: Record<PaletteId, Palette> = {
  rose: {
    label: 'Rose petal',
    swatch: '#c98c9d',
    rose: '#c98c9d',
    deeprose: '#9c6474',
    blush: '#f3c9cf',
    soft: '#f8e7e7',
    peach: '#e8b8a7',
    ink: '#493a40',
    paper: '#fff7e9',
    parchment: '#fbf1df',
    backdrop: ['#f4e3e0', '#f3c9cf', '#e8b8a7'],
  },
  sage: {
    label: 'Pressed sage',
    swatch: '#8fa37c',
    rose: '#8fa37c',
    deeprose: '#5f7352',
    blush: '#cdd8bf',
    soft: '#eef0e6',
    peach: '#c9b79b',
    ink: '#3c4336',
    paper: '#f9f7ec',
    parchment: '#f3f0e2',
    backdrop: ['#eef0e4', '#d7ddc8', '#c9b79b'],
  },
  lavender: {
    label: 'Lavender dusk',
    swatch: '#a28ab5',
    rose: '#a28ab5',
    deeprose: '#6f5b82',
    blush: '#ded0ea',
    soft: '#f3edf8',
    peach: '#cfb6c9',
    ink: '#3f3648',
    paper: '#faf6fb',
    parchment: '#f4edf6',
    backdrop: ['#f0eaf6', '#ded0ea', '#cfb6c9'],
  },
  peach: {
    label: 'Peach linen',
    swatch: '#e0a184',
    rose: '#e0a184',
    deeprose: '#a96b52',
    blush: '#f6d3c1',
    soft: '#fdf0e6',
    peach: '#ecc3ad',
    ink: '#4a3a33',
    paper: '#fff8ef',
    parchment: '#fbf1e3',
    backdrop: ['#fbeee5', '#f6d3c1', '#ecc3ad'],
  },
  ocean: {
    label: 'Sea glass',
    swatch: '#7fa3ad',
    rose: '#7fa3ad',
    deeprose: '#506f7a',
    blush: '#cfe0e3',
    soft: '#eaf3f4',
    peach: '#b9c8b6',
    ink: '#33454b',
    paper: '#f5fafb',
    parchment: '#eef6f7',
    backdrop: ['#e9f2f3', '#cfe0e3', '#b9c8b6'],
  },
};

export function normalizeTheme(input?: Partial<ThemeSettings> | null): ThemeSettings {
  return { ...DEFAULT_THEME, ...(input ?? {}) };
}

export function applyTheme(input?: Partial<ThemeSettings> | null): void {
  if (typeof document === 'undefined') return;
  const theme = normalizeTheme(input);
  const palette = PALETTES[theme.palette] ?? PALETTES.rose;
  const root = document.documentElement;

  root.style.setProperty('--rose', palette.rose);
  root.style.setProperty('--deeprose', palette.deeprose);
  root.style.setProperty('--blush', palette.blush);
  root.style.setProperty('--soft', palette.soft);
  root.style.setProperty('--peach', palette.peach);
  root.style.setProperty('--ink', palette.ink);
  root.style.setProperty('--cream', palette.paper);
  root.style.setProperty('--parchment', palette.parchment);
  root.style.setProperty('--paper-cream', palette.paper);
  root.style.setProperty('--paper-parchment', palette.parchment);
  root.style.setProperty('--paper-soft', palette.soft);
  root.style.setProperty('--paper-blush', palette.soft);
  root.style.setProperty('--backdrop-1', palette.backdrop[0]);
  root.style.setProperty('--backdrop-2', palette.backdrop[1]);
  root.style.setProperty('--backdrop-3', palette.backdrop[2]);

  root.style.setProperty('--font-display', FONT_STACKS[theme.headingFont]);
  root.style.setProperty('--font-hand', FONT_STACKS[theme.handFont]);
  root.style.setProperty('--font-sans', FONT_STACKS[theme.bodyFont]);

  root.dataset.polaroid = theme.polaroid;
  root.dataset.paper = theme.paperTexture;
  root.dataset.shadow = theme.shadow;
  root.dataset.buttons = theme.buttonStyle;
  root.dataset.motion = theme.animation;
  root.dataset.decor = theme.decorations ? 'on' : 'off';
  root.dataset.palette = theme.palette;
}

export function motionIsCalm(theme?: ThemeSettings | null): boolean {
  return theme?.animation === 'calm';
}
