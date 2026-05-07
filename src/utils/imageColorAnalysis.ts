const rgbToHex = (red: number, green: number, blue: number) =>
  [red, green, blue]
    .map((channel) => channel.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();

const hexToRgb = (hex: string) => ({
  red: Number.parseInt(hex.slice(0, 2), 16),
  green: Number.parseInt(hex.slice(2, 4), 16),
  blue: Number.parseInt(hex.slice(4, 6), 16),
});

const rgbDistance = (
  left: { red: number; green: number; blue: number },
  right: { red: number; green: number; blue: number },
) => Math.sqrt((left.red - right.red) ** 2 + (left.green - right.green) ** 2 + (left.blue - right.blue) ** 2);

export type ColorUsageRow = {
  hex: string;
  count: number;
  isValid: boolean;
  nearestPaletteHex: string | null;
  nearestDistance: number | null;
};

export type ImageAnalysisResult = {
  width: number;
  height: number;
  totalPixels: number;
  opaquePixels: number;
  semiTransparentPixels: number;
  uniqueColorsCount: number;
  paletteColorsUsed: number;
  unusedPaletteColors: string[];
  invalidColorsCount: number;
  exceedsColorLimit: boolean;
  colors: ColorUsageRow[];
};

export const analyzeImageColors = (
  imageData: ImageData,
  paletteHexes: string[],
  maxColorCount: number,
  nearDuplicateThreshold = 18,
): ImageAnalysisResult => {
  const paletteSet = new Set(paletteHexes.map((hex) => hex.toUpperCase()));
  const paletteRgb = paletteHexes.map((hex) => ({ hex: hex.toUpperCase(), rgb: hexToRgb(hex.toUpperCase()) }));
  const usage = new Map<string, number>();
  const usedPalette = new Set<string>();
  let opaquePixels = 0;
  let semiTransparentPixels = 0;

  const { data, width, height } = imageData;
  for (let index = 0; index < data.length; index += 4) {
    const red = data[index] ?? 0;
    const green = data[index + 1] ?? 0;
    const blue = data[index + 2] ?? 0;
    const alpha = data[index + 3] ?? 0;

    if (alpha === 0) {
      continue;
    }

    if (alpha < 255) {
      semiTransparentPixels += 1;
    } else {
      opaquePixels += 1;
    }

    const hex = rgbToHex(red, green, blue);
    usage.set(hex, (usage.get(hex) ?? 0) + 1);
    if (paletteSet.has(hex)) {
      usedPalette.add(hex);
    }
  }

  const colors: ColorUsageRow[] = [...usage.entries()]
    .map(([hex, count]) => {
      const isValid = paletteSet.has(hex);
      if (isValid || paletteRgb.length === 0) {
        return {
          hex,
          count,
          isValid,
          nearestPaletteHex: null,
          nearestDistance: null,
        };
      }

      const targetRgb = hexToRgb(hex);
      let nearest: string | null = null;
      let bestDistance = Number.POSITIVE_INFINITY;
      for (const paletteColor of paletteRgb) {
        const distance = rgbDistance(targetRgb, paletteColor.rgb);
        if (distance < bestDistance) {
          bestDistance = distance;
          nearest = paletteColor.hex;
        }
      }

      return {
        hex,
        count,
        isValid,
        nearestPaletteHex: nearest,
        nearestDistance: Number.isFinite(bestDistance) ? bestDistance : null,
      };
    })
    .sort((left, right) => right.count - left.count);

  const unusedPaletteColors = [...paletteSet].filter((hex) => !usedPalette.has(hex));
  const invalidColorsCount = colors.filter((row) => !row.isValid).length;

  return {
    width,
    height,
    totalPixels: width * height,
    opaquePixels,
    semiTransparentPixels,
    uniqueColorsCount: colors.length,
    paletteColorsUsed: usedPalette.size,
    unusedPaletteColors,
    invalidColorsCount,
    exceedsColorLimit: colors.length > maxColorCount,
    colors: colors.map((row) =>
      row.isValid || row.nearestDistance == null || row.nearestDistance > nearDuplicateThreshold
        ? row
        : {
            ...row,
            // Preserve nearest suggestion and distance for "near duplicate" UI emphasis.
            nearestPaletteHex: row.nearestPaletteHex,
          },
    ),
  };
};
