import { useMemo, useState } from 'react';
import type { ImageAnalysisResult } from '../../utils/imageColorAnalysis';
import { generateRampRecolorMapping } from '../../utils/recolorMapping';
import { detectRampFromSeed } from '../../utils/smartRampDetection';
import { ManualRemapPanel } from './ManualRemapPanel';
import { SmartRecolorPanel } from './SmartRecolorPanel';

type ColorTransformMode = 'manual-remap' | 'smart-recolor';

type ColorTransformPanelProps = {
  analysis: ImageAnalysisResult | null;
  paletteHexes: string[];
  remaps: Record<string, string>;
  lockedHexes: string[];
  selectedHexes: string[];
  highlightedHex: string | null;
  onHighlightColor: (hex: string | null) => void;
  onSetRemap: (fromHex: string, toHex: string) => void;
  onToggleLockHex: (hex: string) => void;
  onAutoRemapAll: () => void;
  onResetRemaps: () => void;
  onMergeRemaps: (mapping: Record<string, string>) => void;
  onSetLockedHexes: (hexes: string[]) => void;
  onSetSelectedHexes: (hexes: string[]) => void;
  onSetPreviewRemaps: (mapping: Record<string, string>) => void;
  onExport: () => void;
};

export const ColorTransformPanel = ({
  analysis,
  paletteHexes,
  remaps,
  lockedHexes,
  selectedHexes,
  highlightedHex,
  onHighlightColor,
  onSetRemap,
  onToggleLockHex,
  onAutoRemapAll,
  onResetRemaps,
  onMergeRemaps,
  onSetLockedHexes,
  onSetSelectedHexes,
  onSetPreviewRemaps,
  onExport,
}: ColorTransformPanelProps) => {
  const [mode, setMode] = useState<ColorTransformMode>('manual-remap');
  const sourceHex = highlightedHex?.toUpperCase() ?? null;
  const selectedUpper = useMemo(() => selectedHexes.map((hex) => hex.toUpperCase()), [selectedHexes]);
  const lockedSet = useMemo(() => new Set(lockedHexes.map((hex) => hex.toUpperCase())), [lockedHexes]);
  const canManualPreview = mode === 'manual-remap' && !!sourceHex && !lockedSet.has(sourceHex);
  const canSmartPreview = mode === 'smart-recolor' && selectedUpper.length > 0;

  const buildSmartMapping = (targetSeed: string) => {
    if (!canSmartPreview) {
      return {};
    }
    const targetRamp = detectRampFromSeed(paletteHexes, targetSeed, [], { maxRampSize: Math.max(selectedUpper.length, 3) });
    return generateRampRecolorMapping(selectedUpper, targetRamp, lockedHexes);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {([
          { id: 'manual-remap', label: 'Manual Remap' },
          { id: 'smart-recolor', label: 'Smart Recolor' },
        ] as const).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setMode(item.id)}
            className={`rounded border px-3 py-1.5 text-xs font-semibold ${
              mode === item.id
                ? 'border-sky-500 bg-sky-600 text-white'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-slate-200 p-2">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Compact Palette Picker</p>
        <p className="mb-2 text-xs text-slate-600">
          {mode === 'manual-remap'
            ? sourceHex
              ? `Manual: hover a palette swatch to preview #${sourceHex} replacement. Click to commit.`
              : 'Manual: click a pixel/color first to choose the source color.'
            : selectedUpper.length > 0
              ? 'Smart: hover a palette swatch to preview ramp recolor. Click to commit mapping.'
              : 'Smart: select seed/ramp colors first (including image click).'}
        </p>
        <div className="grid grid-cols-8 gap-1 sm:grid-cols-10">
          {paletteHexes.map((hex) => (
            <button
              key={`compact-${hex}`}
              type="button"
              onMouseEnter={() => {
                if (canManualPreview && sourceHex) {
                  onSetPreviewRemaps({ [sourceHex]: hex });
                  return;
                }
                if (canSmartPreview) {
                  onSetPreviewRemaps(buildSmartMapping(hex));
                }
              }}
              onMouseLeave={() => onSetPreviewRemaps({})}
              onClick={() => {
                if (canManualPreview && sourceHex) {
                  onSetRemap(sourceHex, hex);
                  onSetPreviewRemaps({});
                  return;
                }
                if (canSmartPreview) {
                  onMergeRemaps(buildSmartMapping(hex));
                  onSetPreviewRemaps({});
                }
              }}
              className="h-7 rounded border border-slate-300 transition hover:scale-105"
              style={{ backgroundColor: `#${hex}` }}
              title={`#${hex}`}
            />
          ))}
        </div>
      </div>

      {mode === 'manual-remap' ? (
        <ManualRemapPanel
          analysis={analysis}
          paletteHexes={paletteHexes}
          remaps={remaps}
          lockedHexes={lockedHexes}
          highlightedHex={highlightedHex}
          onHighlightColor={onHighlightColor}
          onSetRemap={onSetRemap}
          onToggleLockHex={onToggleLockHex}
          onAutoRemapAll={onAutoRemapAll}
          onResetRemaps={onResetRemaps}
          onExport={onExport}
        />
      ) : (
        <SmartRecolorPanel
          analysis={analysis}
          paletteHexes={paletteHexes}
          lockedHexes={lockedHexes}
          selectedHexes={selectedHexes}
          highlightedHex={highlightedHex}
          remaps={remaps}
          onSetSelectedHexes={onSetSelectedHexes}
          onSetLockedHexes={onSetLockedHexes}
          onMergeRemaps={onMergeRemaps}
          onExport={onExport}
        />
      )}
    </div>
  );
};
