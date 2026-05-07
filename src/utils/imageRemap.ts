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

export const applyRemapsToImageData = (source: ImageData, remapMap: Record<string, string>) => {
  const output = new ImageData(new Uint8ClampedArray(source.data), source.width, source.height);
  const lookup = Object.entries(remapMap).reduce<Record<string, { red: number; green: number; blue: number }>>(
    (accumulator, [fromHex, toHex]) => {
      accumulator[fromHex.toUpperCase()] = hexToRgb(toHex.toUpperCase());
      return accumulator;
    },
    {},
  );

  for (let index = 0; index < output.data.length; index += 4) {
    const alpha = output.data[index + 3] ?? 0;
    if (alpha === 0) {
      continue;
    }
    const fromHex = rgbToHex(output.data[index] ?? 0, output.data[index + 1] ?? 0, output.data[index + 2] ?? 0);
    const replacement = lookup[fromHex];
    if (!replacement) {
      continue;
    }
    output.data[index] = replacement.red;
    output.data[index + 1] = replacement.green;
    output.data[index + 2] = replacement.blue;
  }

  return output;
};

export const exportImageDataAsPng = async (imageData: ImageData, fileNameBase: string) => {
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Unable to create export context');
  }
  context.putImageData(imageData, 0, 0);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((createdBlob) => {
      if (!createdBlob) {
        reject(new Error('PNG export failed'));
        return;
      }
      resolve(createdBlob);
    }, 'image/png');
  });

  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = `${fileNameBase}.png`;
  link.click();
  URL.revokeObjectURL(objectUrl);
};
