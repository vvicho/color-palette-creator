export type SpriteSheetGridConfig = {
  frameWidth: number;
  frameHeight: number;
  spacing: number;
  margin: number;
};

export type SpriteFrameRect = {
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

export const parseSpriteSheetFrames = (
  imageWidth: number,
  imageHeight: number,
  config: SpriteSheetGridConfig,
): SpriteFrameRect[] => {
  if (config.frameWidth <= 0 || config.frameHeight <= 0) {
    return [];
  }
  const frames: SpriteFrameRect[] = [];
  let index = 0;
  for (
    let y = config.margin;
    y + config.frameHeight <= imageHeight - config.margin;
    y += config.frameHeight + config.spacing
  ) {
    for (
      let x = config.margin;
      x + config.frameWidth <= imageWidth - config.margin;
      x += config.frameWidth + config.spacing
    ) {
      frames.push({
        index,
        x,
        y,
        width: config.frameWidth,
        height: config.frameHeight,
      });
      index += 1;
    }
  }
  return frames;
};

export const getFrameIndexAtPoint = (x: number, y: number, frames: SpriteFrameRect[]) =>
  frames.find((frame) => x >= frame.x && y >= frame.y && x < frame.x + frame.width && y < frame.y + frame.height)?.index ?? null;
