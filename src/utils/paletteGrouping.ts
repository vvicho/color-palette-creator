import type { PaletteColor, PaletteGroup } from '../types';

type Hsl = { hue: number; saturation: number; lightness: number };

const HUE_BUCKETS: Array<{ max: number; label: string }> = [
  { max: 20, label: 'Reds' },
  { max: 45, label: 'Oranges' },
  { max: 70, label: 'Yellows' },
  { max: 150, label: 'Greens' },
  { max: 210, label: 'Cyans' },
  { max: 260, label: 'Blues' },
  { max: 320, label: 'Purples' },
  { max: 360, label: 'Magentas' },
];

const rgbUnit = (hex: string) => ({
  red: Number.parseInt(hex.slice(0, 2), 16) / 255,
  green: Number.parseInt(hex.slice(2, 4), 16) / 255,
  blue: Number.parseInt(hex.slice(4, 6), 16) / 255,
});

const rgbToHsl = ({ red, green, blue }: ReturnType<typeof rgbUnit>): Hsl => {
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  const lightness = (max + min) / 2;
  let hue = 0;

  if (delta !== 0) {
    if (max === red) {
      hue = ((green - blue) / delta) % 6;
    } else if (max === green) {
      hue = (blue - red) / delta + 2;
    } else {
      hue = (red - green) / delta + 4;
    }
    hue *= 60;
    if (hue < 0) hue += 360;
  }

  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));
  return { hue, saturation, lightness };
};

const getHueGroupLabel = (hue: number) => HUE_BUCKETS.find((bucket) => hue < bucket.max)?.label ?? 'Magentas';

export const autoGroupPaletteColors = (colors: PaletteColor[]): PaletteGroup[] => {
  const namedGroups = new Map<string, { hex: string; lightness: number }[]>();
  for (const color of colors) {
    const hsl = rgbToHsl(rgbUnit(color.hex));
    const groupName = hsl.saturation < 0.12 ? 'Neutrals' : getHueGroupLabel(hsl.hue);
    const existing = namedGroups.get(groupName) ?? [];
    existing.push({ hex: color.hex, lightness: hsl.lightness });
    namedGroups.set(groupName, existing);
  }

  return [...namedGroups.entries()]
    .map(([name, values], index) => ({
      id: `group-${index + 1}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      name,
      colorHexes: values.sort((a, b) => a.lightness - b.lightness).map((value) => value.hex),
    }))
    .filter((group) => group.colorHexes.length > 0);
};

export const normalizePaletteGroups = (groups: PaletteGroup[], colors: PaletteColor[]): PaletteGroup[] => {
  const validHexes = new Set(colors.map((color) => color.hex));
  const seenHexes = new Set<string>();

  const normalized = groups
    .map((group) => ({
      ...group,
      colorHexes: group.colorHexes.filter((hex) => {
        if (!validHexes.has(hex) || seenHexes.has(hex)) {
          return false;
        }
        seenHexes.add(hex);
        return true;
      }),
    }))
    .filter((group) => group.colorHexes.length > 0);

  const ungrouped = colors.map((color) => color.hex).filter((hex) => !seenHexes.has(hex));
  if (ungrouped.length > 0) {
    normalized.push({
      id: 'group-ungrouped',
      name: 'Ungrouped',
      colorHexes: ungrouped,
    });
  }

  return normalized;
};
