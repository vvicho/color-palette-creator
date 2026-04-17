import { ColorCard } from '../ColorCard';
import { CodePaletteInput } from '../CodePaletteInput';
import { HowToUsePanel } from '../HowToUsePanel';
import type { PaletteColor, SortMode } from '../../types';

type PaletteBuilderPanelProps = {
  input: string;
  setInput: (value: string) => void;
  sortMode: SortMode;
  setSortMode: (mode: SortMode) => void;
  isLoadingNames: boolean;
  onImportColors: () => void;
  onExportPalette: () => void;
  onClearWorkspace: () => void;
  paletteName: string;
  setPaletteName: (name: string) => void;
  onSavePalette: () => void;
  displayColors: PaletteColor[];
  colors: PaletteColor[];
  onCopyHex: (hex: string) => void;
  onExportPaletteImage: () => void;
};

export const PaletteBuilderPanel = ({
  input,
  setInput,
  sortMode,
  setSortMode,
  isLoadingNames,
  onImportColors,
  onExportPalette,
  onClearWorkspace,
  paletteName,
  setPaletteName,
  onSavePalette,
  displayColors,
  colors,
  onCopyHex,
  onExportPaletteImage,
}: PaletteBuilderPanelProps) => (
  <div className="workspace-panel palette-builder-panel grid gap-4 sm:grid-cols-[1fr_220px]">
    <section className="palette-builder-panel__main min-w-0 space-y-4">
      <HowToUsePanel
        className="how-to-use--palette palette-builder-panel__howto"
        items={[
          'Paste hex codes (with or without #), commas, or line breaks. Lines starting with // are treated as comments.',
          'Choose a sort order, then Import Colors to load the workspace and fetch color names.',
          'Use Save Palette to store the current list in your Library, or Export String / PNG to take colors elsewhere.',
        ]}
      />

      <div className="palette-builder-panel__input min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
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
            onClick={onImportColors}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
          >
            {isLoadingNames ? 'Resolving names...' : 'Import Colors'}
          </button>
          <button
            type="button"
            onClick={onExportPalette}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
          >
            Export String
          </button>
          <button
            type="button"
            onClick={onClearWorkspace}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
          >
            Clear Workspace
          </button>
        </div>
      </div>

      <div className="palette-builder-panel__cards rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <input
            value={paletteName}
            onChange={(event) => setPaletteName(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-sky-400"
            placeholder="Palette name"
          />
          <button
            type="button"
            onClick={onSavePalette}
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
              <ColorCard key={color.hex} color={color} onCopy={onCopyHex} />
            ))}
          </div>
        )}
      </div>
    </section>

    <aside className="palette-builder-panel__aside space-y-3">
      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Compact Palette Map</h2>
          <button
            type="button"
            onClick={onExportPaletteImage}
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
                  onClick={() => onCopyHex(color.hex)}
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
);
