import { ColorValidationList } from '../ColorValidationList';
import { HowToUsePanel } from '../HowToUsePanel';
import type { FrameConsistencyWarning } from '../../utils/animationConsistency';
import type { ImageAnalysisResult } from '../../utils/imageColorAnalysis';
import { ReadabilityAnalyzerPanel } from './ReadabilityAnalyzerPanel';
import type { ReadabilityReport } from '../../utils/readabilityAnalysis';

type ValidationPanelProps = {
  analysis: ImageAnalysisResult | null;
  paletteHexes: string[];
  maxColorCount: number;
  onSetMaxColorCount: (value: number) => void;
  isSpriteSheet: boolean;
  onSetIsSpriteSheet: (value: boolean) => void;
  frameWidth: number;
  frameHeight: number;
  frameSpacing: number;
  frameMargin: number;
  onSetFrameWidth: (value: number) => void;
  onSetFrameHeight: (value: number) => void;
  onSetFrameSpacing: (value: number) => void;
  onSetFrameMargin: (value: number) => void;
  frameCount: number;
  hoveredFrameIndex: number | null;
  selectedFrameIndex: number | null;
  showSelectedFrameOnly: boolean;
  onSetShowSelectedFrameOnly: (value: boolean) => void;
  onSetSelectedFrameIndex: (value: number | null) => void;
  frameWarnings: FrameConsistencyWarning[];
  readability: ReadabilityReport | null;
  imageData: ImageData | null;
  imageUrl: string | null;
  highlightedHex: string | null;
  onHighlightColor: (hex: string | null) => void;
};

