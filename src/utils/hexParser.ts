export const HEX_TOKEN_REGEX = /[0-9a-fA-F]{3,8}/g;

const stripSingleLineComments = (value: string): string =>
  value
    .split('\n')
    .map((line) => {
      const commentStart = line.indexOf('//');
      if (commentStart === -1) {
        return line;
      }
      return line.slice(0, commentStart);
    })
    .join('\n');

export const normalizeHex = (value: string): string | null => {
  const cleaned = value.replace(/[^0-9a-fA-F]/g, '').toUpperCase();

  if (cleaned.length === 3) {
    return cleaned
      .split('')
      .map((char) => `${char}${char}`)
      .join('');
  }

  if (cleaned.length >= 6) {
    return cleaned.slice(0, 6);
  }

  return null;
};

export const parseHexInput = (rawInput: string): string[] => {
  const cleanedInput = stripSingleLineComments(rawInput);
  const tokens = cleanedInput.match(HEX_TOKEN_REGEX) ?? [];
  const normalized = tokens.map((token) => normalizeHex(token)).filter(Boolean) as string[];
  return [...new Set(normalized)];
};
