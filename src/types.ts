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
  builtIn?: boolean;
}

export type SortMode = 'none' | 'hue' | 'lightness' | 'name';
export type WorkspaceTab = 'palette' | 'contrast' | 'harmony';
export type CelToneCount = 2 | 3 | 4;
export type RampSlot = 'shadow' | 'base' | 'light' | 'highlight';
export type HarmonyExtraSlot = 'complementary' | 'analogousA' | 'analogousB';
export type HarmonySlot = RampSlot | HarmonyExtraSlot;

export type HarmonyRamp =
  | { kind: '2'; shadow: string; base: string }
  | { kind: '3'; shadow: string; base: string; highlight: string }
  | { kind: '4'; shadow: string; base: string; light: string; highlight: string };
