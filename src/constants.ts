import type { PaletteColor } from './types';

export const STORAGE_KEYS = {
  library: 'spectrum-library',
  activePaletteId: 'spectrum-active-palette-id',
} as const;

/** Shadow vs base: informal targets for cel edges and contrast hints */
export const CEL_EDGE_STRONG_RATIO = 3;
export const CEL_EDGE_WEAK_RATIO = 2;

export const COMPACT_MAP_COLUMNS = 12;

export const formatExport = (colors: PaletteColor[]) => colors.map((color) => `#${color.hex}`).join(', ');

export const createPaletteId = () => crypto.randomUUID();

export const sanitizeFileName = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'palette-map';
