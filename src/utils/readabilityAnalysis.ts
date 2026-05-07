import { detectSpriteBounds } from './silhouetteDetection';

const BACKGROUNDS = {
  meadow: '#3E6B43',
  cave: '#2A3145',
  swamp: '#3D4F3A',
  underworld: '#3A1B45',
  neutral: '#6B7280',
} as const;

type ReadabilityBackground = keyof typeof BACKGROUNDS;

const hexToRgb = (hex: string) => ({
  red: Number.parseInt(hex.slice(1, 3), 16),
  green: Number.parseInt(hex.slice(3, 5), 16),
  blue: Number.parseInt(hex.slice(5, 7), 16),
});

const relativeLuminanceRgb = (red: number, green: number, blue: number) => {
  const toLinear = (channel: number) => {
    const normalized = channel / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  };
  const r = toLinear(red);
  const g = toLinear(green);
  const b = toLinear(blue);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrastRatio = (a: number, b: number) => {
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
};

export type ReadabilityReport = {
  localContrastRatio: number;
  lowContrastPixelRatio: number;
  silhouetteEdgeDensity: number;
  outlineStrength: number;
  backgroundSeparation: Record<ReadabilityBackground, number>;
  warnings: string[];
  lowContrastMask: Uint8Array;
};

export const analyzeReadability = (imageData: ImageData): ReadabilityReport | null => {
  const bounds = detectSpriteBounds(imageData);
  if (!bounds) {
    return null;
  }
  const { width, height, data } = imageData;
  let localContrastTotal = 0;
  let localSamples = 0;
  let lowContrastHits = 0;
  let edgePixels = 0;
  let outlineContrastTotal = 0;
  let outlineSamples = 0;
  const lowContrastMask = new Uint8Array(width * height);

  const bgLuminance = Object.fromEntries(
    (Object.entries(BACKGROUNDS) as Array<[ReadabilityBackground, string]>).map(([key, value]) => {
      const rgb = hexToRgb(value);
      return [key, relativeLuminanceRgb(rgb.red, rgb.green, rgb.blue)];
    }),
  ) as Record<ReadabilityBackground, number>;

  const backgroundTotals: Record<ReadabilityBackground, number> = {
    meadow: 0,
    cave: 0,
    swamp: 0,
    underworld: 0,
    neutral: 0,
  };

  for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
    for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
      const idx = y * width + x;
      const offset = idx * 4;
      const alpha = data[offset + 3] ?? 0;
      if (alpha === 0) continue;
      const red = data[offset] ?? 0;
      const green = data[offset + 1] ?? 0;
      const blue = data[offset + 2] ?? 0;
      const lum = relativeLuminanceRgb(red, green, blue);

      const neighbors = [
        [x + 1, y],
        [x - 1, y],
        [x, y + 1],
        [x, y - 1],
      ] as const;

      let touchesTransparent = false;
      for (const [nx, ny] of neighbors) {
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
          touchesTransparent = true;
          continue;
        }
        const nOffset = (ny * width + nx) * 4;
        const nAlpha = data[nOffset + 3] ?? 0;
        if (nAlpha === 0) {
          touchesTransparent = true;
          continue;
        }
        const nLum = relativeLuminanceRgb(data[nOffset] ?? 0, data[nOffset + 1] ?? 0, data[nOffset + 2] ?? 0);
        const ratio = contrastRatio(lum, nLum);
        localContrastTotal += ratio;
        localSamples += 1;
        if (ratio < 1.25) {
          lowContrastHits += 1;
          lowContrastMask[idx] = 255;
        }
      }

      if (touchesTransparent) {
        edgePixels += 1;
        outlineSamples += 1;
        outlineContrastTotal += contrastRatio(lum, bgLuminance.neutral);
      }

      (Object.keys(backgroundTotals) as ReadabilityBackground[]).forEach((background) => {
        backgroundTotals[background] += contrastRatio(lum, bgLuminance[background]);
      });
    }
  }

  const lowContrastPixelRatio = localSamples > 0 ? lowContrastHits / localSamples : 0;
  const silhouetteEdgeDensity = bounds.pixelCount > 0 ? edgePixels / bounds.pixelCount : 0;
  const localContrastRatio = localSamples > 0 ? localContrastTotal / localSamples : 1;
  const outlineStrength = outlineSamples > 0 ? outlineContrastTotal / outlineSamples : 1;
  const backgroundSeparation = Object.fromEntries(
    (Object.keys(backgroundTotals) as ReadabilityBackground[]).map((background) => [
      background,
      backgroundTotals[background] / Math.max(bounds.pixelCount, 1),
    ]),
  ) as Record<ReadabilityBackground, number>;

  const warnings: string[] = [];
  if (localContrastRatio < 1.45 || lowContrastPixelRatio > 0.28) {
    warnings.push('Local contrast is low; ramp transitions may look muddy at gameplay scale.');
  }
  if (silhouetteEdgeDensity < 0.18) {
    warnings.push('Silhouette edge density is low; shape may blend into noisy scenes.');
  }
  if (outlineStrength < 1.6) {
    warnings.push('Outline strength is weak against neutral background.');
  }
  const weakBackgrounds = (Object.keys(backgroundSeparation) as ReadabilityBackground[]).filter(
    (background) => backgroundSeparation[background] < 1.8,
  );
  if (weakBackgrounds.length > 0) {
    warnings.push(`Background separation is weak for: ${weakBackgrounds.join(', ')}.`);
  }

  return {
    localContrastRatio,
    lowContrastPixelRatio,
    silhouetteEdgeDensity,
    outlineStrength,
    backgroundSeparation,
    warnings,
    lowContrastMask,
  };
};
