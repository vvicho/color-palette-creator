export type PreviewTemplateId = 'sphere' | 'character' | 'enemy' | 'tile' | 'ui' | 'item';
export type PreviewBackgroundPreset = 'neutral' | 'meadow' | 'cave' | 'underworld';

export const PREVIEW_TEMPLATE_OPTIONS: Array<{ id: PreviewTemplateId; label: string }> = [
  { id: 'sphere', label: 'Sphere' },
  { id: 'character', label: 'Character' },
  { id: 'enemy', label: 'Enemy' },
  { id: 'tile', label: 'Tile' },
  { id: 'ui', label: 'UI' },
  { id: 'item', label: 'Item' },
];

export const PREVIEW_BACKGROUND_OPTIONS: Array<{ id: PreviewBackgroundPreset; label: string }> = [
  { id: 'neutral', label: 'Neutral Gray' },
  { id: 'meadow', label: 'Meadow' },
  { id: 'cave', label: 'Cave' },
  { id: 'underworld', label: 'Underworld' },
];

const fillBackground = (context: CanvasRenderingContext2D, width: number, height: number, preset: PreviewBackgroundPreset) => {
  switch (preset) {
    case 'meadow':
      context.fillStyle = '#26432B';
      context.fillRect(0, 0, width, height);
      context.fillStyle = '#3E6B43';
      context.fillRect(0, Math.floor(height * 0.58), width, Math.ceil(height * 0.42));
      break;
    case 'cave':
      context.fillStyle = '#1B1E2A';
      context.fillRect(0, 0, width, height);
      context.fillStyle = '#2A3145';
      context.fillRect(0, Math.floor(height * 0.62), width, Math.ceil(height * 0.38));
      break;
    case 'underworld':
      context.fillStyle = '#25152D';
      context.fillRect(0, 0, width, height);
      context.fillStyle = '#3A1B45';
      context.fillRect(0, Math.floor(height * 0.6), width, Math.ceil(height * 0.4));
      break;
    case 'neutral':
    default:
      context.fillStyle = '#1E1E2C';
      context.fillRect(0, 0, width, height);
      break;
  }
};

const resolveShadeIndex = (intensity: number, shadeCount: number, highlightSize: number, shadowSize: number) => {
  const highlightDrive = ((highlightSize - 50) / 50) * 0.22;
  const shadowDrive = ((50 - shadowSize) / 50) * 0.22;
  const adjusted = Math.max(0, Math.min(0.999, intensity + highlightDrive - shadowDrive));
  const index = Math.floor(adjusted * shadeCount);
  return Math.max(0, Math.min(shadeCount - 1, index));
};

const drawSphere = (
  context: CanvasRenderingContext2D,
  shades: string[],
  width: number,
  height: number,
  highlightSize: number,
  shadowSize: number,
) => {
  const centerX = width / 2;
  const centerY = height / 2 + 2;
  const radius = Math.floor(Math.min(width, height) * 0.35);
  const lightX = -0.7;
  const lightY = -0.7;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const dx = (x - centerX) / radius;
      const dy = (y - centerY) / radius;
      const distanceSquared = dx * dx + dy * dy;
      if (distanceSquared > 1) continue;
      const dz = Math.sqrt(1 - distanceSquared);
      const raw = (dx * lightX + dy * lightY + dz * 0.9 + 1) / 2;
      const shade = shades[resolveShadeIndex(raw, shades.length, highlightSize, shadowSize)] ?? shades[0];
      context.fillStyle = shade;
      context.fillRect(x, y, 1, 1);
    }
  }
};

const fillMask = (
  context: CanvasRenderingContext2D,
  shades: string[],
  width: number,
  height: number,
  mask: (x: number, y: number) => boolean,
  highlightSize: number,
  shadowSize: number,
) => {
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!mask(x, y)) continue;
      const normalized = Math.max(0, Math.min(1, 1 - y / Math.max(1, height - 1)));
      const shade = shades[resolveShadeIndex(normalized, shades.length, highlightSize, shadowSize)] ?? shades[0];
      context.fillStyle = shade;
      context.fillRect(x, y, 1, 1);
    }
  }
};

export const renderPreviewTemplate = ({
  context,
  width,
  height,
  template,
  shades,
  background,
  highlightSize,
  shadowSize,
}: {
  context: CanvasRenderingContext2D;
  width: number;
  height: number;
  template: PreviewTemplateId;
  shades: string[];
  background: PreviewBackgroundPreset;
  highlightSize: number;
  shadowSize: number;
}) => {
  fillBackground(context, width, height, background);
  if (shades.length === 0) return;

  switch (template) {
    case 'character':
      fillMask(
        context,
        shades,
        width,
        height,
        (x, y) => {
          const cx = width / 2;
          const head = (x - cx) ** 2 + (y - height * 0.28) ** 2 < (width * 0.13) ** 2;
          const torso = x >= width * 0.38 && x <= width * 0.62 && y >= height * 0.32 && y <= height * 0.78;
          const legs = ((x >= width * 0.4 && x <= width * 0.49) || (x >= width * 0.51 && x <= width * 0.6)) && y >= height * 0.78;
          const arms = ((x >= width * 0.3 && x <= width * 0.38) || (x >= width * 0.62 && x <= width * 0.7)) && y >= height * 0.42 && y <= height * 0.68;
          return head || torso || legs || arms;
        },
        highlightSize,
        shadowSize,
      );
      break;
    case 'enemy':
      fillMask(
        context,
        shades,
        width,
        height,
        (x, y) => {
          const cx = width / 2;
          const cy = height * 0.58;
          return (x - cx) ** 2 / (width * 0.22) ** 2 + (y - cy) ** 2 / (height * 0.26) ** 2 <= 1;
        },
        highlightSize,
        shadowSize,
      );
      break;
    case 'tile':
      for (let y = Math.floor(height * 0.22); y < Math.floor(height * 0.82); y += 1) {
        for (let x = Math.floor(width * 0.18); x < Math.floor(width * 0.82); x += 1) {
          const checker = (Math.floor(x / 5) + Math.floor(y / 5)) % 2;
          const noise = checker ? 0.2 : -0.1;
          const tone = Math.max(0, Math.min(0.999, 1 - y / height + noise));
          context.fillStyle = shades[resolveShadeIndex(tone, shades.length, highlightSize, shadowSize)] ?? shades[0];
          context.fillRect(x, y, 1, 1);
        }
      }
      break;
    case 'ui':
      for (let y = Math.floor(height * 0.2); y < Math.floor(height * 0.8); y += 1) {
        for (let x = Math.floor(width * 0.14); x < Math.floor(width * 0.86); x += 1) {
          const border = x < width * 0.18 || x > width * 0.82 || y < height * 0.24 || y > height * 0.76;
          const intensity = border ? 0.2 : 0.62;
          context.fillStyle = shades[resolveShadeIndex(intensity, shades.length, highlightSize, shadowSize)] ?? shades[0];
          context.fillRect(x, y, 1, 1);
        }
      }
      break;
    case 'item':
      fillMask(
        context,
        shades,
        width,
        height,
        (x, y) => {
          const cx = width / 2;
          const cy = height * 0.5;
          const diamond = Math.abs(x - cx) + Math.abs(y - cy) <= width * 0.2;
          const stem = x >= width * 0.47 && x <= width * 0.53 && y >= height * 0.62 && y <= height * 0.8;
          return diamond || stem;
        },
        highlightSize,
        shadowSize,
      );
      break;
    case 'sphere':
    default:
      drawSphere(context, shades, width, height, highlightSize, shadowSize);
      break;
  }
};
