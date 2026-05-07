import { ColorValidationList } from '../ColorValidationList';
import type { ImageAnalysisResult } from '../../utils/imageColorAnalysis';

type ManualRemapPanelProps = {
  analysis: ImageAnalysisResult | null;
  paletteHexes: string[];
  remaps: Record<string, string>;
  lockedHexes: string[];
  highlightedHex: string | null;
  onHighlightColor: (hex: string | null) => void;
  onSetRemap: (fromHex: string, toHex: string) => void;
  onToggleLockHex: (hex: string) => void;
  onAutoRemapAll: () => void;
  onResetRemaps: () => void;
  onExport: () => void;
};

export const ManualRemapPanel = ({
  analysis,
  paletteHexes,
  remaps,
  lockedHexes,
  highlightedHex,
  onHighlightColor,
  onSetRemap,
  onToggleLockHex,
  onAutoRemapAll,
  onResetRemaps,
  onExport,
}: ManualRemapPanelProps) => {
  const invalidRows = analysis?.colors.filter((row) => !row.isValid) ?? [];

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-slate-200 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Manual Remap</p>
        <p className="mt-1 text-xs text-slate-600">
          Deterministic color replacement for cleanup and palette normalization. Locked colors are protected.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onAutoRemapAll}
          className="rounded border border-slate-300 bg-white px-3 py-2 text-xs font-semibold hover:bg-slate-50"
          disabled={!analysis || invalidRows.length === 0}
        >
          Auto Remap All
        </button>
        <button
          type="button"
          onClick={onResetRemaps}
          className="rounded border border-slate-300 bg-white px-3 py-2 text-xs font-semibold hover:bg-slate-50"
          disabled={Object.keys(remaps).length === 0}
        >
          Reset Remaps
        </button>
        <button
          type="button"
          onClick={onExport}
          className="rounded bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-black"
          disabled={!analysis}
        >
          Export PNG
        </button>
      </div>

      <div className="max-h-[44vh] overflow-auto rounded-lg border border-slate-200 p-2">
        {analysis ? (
          <ColorValidationList
            colors={analysis.colors}
            paletteHexes={paletteHexes}
            remaps={remaps}
            lockedHexes={lockedHexes}
            onToggleLockHex={onToggleLockHex}
            highlightedHex={highlightedHex}
            onHighlightColor={onHighlightColor}
            onSetRemap={onSetRemap}
          />
        ) : (
          <p className="p-2 text-xs text-slate-500">Color usage list appears after loading an image.</p>
        )}
      </div>
    </div>
  );
};
