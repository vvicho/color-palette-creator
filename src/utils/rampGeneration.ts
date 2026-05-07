import { clamp, hsvToRgb, rgbToHsv } from './colorSpace';

export type RampSize = 3 | 4 | 5;
export type ContrastIntensity = 'soft' | 'medium' | 'strong';
export type ShadowStyle = 'neutral' | 'warm' | 'cool';
export type SaturationCurve = 'flat' | 'increasing' | 'decreasing';

const hexToRgb = (hex: string) => ({
  red: Number.parseInt(hex.slice(0, 2), 16),
  green: Number.parseInt(hex.slice(2, 4), 16),
  blue: Number.parseInt(hex.slice(4, 6), 16),
});

const rgbToHex = (red: number, green: number, blue: number) =>
  [red, green, blue]
    .map((channel) => channel.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();

const contrastStepMap: Record<ContrastIntensity, number> = {
  soft: 0.12,
  medium: 0.19,
  strong: 0.27,
};

const hueShiftForShadow: Record<ShadowStyle, number> = {
  neutral: 0,
  warm: -8,
  cool: 10,
};

export const generateRampFromBase = ({
  baseHex,
  rampSize,
  contrastIntensity,
  shadowStyle,
  saturationCurve,
}: {
  baseHex: string;
  rampSize: RampSize;
  contrastIntensity: ContrastIntensity;
  shadowStyle: ShadowStyle;
  saturationCurve: SaturationCurve;
}) => {
  const { red, green, blue } = hexToRgb(baseHex);
  const baseHsv = rgbToHsv(red, green, blue);
  const count = rampSize;
  const step = contrastStepMap[contrastIntensity];
  const center = (count - 1) / 2;
  const hueShift = hueShiftForShadow[shadowStyle];

  return Array.from({ length: count }).map((_, index) => {
    const distanceFromCenter = index - center;
    const normalized = center === 0 ? 0 : distanceFromCenter / center;
    const isShadow = distanceFromCenter < 0;
    const satAdjust =
      saturationCurve === 'flat'
        ? 0
        : saturationCurve === 'increasing'
          ? normalized * 0.12
          : normalized * -0.12;
    const hue = (baseHsv.hue + (isShadow ? hueShift : -hueShift * 0.5) * Math.abs(normalized) + 360) % 360;
    const saturation = clamp(baseHsv.saturation + satAdjust, 0, 1);
    const value = clamp(baseHsv.value + normalized * step, 0, 1);
    const shifted = hsvToRgb(hue, saturation, value);
    return rgbToHex(shifted.red, shifted.green, shifted.blue);
  });
};

export const evaluateRampHealth = (hexes: string[]) => {
  if (hexes.length < 2) {
    return [];
  }
  const warnings: string[] = [];
  const values = hexes.map((hex) => {
    const { red, green, blue } = hexToRgb(hex);
    const hsv = rgbToHsv(red, green, blue);
    return hsv.value;
  });
  for (let index = 1; index < values.length; index += 1) {
    const diff = Math.abs((values[index] ?? 0) - (values[index - 1] ?? 0));
    if (diff < 0.08) {
      warnings.push('Some neighboring tones are very close and may look muddy.');
      break;
    }
  }
  if ((values[values.length - 1] ?? 0) > 0.98) {
    warnings.push('Highlight appears close to blown-out white.');
  }
  if ((values[0] ?? 1) < 0.08) {
    warnings.push('Shadow appears very deep and may lose detail.');
  }
  return warnings;
};
