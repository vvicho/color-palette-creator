import { sortByLightness } from './smartRampDetection';

export const generateRampRecolorMapping = (
  sourceHexes: string[],
  targetHexes: string[],
  lockedHexes: string[],
): Record<string, string> => {
  if (sourceHexes.length === 0 || targetHexes.length === 0) {
    return {};
  }

  const locked = new Set(lockedHexes.map((hex) => hex.toUpperCase()));
  const source = sortByLightness(sourceHexes.map((hex) => hex.toUpperCase())).filter((hex) => !locked.has(hex));
  const target = sortByLightness(targetHexes.map((hex) => hex.toUpperCase()));

  if (source.length === 0 || target.length === 0) {
    return {};
  }

  const mapping: Record<string, string> = {};
  for (let index = 0; index < source.length; index += 1) {
    const sourceHex = source[index];
    const targetIndex =
      source.length === 1 ? 0 : Math.round((index / (source.length - 1)) * Math.max(target.length - 1, 0));
    const targetHex = target[targetIndex];
    if (sourceHex && targetHex) {
      mapping[sourceHex] = targetHex;
    }
  }

  return mapping;
};
