export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const hexToRgb = (hex: string) => ({
  red: Number.parseInt(hex.slice(0, 2), 16),
  green: Number.parseInt(hex.slice(2, 4), 16),
  blue: Number.parseInt(hex.slice(4, 6), 16),
});

export const rgbToHsv = (red: number, green: number, blue: number) => {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let hue = 0;
  if (delta !== 0) {
    if (max === r) {
      hue = ((g - b) / delta) % 6;
    } else if (max === g) {
      hue = (b - r) / delta + 2;
    } else {
      hue = (r - g) / delta + 4;
    }
    hue *= 60;
    if (hue < 0) {
      hue += 360;
    }
  }

  const saturation = max === 0 ? 0 : delta / max;
  const value = max;
  return { hue, saturation, value };
};

export const hsvToRgb = (hue: number, saturation: number, value: number) => {
  const c = value * saturation;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = value - c;

  let rPrime = 0;
  let gPrime = 0;
  let bPrime = 0;

  if (hue < 60) {
    rPrime = c;
    gPrime = x;
  } else if (hue < 120) {
    rPrime = x;
    gPrime = c;
  } else if (hue < 180) {
    gPrime = c;
    bPrime = x;
  } else if (hue < 240) {
    gPrime = x;
    bPrime = c;
  } else if (hue < 300) {
    rPrime = x;
    bPrime = c;
  } else {
    rPrime = c;
    bPrime = x;
  }

  return {
    red: Math.round((rPrime + m) * 255),
    green: Math.round((gPrime + m) * 255),
    blue: Math.round((bPrime + m) * 255),
  };
};

export const relativeLuminance = (hex: string) => {
  const { red, green, blue } = hexToRgb(hex);
  const toLinear = (channel: number) => {
    const normalized = channel / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  };
  const r = toLinear(red);
  const g = toLinear(green);
  const b = toLinear(blue);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export const contrastRatioHex = (hexA: string, hexB: string) => {
  const la = relativeLuminance(hexA);
  const lb = relativeLuminance(hexB);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
};

export const readableTextOnHex = (hex: string) => {
  const { red, green, blue } = hexToRgb(hex);
  const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  return luminance > 160 ? '#0f172a' : '#f8fafc';
};
