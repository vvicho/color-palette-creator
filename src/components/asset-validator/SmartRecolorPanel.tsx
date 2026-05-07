import { useEffect, useMemo, useState } from 'react';
import type { ImageAnalysisResult } from '../../utils/imageColorAnalysis';
import { generateRampRecolorMapping } from '../../utils/recolorMapping';
import { detectRampFromSeed } from '../../utils/smartRampDetection';
import { HowToUsePanel } from '../HowToUsePanel';

type SmartRecolorPanelProps = {
  analysis: ImageAnalysisResult | null;
  paletteHexes: string[];
  lockedHexes: string[];
  selectedHexes: string[];
  highlightedHex: string | null;
  remaps: Record<string, string>;
  onSetSelectedHexes: (hexes: string[]) => void;
  onSetLockedHexes: (hexes: string[]) => void;
  onMergeRemaps: (mapping: Record<string, string>) => void;
  onExport: () => void;
};

export const SmartRecolorPanel = ({
  analysis,
  paletteHexes,
  lockedHexes,
  selectedHexes,
  highlightedHex,
  remaps,
  onSetSelectedHexes,
  onSetLockedHexes,
  onMergeRemaps,
  onExport,
}: SmartRecolorPanelProps) => {
  const [sourceSeedHex, setSourceSeedHex] = useState<string>('');
  const [targetSeedHex, setTargetSeedHex] = useState<string>('');

  const imageHexes = useMemo(() => analysis?.colors.map((row) => row.hex) ?? [], [analysis]);
  const lockedSet = useMemo(() => new Set(lockedHexes.map((hex) => hex.toUpperCase())), [lockedHexes]);
  const selectedSet = useMemo(() => new Set(selectedHexes.map((hex) => hex.toUpperCase())), [selectedHexes]);

  const expandSourceRamp = () => {
    if (!sourceSeedHex || !analysis) {
      return;
    }
    const ramp = detectRampFromSeed(
      analysis.colors.map((row) => row.hex),
      sourceSeedHex,
      lockedHexes,
      { maxRampSize: 8 },
    );
    onSetSelectedHexes([...new Set([...selectedHexes, ...ramp])]);
  };

  const applySmartRecolor = () => {
    if (!targetSeedHex || selectedHexes.length === 0) {
      return;
    }
    const targetRamp = detectRampFromSeed(paletteHexes, targetSeedHex, [], { maxRampSize: Math.max(selectedHexes.length, 3) });
    const mapping = generateRampRecolorMapping(selectedHexes, targetRamp, lockedHexes);
    onMergeRemaps(mapping);
  };

  useEffect(() => {
    if (!highlightedHex) {
      return;
    }
    const normalized = highlightedHex.toUpperCase();
    if (imageHexes.includes(normalized)) {
      setSourceSeedHex(normalized);
    }
  }, [highlightedHex, imageHexes]);

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-violet-200 bg-violet-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">Smart Recolor</p>
        <p className="mt-1 text-xs text-violet-800">
          Seed a source color, expand a probable ramp, choose a target seed, and generate a lightness-preserving recolor map.
        </p>
      </div>

      <HowToUsePanel
        className="how-to-use--smart-recolor"
        items={[
          'Click a swatch (or image pixel) to set source seed and select that color.',
          'Shift+click adds to selection, Alt+click removes; the Select/Deselect buttons do the same explicitly.',
          'Right-click a swatch or use Lock/Unlock to protect colors from remapping.',
          'Use Expand Ramp to include nearby tones, then choose target seed and Generate Smart Mapping.',
        ]}
      />

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-200 p-2">
          <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Source Seed</label>
          <select
            value={sourceSeedHex}
            onChange={(event) => setSourceSeedHex(event.target.value)}
            className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs"
          >
            <option value="">Select source color</option>
            {imageHexes.map((hex) => (
              <option key={`source-${hex}`} value={hex}>
                #{hex}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={expandSourceRamp}
            className="mt-2 rounded border border-slate-300 bg-white px-2 py-1 text-xs font-semibold hover:bg-slate-50"
            disabled={!sourceSeedHex}
          >
            Expand Ramp
          </button>
        </div>
        <div className="rounded-lg border border-slate-200 p-2">
          <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Target Seed</label>
          <select
            value={targetSeedHex}
            onChange={(event) => setTargetSeedHex(event.target.value)}
            className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs"
          >
            <option value="">Select target color</option>
            {paletteHexes.map((hex) => (
              <option key={`target-${hex}`} value={hex}>
                #{hex}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={applySmartRecolor}
            className="mt-2 rounded border border-slate-300 bg-white px-2 py-1 text-xs font-semibold hover:bg-slate-50"
            disabled={!targetSeedHex || selectedHexes.length === 0}
          >
            Generate Smart Mapping
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onExport}
          className="rounded bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-black"
          disabled={!analysis}
        >
          Export PNG
        </button>
        <p className="self-center text-xs text-slate-600">
          Selected: {selectedHexes.length} | Locked: {lockedHexes.length} | Active remaps: {Object.keys(remaps).length}
        </p>
      </div>

      <div className="max-h-[44vh] overflow-auto rounded-lg border border-slate-200 p-2">
        {analysis ? (
          <div className="space-y-2">
            {analysis.colors.map((row) => {
              const isSelected = selectedSet.has(row.hex.toUpperCase());
              const isLocked = lockedSet.has(row.hex.toUpperCase());
              return (
                <div
                  key={`smart-${row.hex}`}
                  className={`flex items-center gap-2 rounded border p-2 ${
                    isLocked ? 'border-rose-300 bg-rose-50/40' : 'border-slate-200'
                  }`}
                >
                  <button
                    type="button"
                    onClick={(event) => {
                      if (event.shiftKey) {
                        onSetSelectedHexes([...new Set([...selectedHexes, row.hex])]);
                        return;
                      }
                      if (event.altKey) {
                        onSetSelectedHexes(selectedHexes.filter((hex) => hex !== row.hex));
                        return;
                      }
                      setSourceSeedHex(row.hex);
                      onSetSelectedHexes([row.hex]);
                    }}
                    onContextMenu={(event) => {
                      event.preventDefault();
                      if (isLocked) {
                        onSetLockedHexes(lockedHexes.filter((hex) => hex !== row.hex));
                      } else {
                        onSetLockedHexes([...new Set([...lockedHexes, row.hex])]);
                      }
                    }}
                    className={`h-7 w-7 rounded border ${isLocked ? 'border-rose-500 ring-1 ring-rose-300' : 'border-slate-300'}`}
                    style={{ backgroundColor: `#${row.hex}` }}
                    title="Click seed/select, Shift+Click add, Alt+Click remove, Right-click lock"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs text-slate-700">#{row.hex}</p>
                    <p className="text-[10px] text-slate-500">{row.count} px</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        onSetSelectedHexes(selectedHexes.filter((hex) => hex !== row.hex));
                      } else {
                        onSetSelectedHexes([...new Set([...selectedHexes, row.hex])]);
                        setSourceSeedHex(row.hex);
                      }
                    }}
                    className={`rounded border px-2 py-0.5 text-[10px] font-bold ${
                      isSelected
                        ? 'border-sky-300 bg-sky-50 text-sky-700 hover:bg-sky-100'
                        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {isSelected ? 'Deselect' : 'Select'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (isLocked) {
                        onSetLockedHexes(lockedHexes.filter((hex) => hex !== row.hex));
                      } else {
                        onSetLockedHexes([...new Set([...lockedHexes, row.hex])]);
                      }
                    }}
                    className={`rounded border px-2 py-0.5 text-[10px] font-bold ${
                      isLocked
                        ? 'border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100'
                        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {isLocked ? 'Unlock' : 'Lock'}
                  </button>
                  {isSelected ? <span className="rounded bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700">Selected</span> : null}
                  {isLocked ? <span className="rounded bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">Locked</span> : null}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="p-2 text-xs text-slate-500">Load an image to start smart recolor.</p>
        )}
      </div>
    </div>
  );
};
