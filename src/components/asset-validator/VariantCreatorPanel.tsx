import { ColorValidationList } from '../ColorValidationList';
import type { ImageAnalysisResult } from '../../utils/imageColorAnalysis';

type VariantCreatorPanelProps = {
  analysis: ImageAnalysisResult | null;
  paletteHexes: string[];
  remaps: Record<string, string>;
  highlightedHex: string | null;
  onHighlightColor: (hex: string | null) => void;
  onSetRemap: (fromHex: string, toHex: string) => void;
  onExport: () => void;
};

export const VariantCreatorPanel = ({
  analysis,
  paletteHexes,
  remaps,
  highlightedHex,
  onHighlightColor,
  onSetRemap,
  onExport,
}: VariantCreatorPanelProps) => (
  <div className="space-y-3">
    <div className="rounded-lg border border-violet-200 bg-violet-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">Variant Creator</p>
      <p className="mt-1 text-xs text-violet-800">
        Creative recolor mode is now inside Asset Validator and shares the same uploaded image, preview, and remap table.
      </p>
      <p className="mt-1 text-xs text-violet-700">
        Use remaps below to build variants now. Presets and ramp-aware variant tools can be layered into this mode next.
      </p>
    </div>

    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={onExport}
        className="rounded bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-black"
        disabled={!analysis}
      >
        Export Variant PNG
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