export const ValidationPanel = ({
  analysis,
  paletteHexes,
  maxColorCount,
  onSetMaxColorCount,
  isSpriteSheet,
  onSetIsSpriteSheet,
  frameWidth,
  frameHeight,
  frameSpacing,
  frameMargin,
  onSetFrameWidth,
  onSetFrameHeight,
  onSetFrameSpacing,
  onSetFrameMargin,
  frameCount,
  hoveredFrameIndex,
  selectedFrameIndex,
  showSelectedFrameOnly,
  onSetShowSelectedFrameOnly,
  onSetSelectedFrameIndex,
  frameWarnings,
  readability,
  imageData,
  imageUrl,
  highlightedHex,
  onHighlightColor,
}: ValidationPanelProps) => (
  <div className="space-y-3">
    <HowToUsePanel
      className="how-to-use--validator-validation"
      items={[
        'Enable "Is sprite sheet" only for sheets; leave off for single sprites.',
        'For sheets, set frame width/height (plus spacing/margin) to detect frame boundaries.',
        'Click warning rows to jump to problematic frames; use "Show selected frame only" for focused checks.',
        'Readability analysis below uses the selected frame when available.',
      ]}
    />

    <div className="rounded-lg border border-slate-200 p-3">
      <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
        <input type="checkbox" checked={isSpriteSheet} onChange={(event) => onSetIsSpriteSheet(event.target.checked)} />
        Is sprite sheet
      </label>
    </div>

    {isSpriteSheet ? (
      <div className="rounded-lg border border-slate-200 p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Sprite Sheet Grid</p>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-[10px] text-slate-600">
          Frame W
          <input
            type="number"
            min={1}
            value={frameWidth}
            onChange={(event) => onSetFrameWidth(Number(event.target.value) || 1)}
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-xs"
          />
        </label>
        <label className="text-[10px] text-slate-600">
          Frame H
          <input
            type="number"
            min={1}
            value={frameHeight}
            onChange={(event) => onSetFrameHeight(Number(event.target.value) || 1)}
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-xs"
          />
        </label>
        <label className="text-[10px] text-slate-600">
          Spacing
          <input
            type="number"
            min={0}
            value={frameSpacing}
            onChange={(event) => onSetFrameSpacing(Number(event.target.value) || 0)}
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-xs"
          />
        </label>
        <label className="text-[10px] text-slate-600">
          Margin
          <input
            type="number"
            min={0}
            value={frameMargin}
            onChange={(event) => onSetFrameMargin(Number(event.target.value) || 0)}
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-xs"
          />
        </label>
      </div>
      <div className="mt-2 text-xs text-slate-700">
        <p>Detected frames: {frameCount}</p>
        <p>Hovered frame: {hoveredFrameIndex != null ? hoveredFrameIndex + 1 : 'None'}</p>
        <p>Selected frame: {selectedFrameIndex != null ? selectedFrameIndex + 1 : 'None'}</p>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <label className="flex items-center gap-2 text-[10px] text-slate-600">
          <input
            type="checkbox"
            checked={showSelectedFrameOnly}
            onChange={(event) => onSetShowSelectedFrameOnly(event.target.checked)}
          />
          Show selected frame only
        </label>
        <select
          value={selectedFrameIndex ?? ''}
          onChange={(event) => onSetSelectedFrameIndex(event.target.value === '' ? null : Number(event.target.value))}
          className="rounded border border-slate-300 bg-white px-2 py-1 text-[10px]"
        >
          <option value="">No frame selected</option>
          {Array.from({ length: frameCount }).map((_, index) => (
            <option key={`frame-select-${index}`} value={index}>
              Frame {index + 1}
            </option>
          ))}
        </select>
      </div>
      {frameWarnings.length > 0 ? (
        <div className="mt-2 max-h-24 space-y-1 overflow-auto rounded border border-amber-200 bg-amber-50 p-2 text-[10px] text-amber-800">
          {frameWarnings.slice(0, 8).map((warning) => (
            <button
              key={`${warning.frameIndex}-${warning.message}`}
              type="button"
              onClick={() => onSetSelectedFrameIndex(warning.frameIndex)}
              className="block w-full text-left underline decoration-dotted underline-offset-2 hover:text-amber-900"
            >
              - {warning.message}
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-[10px] text-slate-500">No frame consistency warnings.</p>
      )}
      </div>
    ) : null}

    <div className="rounded-lg border border-slate-200 p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Validation Summary</p>
        <input
          type="number"
          min={1}
          max={2048}
          value={maxColorCount}
          onChange={(event) => onSetMaxColorCount(Number(event.target.value) || 1)}
          className="w-20 rounded border border-slate-300 px-2 py-1 text-xs"
          title="Max allowed unique colors"
        />
      </div>
      {analysis ? (
        <div className="space-y-1 text-xs text-slate-700">
          <p>Total colors: {analysis.uniqueColorsCount}</p>
          <p>Invalid colors: {analysis.invalidColorsCount}</p>
          <p>Semi-transparent pixels: {analysis.semiTransparentPixels}</p>
          <p>
            Palette used: {analysis.paletteColorsUsed}/{paletteHexes.length}
          </p>
          <p>Unused palette colors: {analysis.unusedPaletteColors.length}</p>
          <p>
            Image size: {analysis.width}x{analysis.height}
          </p>
          {analysis.exceedsColorLimit ? (
            <p className="font-semibold text-amber-700">Warning: exceeds max color count threshold.</p>
          ) : null}
        </div>
      ) : (
        <p className="text-xs text-slate-500">No analysis yet.</p>
      )}
    </div>

    <div className="max-h-[44vh] overflow-auto rounded-lg border border-slate-200 p-2">
      {analysis ? (
        <ColorValidationList
          colors={analysis.colors}
          paletteHexes={paletteHexes}
          remaps={{}}
          showRemapControls={false}
          highlightedHex={highlightedHex}
          onHighlightColor={onHighlightColor}
          onSetRemap={() => {}}
        />
      ) : (
        <p className="p-2 text-xs text-slate-500">Color usage list appears after loading an image.</p>
      )}
    </div>

    <ReadabilityAnalyzerPanel imageData={imageData} imageUrl={imageUrl} readability={readability} />
  </div>
);
