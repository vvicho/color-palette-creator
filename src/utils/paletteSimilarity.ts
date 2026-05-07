const hexToRgb = (hex: string) => ({
  red: Number.parseInt(hex.slice(0, 2), 16),
  green: Number.parseInt(hex.slice(2, 4), 16),
  blue: Number.parseInt(hex.slice(4, 6), 16),
});

const distance = (
  left: { red: number; green: number; blue: number },
  right: { red: number; green: number; blue: number },
) => Math.sqrt((left.red - right.red) ** 2 + (left.green - right.green) ** 2 + (left.blue - right.blue) ** 2);

export const findClosestPaletteColors = (hex: string, paletteHexes: string[], limit = 6) => {
  const target = hexToRgb(hex);
  return paletteHexes
    .map((candidate) => ({
      hex: candidate,
      distance: distance(target, hexToRgb(candidate)),
    }))
    .sort((left, right) => left.distance - right.distance)
    .slice(0, limit);
};

export const findRampDuplicates = (rampHexes: string[], paletteHexes: string[]) => {
  const set = new Set(paletteHexes.map((hex) => hex.toUpperCase()));
  return rampHexes.filter((hex) => set.has(hex.toUpperCase()));
};
