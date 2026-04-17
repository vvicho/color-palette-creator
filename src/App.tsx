import { type DragEvent, useEffect, useMemo, useState } from 'react';
import { PaletteLibraryDrawer } from './components/PaletteLibraryDrawer';
import { WorkspaceTabBar } from './components/WorkspaceTabBar';
import { ContrastLabPanel } from './components/tabs/ContrastLabPanel';
import { HarmonyAssistantPanel } from './components/tabs/HarmonyAssistantPanel';
import { PaletteBuilderPanel } from './components/tabs/PaletteBuilderPanel';
import { useLocalStorage } from './hooks/useLocalStorage';
import { fetchColorName } from './services/colorApi';
import { DEFAULT_BASE_PALETTE, DEFAULT_BASE_PALETTE_ID } from './data/defaultPalette';
import type { PaletteColor, SavedPalette, SortMode, WorkspaceTab } from './types';
import { sortColorsByHue, sortColorsByLightness, sortColorsByName } from './utils/colorSort';
import { contrastRatioHex } from './utils/colorSpace';
import { parseHexInput } from './utils/hexParser';
import {
  COMPACT_MAP_COLUMNS,
  STORAGE_KEYS,
  createPaletteId,
  formatExport,
  sanitizeFileName,
} from './constants';

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

  const contrastRatio = useMemo(() => {
    if (!foregroundHex || !backgroundHex) {
      return null;
    }
    return contrastRatioHex(foregroundHex, backgroundHex);
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

  const activePaletteLabel = `Active: ${activePalette?.name ?? 'Unsaved workspace'}`;

  return (
    <div className="app-root min-h-screen bg-slate-100 text-slate-900">
      <header className="app-header border-b border-slate-200 bg-white">
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

      <main className="app-main mx-auto max-w-7xl space-y-4 px-4 py-4 sm:px-6">
        <WorkspaceTabBar workspaceTab={workspaceTab} onSelectTab={setWorkspaceTab} />

        {workspaceTab === 'palette' ? (
          <PaletteBuilderPanel
            input={input}
            setInput={setInput}
            sortMode={sortMode}
            setSortMode={setSortMode}
            isLoadingNames={isLoadingNames}
            onImportColors={importColors}
            onExportPalette={exportPalette}
            onClearWorkspace={clearWorkspace}
            paletteName={paletteName}
            setPaletteName={setPaletteName}
            onSavePalette={savePalette}
            displayColors={displayColors}
            colors={colors}
            onCopyHex={copyHex}
            onExportPaletteImage={exportPaletteImage}
          />
        ) : workspaceTab === 'contrast' ? (
          <ContrastLabPanel
            activePaletteLabel={activePaletteLabel}
            displayColors={displayColors}
            foregroundHex={foregroundHex}
            backgroundHex={backgroundHex}
            setForegroundHex={setForegroundHex}
            setBackgroundHex={setBackgroundHex}
            contrastRatio={contrastRatio}
            contrastRating={contrastRating}
            onDragStart={handleDragStart}
            allowDrop={allowDrop}
          />
        ) : (
          <HarmonyAssistantPanel
            masterPalette={masterPalette}
            activePaletteLabel={activePaletteLabel}
            onToast={showToast}
            onCopyHex={copyHex}
          />
        )}
      </main>

      {showLibrary ? (
        <PaletteLibraryDrawer
          savedPalettes={savedPalettes}
          onLoadPalette={loadPalette}
          onDeletePalette={deletePalette}
        />
      ) : null}

      {toast ? (
        <div className="app-toast fixed bottom-4 right-4 rounded-lg bg-slate-900 px-3 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      ) : null}
    </div>
  );
};

export default App;
