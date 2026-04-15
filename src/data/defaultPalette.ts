import type { SavedPalette } from '../types';
import { getCachedColorName } from '../services/colorApi';
import { parseHexInput } from '../utils/hexParser';

export const DEFAULT_BASE_PALETTE_ID = 'greek-myth-base-palette';

export const DEFAULT_BASE_PALETTE_SOURCE = `// Olimpo y Héroes (Mármol, Oro, Cielo, Túnicas)
2F2F2F, BCBABA, E5E0D8, FFFFFF, 7A4500, C59100, FFD700, FFF4A3, 05445E, 189AB4, 75E6DA, D4F1F4, 450505, 800020, D10000, FF6B6B,

// Overworld (Olivos, Tierra, Bronce, Piedra)
1B2606, 3E4D16, 6B8E23, A2CD5A, 2D1B0D, 5D3A1A, 8B5E3C, BC8F6F, 4A2C10, 8C593B, CD7F32, F4A460, 303030, 505050, 808080, B0B0B0,

// Underworld (Styx, Almas, Obsidiana, Huesos)
0A1F1F, 134E4A, 2DA49C, 99F6E4, 2D004D, 4B0082, 8A2BE2, E0B0FF, 0D0208, 210B2C, 542E71, A799B7, 3D3D3D, 737373, C0C0C0, E0E0E0,

// Tártaro y Caos (Fuego, Sangre, Abismo, Azufre)
4D0000, B22222, FF4500, FFD700, 280000, 660000, 990000, FF0000, 020C02, 052F05, 0F5F0F, 1ED71E, 333300, 666600, CCCC00, FFFF00`;

export const DEFAULT_BASE_PALETTE: SavedPalette = {
  id: DEFAULT_BASE_PALETTE_ID,
  name: 'Greek Myth Base Palette',
  colors: parseHexInput(DEFAULT_BASE_PALETTE_SOURCE).map((hex) => ({
    hex,
    name: getCachedColorName(hex) ?? `#${hex}`,
  })),
  sourceText: DEFAULT_BASE_PALETTE_SOURCE,
  lastUpdated: '2026-04-14T00:00:00.000Z',
  builtIn: true,
};