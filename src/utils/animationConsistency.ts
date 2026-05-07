import type { SpriteFrameRect } from './spriteSheetParser';

const rgbToHex = (red: number, green: number, blue: number) =>
  [red, green, blue]
    .map((channel) => channel.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();

export type FrameConsistencyWarning = {
  frameIndex: number;
  message: string;
};

export const analyzeFrameConsistency = (
  imageData: ImageData,
  frames: SpriteFrameRect[],
  paletteHexes: string[],
): FrameConsistencyWarning[] => {
  if (frames.length < 2) {
    return [];
  }
  const paletteSet = new Set(paletteHexes.map((hex) => hex.toUpperCase()));
  const frameColors = frames.map((frame) => {
    const set = new Set<string>();
    for (let y = frame.y; y < frame.y + frame.height; y += 1) {
      for (let x = frame.x; x < frame.x + frame.width; x += 1) {
        const offset = (y * imageData.width + x) * 4;
        const alpha = imageData.data[offset + 3] ?? 0;
        if (alpha === 0) continue;
        set.add(rgbToHex(imageData.data[offset] ?? 0, imageData.data[offset + 1] ?? 0, imageData.data[offset + 2] ?? 0));
      }
    }
    return set;
  });

  const warnings: FrameConsistencyWarning[] = [];
  frameColors.forEach((set, index) => {
    const illegal = [...set].filter((hex) => !paletteSet.has(hex));
    if (illegal.length > 0) {
      warnings.push({
        frameIndex: index,
        message: `Frame ${index + 1} contains ${illegal.length} palette-illegal color(s).`,
      });
    }
    const prev = index > 0 ? frameColors[index - 1] : null;
    const next = index < frameColors.length - 1 ? frameColors[index + 1] : null;
    const neighboring = new Set<string>([...(prev ?? []), ...(next ?? [])]);
    const uniqueToFrame = [...set].filter((hex) => neighboring.size > 0 && !neighboring.has(hex));
    if (uniqueToFrame.length >= 2) {
      warnings.push({
        frameIndex: index,
        message: `Frame ${index + 1} has ${uniqueToFrame.length} color(s) not seen in adjacent frames.`,
      });
    }
  });

  return warnings;
};
