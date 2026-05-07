import { useMemo, useState } from 'react';
import type { ReadabilityReport } from '../../utils/readabilityAnalysis';

type ReadabilityAnalyzerPanelProps = {
  imageData: ImageData | null;
  imageUrl: string | null;
  readability: ReadabilityReport | null;
};

export const ReadabilityAnalyzerPanel = ({ imageData, imageUrl, readability }: ReadabilityAnalyzerPanelProps) => {
  const [zoom, setZoom] = useState<1 | 2 | 4 | 8>(2);
  const [showLowContrastOverlay, setShowLowContrastOverlay] = useState(true);
  const overlayUrl = useMemo(() => {
    if (!imageData || !readability || !showLowContrastOverlay) {
      return null;
    }
    const overlay = new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height);
    for (let index = 0; index < readability.lowContrastMask.length; index += 1) {
      const isLow = readability.lowContrastMask[index] === 255;
      if (!isLow) {
        overlay.data[index * 4 + 3] = 0;
        continue;
      }
      overlay.data[index * 4] = 255;
      overlay.data[index * 4 + 1] = 0;
      overlay.data[index * 4 + 2] = 0;
      overlay.data[index * 4 + 3] = 180;
    }
    const canvas = document.createElement('canvas');
    canvas.width = overlay.width;
    canvas.height = overlay.height;
    const context = canvas.getContext('2d');
    if (!context) {
      return null;
    }
    context.putImageData(overlay, 0, 0);
    return canvas.toDataURL('image/png');
  }, [imageData, readability, showLowContrastOverlay]);

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Readability Analysis</p>
        <div className="flex rounded border border-slate-300 bg-white p-0.5">
          {([1, 2, 4, 8] as const).map((value) => (
            <button
              key={`readability-zoom-${value}`}
              type="button"
              onClick={() => setZoom(value)}
              className={`rounded px-2 py-1 text-[10px] font-semibold ${
                zoom === value ? 'bg-sky-600 text-white' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              {value}x
            </button>
          ))}
        </div>
      </div>

      {readability ? (
        <div className="space-y-1 text-xs text-slate-700">
          <p>Local contrast: {readability.localContrastRatio.toFixed(2)}:1</p>
          <p>Low contrast zones: {(readability.lowContrastPixelRatio * 100).toFixed(1)}%</p>
          <p>Silhouette edge density: {(readability.silhouetteEdgeDensity * 100).toFixed(1)}%</p>
          <p>Outline strength: {readability.outlineStrength.toFixed(2)}:1</p>
          <p>
            Background separation:
            {` Meadow ${readability.backgroundSeparation.meadow.toFixed(2)} | Cave ${readability.backgroundSeparation.cave.toFixed(2)} | Swamp ${readability.backgroundSeparation.swamp.toFixed(2)} | Underworld ${readability.backgroundSeparation.underworld.toFixed(2)} | Neutral ${readability.backgroundSeparation.neutral.toFixed(2)}`}
          </p>
        </div>
      ) : (
        <p className="text-xs text-slate-500">Load an image to calculate readability metrics.</p>
      )}

      {readability && readability.warnings.length > 0 ? (
        <div className="rounded border border-amber-200 bg-amber-50 p-2 text-[10px] text-amber-800">
          {readability.warnings.map((warning) => (
            <p key={warning}>- {warning}</p>
          ))}
        </div>
      ) : readability ? (
        <p className="rounded border border-emerald-200 bg-emerald-50 p-2 text-[10px] text-emerald-700">
          Readability metrics look healthy.
        </p>
      ) : null}

      {imageData && imageUrl ? (
        <div className="rounded border border-slate-200 bg-slate-900 p-2">
          <label className="mb-2 flex items-center gap-2 text-[10px] text-slate-200">
            <input
              type="checkbox"
              checked={showLowContrastOverlay}
              onChange={(event) => setShowLowContrastOverlay(event.target.checked)}
            />
            Show low-contrast overlay
          </label>
          <div className="relative inline-block" style={{ width: imageData.width * zoom, height: imageData.height * zoom }}>
            <img
              src={imageUrl}
              alt="Gameplay scale preview"
              style={{ width: imageData.width * zoom, height: imageData.height * zoom, imageRendering: 'pixelated' }}
              className="absolute left-0 top-0"
            />
            {overlayUrl ? (
              <img
                src={overlayUrl}
                alt="Low contrast overlay"
                style={{ width: imageData.width * zoom, height: imageData.height * zoom, imageRendering: 'pixelated' }}
                className="absolute left-0 top-0"
              />
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
};
