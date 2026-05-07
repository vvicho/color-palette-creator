import { type ChangeEvent, useMemo, useState } from 'react';
import { ColorCard } from '../ColorCard';
import { CodePaletteInput } from '../CodePaletteInput';
import { HowToUsePanel } from '../HowToUsePanel';
import type { PaletteColor, PaletteGroup, SortMode } from '../../types';

type PaletteBuilderPanelProps = {
  input: string;
  setInput: (value: string) => void;
  sortMode: SortMode;
  setSortMode: (mode: SortMode) => void;
  isLoadingNames: boolean;
  onImportColors: () => void;
  onImportPaletteFiles: (files: FileList | null) => void;
  onExportPalette: () => void;
  onClearWorkspace: () => void;
  paletteName: string;
  setPaletteName: (name: string) => void;
  onSavePalette: () => void;
  displayColors: PaletteColor[];
  colors: PaletteColor[];
  paletteGroups: PaletteGroup[];
  onRegenerateGroups: () => void;
  onRenameGroup: (groupId: string, name: string) => void;
  onCreateGroup: () => void;
  onDeleteGroup: (groupId: string) => void;
  onMoveColorToGroup: (hex: string, groupId: string) => void;
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
  onImportPaletteFiles,
  onExportPalette,
  onClearWorkspace,
  paletteName,
  setPaletteName,
  onSavePalette,
  displayColors,
  colors,
  paletteGroups,
  onRegenerateGroups,
  onRenameGroup,
  onCreateGroup,
  onDeleteGroup,
  onMoveColorToGroup,
  onCopyHex,
  onExportPaletteImage,
}: PaletteBuilderPanelProps) => {
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [showGroupedView, setShowGroupedView] = useState(false);
  const colorsByHex = useMemo(() => new Map(colors.map((color) => [color.hex, color])), [colors]);

  return (
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
          <label className="cursor-pointer rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50">
            Import Palette Files
            <input
              type="file"
              accept=".txt,text/plain"
              multiple
              className="sr-only"
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                onImportPaletteFiles(event.target.files);
                event.target.value = '';
              }}
            />
          </label>
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
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowGroupedView(false)}
                className={`rounded border px-3 py-1.5 text-xs font-semibold ${
                  !showGroupedView
                    ? 'border-sky-500 bg-sky-600 text-white'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                Flat Grid
              </button>
              <button
                type="button"
                onClick={() => setShowGroupedView(true)}
                className={`rounded border px-3 py-1.5 text-xs font-semibold ${
                  showGroupedView
                    ? 'border-sky-500 bg-sky-600 text-white'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                Grouped View
              </button>
            </div>

            {!showGroupedView ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {displayColors.map((color) => (
                  <ColorCard key={color.hex} color={color} onCopy={onCopyHex} />
                ))}
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={onRegenerateGroups}
                    className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-slate-50"
                  >
                    Auto Group Colors
                  </button>
                  <button
                    type="button"
                    onClick={onCreateGroup}
                    className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-slate-50"
                  >
                    Create Group
                  </button>
                </div>
                {paletteGroups.map((group) => {
                  const isCollapsed = collapsedGroups[group.id] ?? false;
                  const groupColors = group.colorHexes.map((hex) => colorsByHex.get(hex)).filter(Boolean) as PaletteColor[];
                  return (
                    <div key={group.id} className="rounded-lg border border-slate-200 bg-slate-50/60 p-2">
                      <div className="mb-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setCollapsedGroups((previous) => ({ ...previous, [group.id]: !isCollapsed }))}
                          className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-semibold hover:bg-slate-50"
                        >
                          {isCollapsed ? 'Expand' : 'Collapse'}
                        </button>
                        <input
                          value={group.name}
                          onChange={(event) => onRenameGroup(group.id, event.target.value)}
                          className="min-w-0 flex-1 rounded border border-slate-300 bg-white px-2 py-1 text-xs font-semibold"
                        />
                        <span className="rounded bg-white px-2 py-1 text-[10px] font-semibold text-slate-600">
                          {groupColors.length} colors
                        </span>
                        <button
                          type="button"
                          onClick={() => onDeleteGroup(group.id)}
                          className="rounded border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-semibold text-rose-700 hover:bg-rose-100"
                        >
                          Delete
                        </button>
                      </div>
                      {!isCollapsed ? (
                        groupColors.length === 0 ? (
                          <p className="rounded border border-dashed border-slate-300 bg-white p-3 text-xs text-slate-500">
                            No colors in this group.
                          </p>
                        ) : (
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {groupColors.map((color) => (
                              <div key={`${group.id}-${color.hex}`} className="space-y-1">
                                <ColorCard color={color} onCopy={onCopyHex} />
                                <select
                                  value={group.id}
                                  onChange={(event) => onMoveColorToGroup(color.hex, event.target.value)}
                                  className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs"
                                >
                                  {paletteGroups.map((option) => (
                                    <option key={`target-${group.id}-${option.id}`} value={option.id}>
                                      Move to: {option.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            ))}
                          </div>
                        )
                      ) : null}
                    </div>
                  );
                })}
              </>
            )}
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
};
