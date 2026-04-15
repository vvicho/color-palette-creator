import { type DragEvent, useEffect, useMemo, useRef, useState } from 'react';
import { ColorCard } from './components/ColorCard';
import { CodePaletteInput } from './components/CodePaletteInput';
import { useLocalStorage } from './hooks/useLocalStorage';
import { fetchColorName } from './services/colorApi';
import { DEFAULT_BASE_PALETTE, DEFAULT_BASE_PALETTE_ID } from './data/defaultPalette';
import type { PaletteColor, SavedPalette } from './types';
import { sortColorsByHue, sortColorsByLightness, sortColorsByName } from './utils/colorSort';
import { parseHexInput } from './utils/hexParser';


const STORAGE_KEYS = {
  library: 'spectrum-library',
  activePaletteId: 'spectrum-active-palette-id',
};

type SortMode = 'none' | 'hue' | 'lightness' | 'name';
type WorkspaceTab = 'palette' | 'contrast' | 'harmony';

const formatExport = (colors: PaletteColor[]) => colors.map((color) => `#${color.hex}`).join(', ');
const COMPACT_MAP_COLUMNS = 12;

const createPaletteId = () => crypto.randomUUID();
const sanitizeFileName = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'palette-map';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const rgbToHsv = (red: number, green: number, blue: number) => {
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

const hsvToRgb = (hue: number, saturation: number, value: number) => {
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

const App = () => {
  const [input, setInput] = useState('');
  const [paletteName, setPaletteName] = useState('Untitled Palette');
  const [colors, setColors] = useState<PaletteColor[]>([]);
  const [toast, setToast] = useState('');
  const [isLoadingNames, setIsLoadingNames] = useState(false);
  const [savedPalettes, setSavedPalettes] = useLocalStorage<SavedPalette[]>(
    STORAGE_KEYS.library,
    [DEFAULT_BASE_PALETTE],
  );
  const [activePaletteId, setActivePaletteId] = useLocalStorage<string | null>(
    STORAGE_KEYS.activePaletteId,
    null,
  );
  const [sortMode, setSortMode] = useState<SortMode>('none');
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>('palette');
  const [showLibrary, setShowLibrary] = useState(false);
  const [foregroundHex, setForegroundHex] = useState<string | null>(null);
  const [backgroundHex, setBackgroundHex] = useState<string | null>(null);
  const [harmonyBaseHex, setHarmonyBaseHex] = useState<string | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const activePalette = useMemo(
    () => savedPalettes.find((palette) => palette.id === activePaletteId) ?? null,
    [activePaletteId, savedPalettes],
  );

  const displayColors = useMemo(() => {
    switch (sortMode) {
      case 'hue':
        return sortColorsByHue(colors);
      case 'lightness':
        return sortColorsByLightness(colors);
      case 'name':
        return sortColorsByName(colors);
      case 'none':
      default:
        return colors;
    }
  }, [colors, sortMode]);

  const masterPalette = useMemo(() => [...new Set(colors.map((color) => color.hex))], [colors]);

  useEffect(() => {
    if (displayColors.length === 0) {
      setForegroundHex(null);
      setBackgroundHex(null);
      return;
    }

    setForegroundHex((previous) =>
      previous && displayColors.some((color) => color.hex === previous) ? previous : displayColors[0]?.hex ?? null,
    );
    setBackgroundHex((previous) =>
      previous && displayColors.some((color) => color.hex === previous)
        ? previous
        : displayColors[1]?.hex ?? displayColors[0]?.hex ?? null,
    );
  }, [displayColors]);

  useEffect(() => {
    if (masterPalette.length === 0) {
      setHarmonyBaseHex(null);
      return;
    }

    setHarmonyBaseHex((previous) => (previous && masterPalette.includes(previous) ? previous : masterPalette[0]));
  }, [masterPalette]);

  useEffect(() => {
    if (!activePalette) {
      return;
    }

    setPaletteName(activePalette.name);
    setColors(activePalette.colors);
    setInput(activePalette.sourceText ?? formatExport(activePalette.colors));
  }, [activePalette]);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(''), 1800);
  };

  const importColors = async () => {
    const hexes = parseHexInput(input);
    if (hexes.length === 0) {
      showToast('No valid hex values found');
      setColors([]);
      return;
    }

    setIsLoadingNames(true);
    const namedColors = await Promise.all(
      hexes.map(async (hex) => ({
        hex,
        name: await fetchColorName(hex),
      })),
    );
    setIsLoadingNames(false);
    setColors(namedColors);
    showToast(`Loaded ${namedColors.length} colors`);
  };

  const exportPalette = async () => {
    if (colors.length === 0) {
      showToast('Nothing to export');
      return;
    }

    await navigator.clipboard.writeText(formatExport(displayColors));
    showToast('Export string copied');
  };

  const exportPaletteImage = () => {
    if (displayColors.length === 0) {
      showToast('Nothing to export');
      return;
    }

    const cellSize = 40;
    const gap = 2;
    const padding = 12;
    const columns = Math.min(COMPACT_MAP_COLUMNS, displayColors.length);
    const rows = Math.ceil(displayColors.length / columns);
    const canvas = document.createElement('canvas');
    const width = padding * 2 + columns * cellSize + (columns - 1) * gap;
    const height = padding * 2 + rows * cellSize + (rows - 1) * gap;
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) {
      showToast('Image export failed');
      return;
    }

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);

    displayColors.forEach((color, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const x = padding + column * (cellSize + gap);
      const y = padding + row * (cellSize + gap);
      context.fillStyle = `#${color.hex}`;
      context.fillRect(x, y, cellSize, cellSize);
    });

    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `${sanitizeFileName(paletteName)}.png`;
    link.click();
    showToast('Palette map exported');
  };

  const handleDragStart = (event: DragEvent<HTMLButtonElement>, hex: string) => {
    event.dataTransfer.setData('text/plain', hex);
    event.dataTransfer.effectAllowed = 'copy';
  };

  const allowDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  };

  const hexToRgb = (hex: string) => ({
    red: Number.parseInt(hex.slice(0, 2), 16),
    green: Number.parseInt(hex.slice(2, 4), 16),
    blue: Number.parseInt(hex.slice(4, 6), 16),
  });

  const relativeLuminance = (hex: string) => {
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

  const readableTextOnHex = (hex: string) => {
    const { red, green, blue } = hexToRgb(hex);
    const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
    return luminance > 160 ? '#0f172a' : '#f8fafc';
  };

  const closestPaletteHex = (targetHex: string, palette: string[]) => {
    if (palette.length === 0) {
      return targetHex;
    }

    const target = hexToRgb(targetHex);
    let closest = palette[0];
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const candidate of palette) {
      const rgb = hexToRgb(candidate);
      const distance =
        (target.red - rgb.red) ** 2 + (target.green - rgb.green) ** 2 + (target.blue - rgb.blue) ** 2;
      if (distance < bestDistance) {
        bestDistance = distance;
        closest = candidate;
      }
    }

    return closest;
  };

  const offsetHsvHex = (hex: string, hueShift: number, saturationShift: number, valueShift: number) => {
    const rgb = hexToRgb(hex);
    const hsv = rgbToHsv(rgb.red, rgb.green, rgb.blue);
    const shiftedHue = (hsv.hue + hueShift + 360) % 360;
    const shiftedSaturation = clamp(hsv.saturation + saturationShift, 0, 1);
    const shiftedValue = clamp(hsv.value + valueShift, 0, 1);
    const shiftedRgb = hsvToRgb(shiftedHue, shiftedSaturation, shiftedValue);
    return [
      shiftedRgb.red.toString(16).padStart(2, '0'),
      shiftedRgb.green.toString(16).padStart(2, '0'),
      shiftedRgb.blue.toString(16).padStart(2, '0'),
    ]
      .join('')
      .toUpperCase();
  };

  const harmonyData = useMemo(() => {
    if (!harmonyBaseHex || masterPalette.length === 0) {
      return null;
    }

    const ramp = {
      shadow: closestPaletteHex(offsetHsvHex(harmonyBaseHex, -16, 0.08, -0.28), masterPalette),
      base: harmonyBaseHex,
      light: closestPaletteHex(offsetHsvHex(harmonyBaseHex, 10, -0.04, 0.18), masterPalette),
      highlight: closestPaletteHex(offsetHsvHex(harmonyBaseHex, 18, -0.1, 0.34), masterPalette),
    };

    const harmonies = {
      complementary: closestPaletteHex(offsetHsvHex(harmonyBaseHex, 180, 0, 0), masterPalette),
      analogousA: closestPaletteHex(offsetHsvHex(harmonyBaseHex, -28, 0, 0), masterPalette),
      analogousB: closestPaletteHex(offsetHsvHex(harmonyBaseHex, 28, 0, 0), masterPalette),
    };

    return { ramp, harmonies };
  }, [harmonyBaseHex, masterPalette]);

  const contrastRatio = useMemo(() => {
    if (!foregroundHex || !backgroundHex) {
      return null;
    }
    const foregroundLuminance = relativeLuminance(foregroundHex);
    const backgroundLuminance = relativeLuminance(backgroundHex);
    const lighter = Math.max(foregroundLuminance, backgroundLuminance);
    const darker = Math.min(foregroundLuminance, backgroundLuminance);
    return (lighter + 0.05) / (darker + 0.05);
  }, [foregroundHex, backgroundHex]);

  const contrastRating = useMemo(() => {
    if (!contrastRatio) {
      return 'N/A';
    }
    if (contrastRatio >= 7) {
      return 'AAA';
    }
    if (contrastRatio >= 4.5) {
      return 'AA';
    }
    if (contrastRatio >= 3) {
      return 'AA Large';
    }
    return 'Fail';
  }, [contrastRatio]);

  useEffect(() => {
    if (!previewCanvasRef.current || !harmonyData) {
      return;
    }

    const context = previewCanvasRef.current.getContext('2d');
    if (!context) {
      return;
    }

    const width = previewCanvasRef.current.width;
    const height = previewCanvasRef.current.height;
    context.clearRect(0, 0, width, height);

    context.fillStyle = '#1E1E2C';
    context.fillRect(0, 0, width, height);

    const shades = [
      `#${harmonyData.ramp.shadow}`,
      `#${harmonyData.ramp.base}`,
      `#${harmonyData.ramp.light}`,
      `#${harmonyData.ramp.highlight}`,
    ];

    const centerX = width / 2;
    const centerY = height / 2 + 4;
    const radius = 56;
    const lightX = -0.7;
    const lightY = -0.7;

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const dx = (x - centerX) / radius;
        const dy = (y - centerY) / radius;
        const distanceSquared = dx * dx + dy * dy;
        if (distanceSquared > 1) {
          continue;
        }

        const dz = Math.sqrt(1 - distanceSquared);
        const intensity = dx * lightX + dy * lightY + dz * 0.9;

        let shadeIndex = 0;
        if (intensity > 0.75) {
          shadeIndex = 3;
        } else if (intensity > 0.45) {
          shadeIndex = 2;
        } else if (intensity > 0.15) {
          shadeIndex = 1;
        }

        context.fillStyle = shades[shadeIndex];
        context.fillRect(x, y, 1, 1);
      }
    }
  }, [harmonyData]);

  const copyHex = async (hex: string) => {
    await navigator.clipboard.writeText(`#${hex}`);
    showToast(`#${hex} copied`);
  };

  const clearWorkspace = () => {
    setColors([]);
    setInput('');
    showToast('Workspace cleared');
  };

  const savePalette = () => {
    if (colors.length === 0) {
      showToast('Add colors before saving');
      return;
    }
  
    const trimmedName = paletteName.trim() || 'Untitled Palette';
    const existingById = activePaletteId
      ? savedPalettes.find((palette) => palette.id === activePaletteId) ?? null
      : null;
  
    const isEditingBuiltIn = existingById?.builtIn === true;
  
    const shouldCreateNew = !existingById || isEditingBuiltIn;
    const id = shouldCreateNew ? createPaletteId() : existingById.id;
  
    const payload: SavedPalette = {
      id,
      name: trimmedName,
      colors,
      sourceText: input,
      lastUpdated: new Date().toISOString(),
      builtIn: false,
    };
  
    setSavedPalettes((previous) => {
      if (shouldCreateNew) {
        return [payload, ...previous];
      }
  
      return [payload, ...previous.filter((palette) => palette.id !== id)];
    });
  
    setActivePaletteId(id);
    showToast(shouldCreateNew ? 'Palette saved' : 'Palette updated');
  };

  const loadPalette = (palette: SavedPalette) => {
    setPaletteName(palette.name);
    setColors(palette.colors);
    setInput(palette.sourceText ?? formatExport(palette.colors));
    setActivePaletteId(palette.id);
    setShowLibrary(false);
    showToast(`Loaded "${palette.name}"`);
  };

  const deletePalette = (paletteId: string, paletteNameValue: string) => {
    const palette = savedPalettes.find((item) => item.id === paletteId);
    if (palette?.builtIn) {
      showToast('Built-in palette cannot be deleted');
      return;
    }
  
    setSavedPalettes((previous) => previous.filter((item) => item.id !== paletteId));
    if (activePaletteId === paletteId) {
      setActivePaletteId(DEFAULT_BASE_PALETTE_ID);
    }
    showToast(`Deleted "${paletteNameValue}"`);
  };

  useEffect(() => {
    setSavedPalettes((previous) => {
      const alreadyExists = previous.some((palette) => palette.id === DEFAULT_BASE_PALETTE_ID);
      if (alreadyExists) {
        return previous;
      }
      return [DEFAULT_BASE_PALETTE, ...previous];
    });
  }, [setSavedPalettes]);

  useEffect(() => {
    if (!activePaletteId) {
      setActivePaletteId(DEFAULT_BASE_PALETTE_ID);
      return;
    }
  
    const stillExists = savedPalettes.some((palette) => palette.id === activePaletteId);
    if (!stillExists) {
      setActivePaletteId(DEFAULT_BASE_PALETTE_ID);
    }
  }, [activePaletteId, savedPalettes, setActivePaletteId]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Spectrum</p>
            <h1 className="text-xl font-bold sm:text-2xl">Color Palette Architect</h1>
          </div>
          <button
            type="button"
            onClick={() => setShowLibrary((value) => !value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50"
          >
            {showLibrary ? 'Close Library' : `Library (${savedPalettes.length})`}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-4 px-4 py-4 sm:px-6">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setWorkspaceTab('palette')}
            className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
              workspaceTab === 'palette'
                ? 'border-sky-500 bg-sky-600 text-white'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            Palette Builder
          </button>
          <button
            type="button"
            onClick={() => setWorkspaceTab('contrast')}
            className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
              workspaceTab === 'contrast'
                ? 'border-sky-500 bg-sky-600 text-white'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            Contrast Lab
          </button>
          <button
            type="button"
            onClick={() => setWorkspaceTab('harmony')}
            className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
              workspaceTab === 'harmony'
                ? 'border-sky-500 bg-sky-600 text-white'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            Harmony Assistant
          </button>
        </div>

        {workspaceTab === 'palette' ? (
          <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
            <section className="min-w-0 space-y-4">
              <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <label htmlFor="bulk-input" className="mb-2 block text-sm font-semibold">
                  Bulk Hex Input
                </label>
                <CodePaletteInput
                  id="bulk-input"
                  value={input}
                  onChange={setInput}
                  rows={5}
                  placeholder={`// Example with comments
FFFFFF, E5E0D8; 4A443F #FFD700
// Brand accents
00A3FF, FF4D8D`}
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <select
                    value={sortMode}
                    onChange={(event) => setSortMode(event.target.value as SortMode)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold"
                    aria-label="Sort colors"
                  >
                    <option value="none">No order (imported)</option>
                    <option value="hue">Hue map</option>
                    <option value="lightness">Light to dark</option>
                    <option value="name">Name (A-Z)</option>
                  </select>
                  <button
                    type="button"
                    onClick={importColors}
                    className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
                  >
                    {isLoadingNames ? 'Resolving names...' : 'Import Colors'}
                  </button>
                  <button
                    type="button"
                    onClick={exportPalette}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
                  >
                    Export String
                  </button>
                  <button
                    type="button"
                    onClick={clearWorkspace}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
                  >
                    Clear Workspace
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <input
                    value={paletteName}
                    onChange={(event) => setPaletteName(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-sky-400"
                    placeholder="Palette name"
                  />
                  <button
                    type="button"
                    onClick={savePalette}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black"
                  >
                    Save Palette
                  </button>
                </div>

                {colors.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-500">
                    Paste hex values and import to populate the workspace.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {displayColors.map((color) => (
                      <ColorCard key={color.hex} color={color} onCopy={copyHex} />
                    ))}
                  </div>
                )}
              </div>
            </section>

            <aside className="space-y-3">
              <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold">Compact Palette Map</h2>
                  <button
                    type="button"
                    onClick={exportPaletteImage}
                    className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold hover:bg-slate-50"
                  >
                    Export PNG
                  </button>
                </div>
                {colors.length === 0 ? (
                  <p className="text-xs text-slate-500">Import colors to preview the combined palette.</p>
                ) : (
                  <div className="overflow-hidden rounded-lg border border-slate-200">
                    <div className="grid grid-cols-12">
                      {displayColors.map((color) => (
                        <button
                          key={`mini-${color.hex}`}
                          type="button"
                          onClick={() => copyHex(color.hex)}
                          className="h-5 w-full transition hover:scale-110"
                          style={{ backgroundColor: `#${color.hex}` }}
                          aria-label={`Copy #${color.hex}`}
                          title={`#${color.hex}`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

            </aside>
          </div>
        ) : workspaceTab === 'contrast' ? (
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold">Contrast Lab</h2>
              <div className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                Active: {activePalette?.name ?? 'Unsaved workspace'}
              </div>
            </div>
            {displayColors.length === 0 ? (
              <p className="text-sm text-slate-500">Import colors to use drag-and-drop contrast testing.</p>
            ) : (
              <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
                <div className="space-y-3">
                  <div className="overflow-hidden rounded-lg border border-slate-200">
                    <div className="grid grid-cols-12">
                      {displayColors.map((color) => (
                        <div
                          key={`contrast-map-${color.hex}`}
                          className="h-4 w-full"
                          style={{ backgroundColor: `#${color.hex}` }}
                          title={`#${color.hex}`}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-6 gap-2 sm:grid-cols-8 lg:grid-cols-10">
                    {displayColors.map((color) => (
                      <button
                        key={`drag-${color.hex}`}
                        type="button"
                        draggable
                        onDragStart={(event) => handleDragStart(event, color.hex)}
                        onClick={() => setForegroundHex(color.hex)}
                        onContextMenu={(event) => {
                          event.preventDefault();
                          setBackgroundHex(color.hex);
                        }}
                        className="h-12 w-full rounded border border-slate-200 transition hover:scale-105"
                        style={{ backgroundColor: `#${color.hex}` }}
                        title={`#${color.hex} - Left click: Text, Right click: Background, Drag: Drop target`}
                        aria-label={`Color ${color.hex}. Left click sets text, right click sets background.`}
                      />
                    ))}
                  </div>

                  <div
                    className="rounded-xl border border-slate-200 p-8"
                    style={{
                      backgroundColor: backgroundHex ? `#${backgroundHex}` : '#ffffff',
                      color: foregroundHex ? `#${foregroundHex}` : '#0f172a',
                    }}
                  >
                    <p className="text-2xl font-bold">Preview text over background</p>
                    <p className="mt-2 text-sm">
                      Gray over purple? Purple over gray? Use the selectors or drag-and-drop targets to test both.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div
                    onDragOver={allowDrop}
                    onDrop={(event) => {
                      event.preventDefault();
                      const droppedHex = event.dataTransfer.getData('text/plain');
                      if (droppedHex) {
                        setForegroundHex(droppedHex);
                      }
                    }}
                    className="rounded-lg border border-slate-200 p-3"
                  >
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Text color</p>
                    <div
                      className="rounded p-3 text-sm font-semibold"
                      style={{
                        backgroundColor: '#f8fafc',
                        color: foregroundHex ? `#${foregroundHex}` : '#0f172a',
                      }}
                    >
                      #{foregroundHex ?? '------'}
                    </div>
                  </div>

                  <div
                    onDragOver={allowDrop}
                    onDrop={(event) => {
                      event.preventDefault();
                      const droppedHex = event.dataTransfer.getData('text/plain');
                      if (droppedHex) {
                        setBackgroundHex(droppedHex);
                      }
                    }}
                    className="rounded-lg border border-slate-200 p-3"
                  >
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Background color
                    </p>
                    <div
                      className="rounded p-3 text-sm font-semibold"
                      style={{
                        backgroundColor: backgroundHex ? `#${backgroundHex}` : '#e2e8f0',
                        color: backgroundHex ? readableTextOnHex(backgroundHex) : '#0f172a',
                      }}
                    >
                      #{backgroundHex ?? '------'}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (!foregroundHex || !backgroundHex) {
                        return;
                      }
                      setForegroundHex(backgroundHex);
                      setBackgroundHex(foregroundHex);
                    }}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50"
                  >
                    Swap Text and Background
                  </button>

                  <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                    <span className="font-semibold text-slate-700">
                      Ratio: {contrastRatio ? contrastRatio.toFixed(2) : 'N/A'}:1
                    </span>
                    <span className="rounded bg-white px-2 py-1 text-xs font-semibold text-slate-700">
                      {contrastRating}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </section>
        ) : (
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold">Color Harmony &amp; Shading Assistant</h2>
              <div className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                Active: {activePalette?.name ?? 'Unsaved workspace'}
              </div>
            </div>

            {masterPalette.length === 0 ? (
              <p className="text-sm text-slate-500">Import your master palette first to generate snapped ramps.</p>
            ) : (
              <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Master Palette</p>
                  <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-10 lg:grid-cols-12">
                    {masterPalette.map((hex) => (
                      <button
                        key={`harmony-source-${hex}`}
                        type="button"
                        onClick={() => setHarmonyBaseHex(hex)}
                        className={`h-10 rounded border-2 transition ${
                          harmonyBaseHex === hex ? 'border-sky-500 scale-105' : 'border-transparent hover:scale-105'
                        }`}
                        style={{ backgroundColor: `#${hex}` }}
                        title={`Use #${hex} as base`}
                      />
                    ))}
                  </div>

                  <div className="rounded-lg border border-slate-200 p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Sprite Preview</p>
                    <canvas ref={previewCanvasRef} width={160} height={160} className="h-40 w-40 rounded border border-slate-300" />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="rounded-lg border border-slate-200 p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Shading Ramp</p>
                    <div className="space-y-2">
                      {harmonyData
                        ? [
                            { label: 'Shadow', hex: harmonyData.ramp.shadow },
                            { label: 'Base', hex: harmonyData.ramp.base },
                            { label: 'Light', hex: harmonyData.ramp.light },
                            { label: 'Highlight', hex: harmonyData.ramp.highlight },
                          ].map((item) => (
                            <div key={item.label} className="flex items-center gap-2 rounded border border-slate-200 p-2">
                              <div className="h-8 w-8 rounded border border-slate-300" style={{ backgroundColor: `#${item.hex}` }} />
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold text-slate-700">{item.label}</p>
                                <p className="font-mono text-xs text-slate-500">#{item.hex}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => copyHex(item.hex)}
                                className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold hover:bg-slate-50"
                              >
                                Copy HEX
                              </button>
                            </div>
                          ))
                        : null}
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Harmonies</p>
                    <div className="space-y-2">
                      {harmonyData
                        ? [
                            { label: 'Complementary', hex: harmonyData.harmonies.complementary },
                            { label: 'Analogous -', hex: harmonyData.harmonies.analogousA },
                            { label: 'Analogous +', hex: harmonyData.harmonies.analogousB },
                          ].map((item) => (
                            <div key={item.label} className="flex items-center gap-2 rounded border border-slate-200 p-2">
                              <div className="h-8 w-8 rounded border border-slate-300" style={{ backgroundColor: `#${item.hex}` }} />
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold text-slate-700">{item.label}</p>
                                <p className="font-mono text-xs text-slate-500">#{item.hex}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => copyHex(item.hex)}
                                className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold hover:bg-slate-50"
                              >
                                Copy HEX
                              </button>
                            </div>
                          ))
                        : null}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}
      </main>

      {showLibrary ? (
        <div className="fixed right-4 top-20 z-40 w-[min(92vw,360px)] rounded-xl border border-slate-200 bg-white p-3 shadow-2xl">
          <h2 className="mb-2 text-sm font-semibold">Saved Palettes</h2>
          <div className="max-h-[60vh] space-y-2 overflow-auto pr-1">
            {savedPalettes.length === 0 ? (
              <p className="text-xs text-slate-500">No saved palettes yet.</p>
            ) : (
              savedPalettes.map((palette) => (
                <div key={palette.id} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => loadPalette(palette)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-left hover:bg-slate-50"
                  >
                    <p className="truncate text-sm font-medium">{palette.name}</p>
                    <p className="text-xs text-slate-500">{palette.colors.length} colors</p>
                  </button>
                  {!palette.builtIn ? (
                    <button
                      type="button"
                      onClick={() => deletePalette(palette.id, palette.name)}
                      className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                      aria-label={`Delete ${palette.name}`}
                      title={`Delete ${palette.name}`}
                    >
                      Delete
                    </button>
                  ) : (
                    <span className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-xs font-semibold text-slate-500">
                      Built-in
                    </span>
                  )}
                  </div>
                ))
            )}
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="fixed bottom-4 right-4 rounded-lg bg-slate-900 px-3 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      ) : null}
    </div>
  );
};

export default App;
