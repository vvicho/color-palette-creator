import type { SavedPalette } from '../types';

type PaletteLibraryDrawerProps = {
  savedPalettes: SavedPalette[];
  onLoadPalette: (palette: SavedPalette) => void;
  onDeletePalette: (paletteId: string, paletteName: string) => void;
};

export const PaletteLibraryDrawer = ({
  savedPalettes,
  onLoadPalette,
  onDeletePalette,
}: PaletteLibraryDrawerProps) => (
  <div className="palette-library-drawer fixed right-4 top-20 z-40 w-[min(92vw,360px)] rounded-xl border border-slate-200 bg-white p-3 shadow-2xl">
    <h2 className="palette-library-drawer__title mb-2 text-sm font-semibold">Saved Palettes</h2>
    <div className="palette-library-drawer__list max-h-[60vh] space-y-2 overflow-auto pr-1">
      {savedPalettes.length === 0 ? (
        <p className="text-xs text-slate-500">No saved palettes yet.</p>
      ) : (
        savedPalettes.map((palette) => (
          <div key={palette.id} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onLoadPalette(palette)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-left hover:bg-slate-50"
            >
              <p className="truncate text-sm font-medium">{palette.name}</p>
              <p className="text-xs text-slate-500">{palette.colors.length} colors</p>
            </button>
            {!palette.builtIn ? (
              <button
                type="button"
                onClick={() => onDeletePalette(palette.id, palette.name)}
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
);
