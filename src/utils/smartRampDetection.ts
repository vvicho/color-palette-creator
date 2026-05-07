interface Hsl {
  hue: number;
  saturation: number;
  lightness: number;
}

const hexToRgbUnit = (hex: string) => ({
  red: Number.parseInt(hex.slice(0, 2), 16) / 255,
  green: Number.parseInt(hex.slice(2, 4), 16) / 255,
  blue: Number.parseInt(hex.slice(4, 6), 16) / 255,
});

const rgbToHsl = ({ red, green, blue }: ReturnType<typeof hexToRgbUnit>): Hsl => {
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
    if (hue < 0) {
      hue += 360;
    }
  }
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));
  return { hue, saturation, lightness };
};

const circularHueDistance = (left: number, right: number) => {
  const diff = Math.abs(left - right) % 360;
  return diff > 180 ? 360 - diff : diff;
};

export const sortByLightness = (hexes: string[]) =>
  [...hexes].sort((left, right) => {
    const leftHsl = rgbToHsl(hexToRgbUnit(left));
    const rightHsl = rgbToHsl(hexToRgbUnit(right));
    return leftHsl.lightness - rightHsl.lightness;
  });

export const detectRampFromSeed = (
  hexes: string[],
  seedHex: string,
  lockedHexes: string[],
  options?: { maxRampSize?: number; hueThreshold?: number; saturationThreshold?: number },
) => {
  const maxRampSize = options?.maxRampSize ?? 6;
  const hueThreshold = options?.hueThreshold ?? 26;
  const saturationThreshold = options?.saturationThreshold ?? 0.25;
  const seed = seedHex.toUpperCase();
  const locked = new Set(lockedHexes.map((hex) => hex.toUpperCase()));
  const seedHsl = rgbToHsl(hexToRgbUnit(seed));

  const candidates = hexes
    .map((hex) => hex.toUpperCase())
    .filter((hex) => !locked.has(hex))
    .filter((hex) => {
      const hsl = rgbToHsl(hexToRgbUnit(hex));
      return (
        circularHueDistance(hsl.hue, seedHsl.hue) <= hueThreshold &&
        Math.abs(hsl.saturation - seedHsl.saturation) <= saturationThreshold
      );
    });

  const withSeed = candidates.includes(seed) ? candidates : [seed, ...candidates];
  return sortByLightness([...new Set(withSeed)]).slice(0, maxRampSize);
};
