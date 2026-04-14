export interface PaletteColor {
  hex: string;
  name: string;
}

export interface SavedPalette {
  id: string;
  name: string;
  colors: PaletteColor[];
  sourceText?: string;
  lastUpdated: string;
}
