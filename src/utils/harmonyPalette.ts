import { clamp, hexToRgb, hsvToRgb, rgbToHsv } from './colorSpace';

export const closestPaletteHex = (targetHex: string, palette: string[]) => {
  if (palette.length === 0) {
    return targetHex;
  }

  const target = hexToRgb(targetHex);
  let closest = palette[0];
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const candidate of palette) {
    const rgb = hexToRgb(candidate);
    const distance =
      (target.red - rgb.red) ** 2 + (target.green - rgb.green) ** 2 + (target.blue - rgb.blue) ** 2;
    if (distance < bestDistance) {
      bestDistance = distance;
      closest = candidate;
    }
  }

  return closest;
};

export const offsetHsvHex = (hex: string, hueShift: number, saturationShift: number, valueShift: number) => {
  const rgb = hexToRgb(hex);
  const hsv = rgbToHsv(rgb.red, rgb.green, rgb.blue);
  const shiftedHue = (hsv.hue + hueShift + 360) % 360;
  const shiftedSaturation = clamp(hsv.saturation + saturationShift, 0, 1);
  const shiftedValue = clamp(hsv.value + valueShift, 0, 1);
  const shiftedRgb = hsvToRgb(shiftedHue, shiftedSaturation, shiftedValue);
  return [
    shiftedRgb.red.toString(16).padStart(2, '0'),
    shiftedRgb.green.toString(16).padStart(2, '0'),
    shiftedRgb.blue.toString(16).padStart(2, '0'),
  ]
    .join('')
    .toUpperCase();
};
