import { ColorValidationList } from '../ColorValidationList';
import type { ImageAnalysisResult } from '../../utils/imageColorAnalysis';

type CleanupRemapPanelProps = {
  analysis: ImageAnalysisResult | null;
  paletteHexes: string[];
  remaps: Record<string, string>;
  highlightedHex: string | null;
  onHighlightColor: (hex: string | null) => void;
  onSetRemap: (fromHex: string, toHex: string) => void;
  onAutoRemapAll: () => void;
  onResetRemaps: () => void;
  onExport: () => void;
};

export const CleanupRemapPanel = ({
  analysis,
  paletteHexes,
  remaps,
  highlightedHex,
  onHighlightColor,
  onSetRemap,
  onAutoRemapAll,
  onResetRemaps,
  onExport,
}: CleanupRemapPanelProps) => {
  const invalidRows = analysis?.colors.filter((row) => !row.isValid) ?? [];

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-slate-200 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cleanup Summary</p>
        {analysis ? (
          <div className="mt-2 space-y-1 text-xs text-slate-700">
            <p>Invalid colors: {analysis.invalidColorsCount}</p>
            <p>Semi-transparent pixels: {analysis.semiTransparentPixels}</p>
            <p>Current remaps: {Object.keys(remaps).length}</p>
          </div>
        ) : (
          <p className="mt-2 text-xs text-slate-500">No analysis yet.</p>
        )}
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
          Export Corrected PNG
        </button>
      </div>

      <div className="max-h-[44vh] overflow-auto rounded-lg border border-slate-200 p-2">
        {analysis ? (
          <ColorValidationList
            colors={analysis.colors}
            paletteHexes={paletteHexes}
            remaps={remaps}
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
