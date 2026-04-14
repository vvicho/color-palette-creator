import type { PaletteColor } from '../types';

interface Hsl {
  hue: number;
  saturation: number;
  lightness: number;
  chroma: number;
}

const hexToRgb = (hex: string) => ({
  red: Number.parseInt(hex.slice(0, 2), 16) / 255,
  green: Number.parseInt(hex.slice(2, 4), 16) / 255,
  blue: Number.parseInt(hex.slice(4, 6), 16) / 255,
});

const rgbToHsl = ({ red, green, blue }: ReturnType<typeof hexToRgb>): Hsl => {
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const chroma = max - min;
  const lightness = (max + min) / 2;

  let hue = 0;
  if (chroma !== 0) {
    if (max === red) {
      hue = ((green - blue) / chroma) % 6;
    } else if (max === green) {
      hue = (blue - red) / chroma + 2;
    } else {
      hue = (red - green) / chroma + 4;
    }
    hue *= 60;
    if (hue < 0) {
      hue += 360;
    }
  }

  const saturation = chroma === 0 ? 0 : chroma / (1 - Math.abs(2 * lightness - 1));
  return { hue, saturation, lightness, chroma };
};

export const sortColorsByHue = (colors: PaletteColor[]): PaletteColor[] =>
  [...colors].sort((a, b) => {
    const aHsl = rgbToHsl(hexToRgb(a.hex));
    const bHsl = rgbToHsl(hexToRgb(b.hex));

    const aIsNeutral = aHsl.chroma < 0.04;
    const bIsNeutral = bHsl.chroma < 0.04;

    if (aIsNeutral !== bIsNeutral) {
      return aIsNeutral ? 1 : -1;
    }

    if (aIsNeutral && bIsNeutral) {
      return aHsl.lightness - bHsl.lightness;
    }

    const bucketSize = 15;
    const aBucket = Math.floor(aHsl.hue / bucketSize);
    const bBucket = Math.floor(bHsl.hue / bucketSize);
    if (aBucket !== bBucket) {
      return aBucket - bBucket;
    }

    if (aHsl.hue !== bHsl.hue) {
      return aHsl.hue - bHsl.hue;
    }

    if (aHsl.lightness !== bHsl.lightness) {
      return bHsl.lightness - aHsl.lightness;
    }

    return bHsl.saturation - aHsl.saturation;
  });

export const sortColorsByLightness = (colors: PaletteColor[]): PaletteColor[] =>
  [...colors].sort((a, b) => {
    const aHsl = rgbToHsl(hexToRgb(a.hex));
    const bHsl = rgbToHsl(hexToRgb(b.hex));
    return aHsl.lightness - bHsl.lightness;
  });

export const sortColorsByName = (colors: PaletteColor[]): PaletteColor[] =>
  [...colors].sort((a, b) => a.name.localeCompare(b.name));
