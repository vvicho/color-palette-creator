import { useState } from 'react';
import type { ColorUsageRow } from '../utils/imageColorAnalysis';

type ColorValidationListProps = {
  colors: ColorUsageRow[];
  paletteHexes: string[];
  remaps: Record<string, string>;
  showRemapControls?: boolean;
  lockedHexes?: string[];
  onToggleLockHex?: (hex: string) => void;
  highlightedHex: string | null;
  onHighlightColor: (hex: string | null) => void;
  onSetRemap: (fromHex: string, toHex: string) => void;
};

export const ColorValidationList = ({
  colors,
  paletteHexes,
  remaps,
  showRemapControls = true,
  lockedHexes = [],
  onToggleLockHex,
  highlightedHex,
  onHighlightColor,
  onSetRemap,
}: ColorValidationListProps) => {
  const [pickerRowHex, setPickerRowHex] = useState<string | null>(null);
  const lockedSet = new Set(lockedHexes.map((hex) => hex.toUpperCase()));

  return (
    <div className="space-y-2">
      {colors.map((row) => {
        const isHighlighted = highlightedHex === row.hex;
        const currentRemap = remaps[row.hex] ?? row.nearestPaletteHex ?? '';
        const isPickerOpen = pickerRowHex === row.hex;
        const isLocked = lockedSet.has(row.hex.toUpperCase());
        return (
          <div
            key={row.hex}
            className={`rounded-lg border p-2 ${
              isLocked
                ? 'border-rose-300 bg-rose-50/40'
                : isHighlighted
                  ? 'border-sky-400 bg-sky-50'
                  : 'border-slate-200 bg-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onHighlightColor(isHighlighted ? null : row.hex)}
                className={`h-7 w-7 shrink-0 rounded border ${
                  isLocked ? 'border-rose-500 ring-1 ring-rose-300' : 'border-slate-300'
                }`}
                style={{ backgroundColor: `#${row.hex}` }}
                aria-label={`Highlight color #${row.hex}`}
                title={`Highlight #${row.hex}`}
              />
              <div className="min-w-0 flex-1">
                <p className="font-mono text-xs font-semibold text-slate-700">#{row.hex}</p>
                <p className="text-xs text-slate-500">{row.count} px</p>
              </div>
              <span
                className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                  row.isValid ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                }`}
              >
                {row.isValid ? 'Valid' : 'Invalid'}
              </span>
              {isLocked ? <span className="rounded bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">Locked</span> : null}
              {onToggleLockHex ? (
                <button
                  type="button"
                  onClick={() => onToggleLockHex(row.hex)}
                  className={`rounded border px-2 py-0.5 text-[10px] font-bold ${
                    isLocked
                      ? 'border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {isLocked ? 'Unlock' : 'Lock'}
                </button>
              ) : null}
            </div>
            {!row.isValid ? (
              <div className="relative mt-2 space-y-2">
                <p className="text-[10px] text-slate-500">
                  Nearest: {row.nearestPaletteHex ? `#${row.nearestPaletteHex}` : 'N/A'}
                  {row.nearestDistance != null ? ` (${row.nearestDistance.toFixed(1)})` : ''}
                </p>
                {showRemapControls && !isLocked ? (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={currentRemap}
                        onChange={(event) => onSetRemap(row.hex, event.target.value)}
                        className="min-w-0 flex-1 rounded border border-slate-300 bg-white px-2 py-1 text-xs"
                      >
                        <option value="">No remap</option>
                        {paletteHexes.map((hex) => (
                          <option key={hex} value={hex}>
                            #{hex}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setPickerRowHex((current) => (current === row.hex ? null : row.hex))}
                        className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-semibold hover:bg-slate-50"
                      >
                        Pick from palette
                      </button>
                    </div>
                    {isPickerOpen ? (
                      <div className="absolute z-20 mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 shadow-xl">
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Palette Picker</p>
                          <button
                            type="button"
                            onClick={() => setPickerRowHex(null)}
                            className="rounded border border-slate-300 px-1.5 py-0.5 text-[10px] font-semibold hover:bg-slate-50"
                          >
                            Close
                          </button>
                        </div>
                        <div className="max-h-40 overflow-auto rounded border border-slate-200 bg-slate-50 p-1">
                          <div className="grid grid-cols-6 gap-1">
                            {paletteHexes.map((hex) => {
                              const isSelected = currentRemap === hex;
                              const isSuggested = row.nearestPaletteHex === hex;
                              return (
                                <button
                                  key={`popup-swatch-${row.hex}-${hex}`}
                                  type="button"
                                  onClick={() => {
                                    onSetRemap(row.hex, isSelected ? '' : hex);
                                    setPickerRowHex(null);
                                  }}
                                  className={`rounded border p-1 text-[10px] font-mono transition ${
                                    isSelected
                                      ? 'border-sky-500 ring-1 ring-sky-300'
                                      : isSuggested
                                        ? 'border-amber-400 ring-1 ring-amber-200'
                                        : 'border-slate-300 hover:border-slate-400'
                                  }`}
                                  title={`Remap #${row.hex} -> #${hex}${isSuggested ? ' (suggested)' : ''}`}
                                >
                                  <span
                                    className="mb-1 block h-4 w-full rounded border border-slate-300"
                                    style={{ backgroundColor: `#${hex}` }}
                                  />
                                  <span className="block truncate text-slate-600">#{hex}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <p className="mt-1 text-[10px] text-slate-500">
                          Suggested color is highlighted in amber. Selected replacement is blue.
                        </p>
                      </div>
                    ) : null}
                  </>
                ) : null}
                {currentRemap ? (
                  <div className="rounded border border-slate-200 bg-slate-50 p-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Remap</p>
                    <div className="mt-1 flex items-center gap-2 text-[11px] font-mono text-slate-700">
                      <span className="h-4 w-4 rounded border border-slate-300" style={{ backgroundColor: `#${row.hex}` }} />
                      <span>#{row.hex}</span>
                      <span className="text-slate-400">-&gt;</span>
                      <span
                        className="h-4 w-4 rounded border border-slate-300"
                        style={{ backgroundColor: `#${currentRemap}` }}
                      />
                      <span>#{currentRemap}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-500">No replacement selected.</p>
                )}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};
