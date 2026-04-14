import staticColorNameCache from '../data/colorNameCache.json';

const COLOR_API_URL = 'https://www.thecolorapi.com/id';
const COLOR_NAME_CACHE_KEY = 'spectrum-color-name-cache';

type ColorNameCache = Record<string, string>;

const runtimeCache: ColorNameCache = { ...staticColorNameCache };

const hydrateRuntimeCache = () => {
  try {
    const raw = localStorage.getItem(COLOR_NAME_CACHE_KEY);
    if (!raw) {
      return;
    }

    const parsed = JSON.parse(raw) as ColorNameCache;
    Object.assign(runtimeCache, parsed);
  } catch {
    // Ignore malformed cache to keep color naming available.
  }
};

const persistRuntimeCache = () => {
  try {
    localStorage.setItem(COLOR_NAME_CACHE_KEY, JSON.stringify(runtimeCache));
  } catch {
    // Ignore storage write failures (private mode / quota).
  }
};

if (typeof window !== 'undefined') {
  hydrateRuntimeCache();
}

export const getCachedColorName = (hex: string): string | null => runtimeCache[hex] ?? null;

export const fetchColorName = async (hex: string): Promise<string> => {
  const cached = getCachedColorName(hex);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(`${COLOR_API_URL}?hex=${hex}`);
    if (!response.ok) {
      return `#${hex}`;
    }

    const data = (await response.json()) as { name?: { value?: string } };
    const resolvedName = data.name?.value ?? `#${hex}`;

    runtimeCache[hex] = resolvedName;
    persistRuntimeCache();
    return resolvedName;
  } catch {
    return `#${hex}`;
  }
};
