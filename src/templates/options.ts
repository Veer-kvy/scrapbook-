import type {
  PageBorder,
  PageEntrance,
  PageHover,
  PageShadow,
  PageTint,
} from '../types';

export const TINT_OPTIONS: { value: PageTint; label: string }[] = [
  { value: 'none', label: 'No wash' },
  { value: 'warm', label: 'Warm afternoon' },
  { value: 'pink', label: 'Soft pink' },
  { value: 'sage', label: 'Sage green' },
  { value: 'sepia', label: 'Sepia' },
  { value: 'night', label: 'Midnight' },
];

export const BORDER_OPTIONS: { value: PageBorder; label: string }[] = [
  { value: 'none', label: 'No border' },
  { value: 'hairline', label: 'Hairline' },
  { value: 'thin', label: 'Thin rule' },
  { value: 'double', label: 'Double rule' },
  { value: 'stitched', label: 'Stitched' },
  { value: 'deckle', label: 'Deckle edge' },
  { value: 'scallop', label: 'Scalloped' },
];

export const SHADOW_OPTIONS: { value: PageShadow; label: string }[] = [
  { value: 'none', label: 'Flat' },
  { value: 'soft', label: 'Soft lift' },
  { value: 'deep', label: 'Deep lift' },
];

export const ENTRANCE_OPTIONS: { value: PageEntrance; label: string }[] = [
  { value: 'none', label: 'No entrance' },
  { value: 'fade', label: 'Fade in' },
  { value: 'rise', label: 'Rise up' },
  { value: 'drift', label: 'Drift in' },
  { value: 'unfold', label: 'Unfold' },
];

export const HOVER_OPTIONS: { value: PageHover; label: string }[] = [
  { value: 'none', label: 'Still' },
  { value: 'lift', label: 'Lift' },
  { value: 'tilt', label: 'Tilt' },
  { value: 'zoom', label: 'Zoom' },
];
