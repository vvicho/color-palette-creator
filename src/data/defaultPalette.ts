import type { SavedPalette } from '../types';
import { sanitizeFileName } from '../constants';
import { getCachedColorName } from '../services/colorApi';
import { parseHexInput } from '../utils/hexParser';

const paletteFiles = import.meta.glob('./palettes/*.txt', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const PALETTE_UPDATED_AT = '2026-04-14T00:00:00.000Z';

const getPaletteNameFromPath = (path: string) =>
  path
    .split('/')
    .pop()
    ?.replace(/\.txt$/i, '')
    .trim() || 'Built-in Palette';

const getPaletteIdFromPath = (path: string) => `built-in-${sanitizeFileName(path.replace(/^\.\/palettes\//, ''))}`;

export const BUILT_IN_PALETTES: SavedPalette[] = Object.entries(paletteFiles)
  .sort(([leftPath], [rightPath]) => leftPath.localeCompare(rightPath))
  .map(([path, sourceText]) => {
    const name = getPaletteNameFromPath(path);
    return {
      id: getPaletteIdFromPath(path),
      name,
      colors: parseHexInput(sourceText).map((hex) => ({
        hex,
        name: getCachedColorName(hex) ?? `#${hex}`,
      })),
      sourceText,
      lastUpdated: PALETTE_UPDATED_AT,
      builtIn: true,
    } satisfies SavedPalette;
  })
  .filter((palette) => palette.colors.length > 0);

export const DEFAULT_BASE_PALETTE_ID = BUILT_IN_PALETTES[0]?.id ?? 'built-in-default-palette';