import { type ChangeEvent, type DragEvent, useEffect, useMemo, useState } from 'react';
import { ColorTransformPanel } from '../asset-validator/ColorTransformPanel';
import { ValidationPanel } from '../asset-validator/ValidationPanel';
import { HowToUsePanel } from '../HowToUsePanel';
import { ImageAnalysisPreview } from '../ImageAnalysisPreview';
import { analyzeFrameConsistency } from '../../utils/animationConsistency';
import { analyzeImageColors } from '../../utils/imageColorAnalysis';
import { analyzeReadability } from '../../utils/readabilityAnalysis';
import { applyRemapsToImageData, exportImageDataAsPng } from '../../utils/imageRemap';
import { parseSpriteSheetFrames, type SpriteSheetGridConfig } from '../../utils/spriteSheetParser';
import { sanitizeFileName } from '../../constants';

type AssetValidatorPanelProps = {
  paletteHexes: string[];
  activePaletteLabel: string;
  onToast: (message: string) => void;
};

const MAX_IMAGE_DIMENSION = 2048;
type AssetValidatorMode = 'validation' | 'color-transform';

const loadPngImageData = async (file: File): Promise<{ imageData: ImageData; imageUrl: string; fileName: string }> => {
  if (!file.type.includes('png') && !file.name.toLowerCase().endsWith('.png')) {
    throw new Error('Only PNG files are supported');
  }

  const imageUrl = URL.createObjectURL(file);
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageUrl;
  });

  if (image.width > MAX_IMAGE_DIMENSION || image.height > MAX_IMAGE_DIMENSION) {
    URL.revokeObjectURL(imageUrl);
    throw new Error(`Image is too large. Max supported size is ${MAX_IMAGE_DIMENSION}x${MAX_IMAGE_DIMENSION}.`);
  }

  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext('2d');
  if (!context) {
    URL.revokeObjectURL(imageUrl);
    throw new Error('Failed to create analysis context');
  }
  context.imageSmoothingEnabled = false;
  context.drawImage(image, 0, 0);
  const imageData = context.getImageData(0, 0, image.width, image.height);

  return { imageData, imageUrl, fileName: file.name.replace(/\.png$/i, '') };
};

export const AssetValidatorPanel = ({ paletteHexes, activePaletteLabel, onToast }: AssetValidatorPanelProps) => {
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [fileNameBase, setFileNameBase] = useState('asset');
  const [zoom, setZoom] = useState<1 | 2 | 4 | 8>(4);
  const [highlightedHex, setHighlightedHex] = useState<string | null>(null);
  const [maxColorCount, setMaxColorCount] = useState(64);
  const [frameGrid, setFrameGrid] = useState<SpriteSheetGridConfig>({
    frameWidth: 32,
    frameHeight: 32,
    spacing: 0,
    margin: 0,
  });
  const [isSpriteSheet, setIsSpriteSheet] = useState(false);
  const [hoveredFrameIndex, setHoveredFrameIndex] = useState<number | null>(null);
  const [selectedFrameIndex, setSelectedFrameIndex] = useState<number | null>(null);
  const [showSelectedFrameOnly, setShowSelectedFrameOnly] = useState(false);
  const [remaps, setRemaps] = useState<Record<string, string>>({});
  const [previewRemaps, setPreviewRemaps] = useState<Record<string, string>>({});
  const [lockedHexes, setLockedHexes] = useState<string[]>([]);
  const [smartSelectedHexes, setSmartSelectedHexes] = useState<string[]>([]);
  const [activeMode, setActiveMode] = useState<AssetValidatorMode>('validation');

  const analysis = useMemo(() => {
    if (!imageData) {
      return null;
    }
    return analyzeImageColors(imageData, paletteHexes, maxColorCount);
  }, [imageData, maxColorCount, paletteHexes]);

  const remappedImageData = useMemo(() => {
    if (!imageData) {
      return null;
    }
    const effectiveRemaps = { ...remaps, ...previewRemaps };
    if (Object.keys(effectiveRemaps).length === 0) {
      return imageData;
    }
    return applyRemapsToImageData(imageData, effectiveRemaps);
  }, [imageData, previewRemaps, remaps]);
  const spriteFrames = useMemo(() => {
    if (!imageData || !isSpriteSheet) {
      return [];
    }
    return parseSpriteSheetFrames(imageData.width, imageData.height, frameGrid);
  }, [frameGrid, imageData, isSpriteSheet]);
  const frameWarnings = useMemo(() => {
    if (!imageData || !isSpriteSheet || spriteFrames.length === 0) {
      return [];
    }
    return analyzeFrameConsistency(imageData, spriteFrames, paletteHexes);
  }, [imageData, isSpriteSheet, paletteHexes, spriteFrames]);
  const issueFrameIndexes = useMemo(
    () => [...new Set(frameWarnings.map((warning) => warning.frameIndex))],
    [frameWarnings],
  );
  const remappedPreviewUrl = useMemo(() => {
    if (!remappedImageData) {
      return null;
    }
    const canvas = document.createElement('canvas');
    canvas.width = remappedImageData.width;
    canvas.height = remappedImageData.height;
    const context = canvas.getContext('2d');
    if (!context) {
      return null;
    }
    context.putImageData(remappedImageData, 0, 0);
    return canvas.toDataURL('image/png');
  }, [remappedImageData]);
  const selectedFrameRect = useMemo(
    () =>
      isSpriteSheet && selectedFrameIndex != null && selectedFrameIndex >= 0 && selectedFrameIndex < spriteFrames.length
        ? spriteFrames[selectedFrameIndex]
        : null,
    [isSpriteSheet, selectedFrameIndex, spriteFrames],
  );
  useEffect(() => {
    if (spriteFrames.length === 0) {
      if (selectedFrameIndex !== null) {
        setSelectedFrameIndex(null);
      }
      return;
    }
    if (selectedFrameIndex == null || selectedFrameIndex >= spriteFrames.length) {
      setSelectedFrameIndex(0);
    }
  }, [selectedFrameIndex, spriteFrames]);
  const cropImageData = (source: ImageData, x: number, y: number, width: number, height: number) => {
    const output = new ImageData(width, height);
    for (let row = 0; row < height; row += 1) {
      const srcStart = ((y + row) * source.width + x) * 4;
      const srcEnd = srcStart + width * 4;
      const destStart = row * width * 4;
      output.data.set(source.data.slice(srcStart, srcEnd), destStart);
    }
    return output;
  };
  const focusedOriginalImageData = useMemo(() => {
    if (!imageData || !showSelectedFrameOnly || !selectedFrameRect) {
      return imageData;
    }
    return cropImageData(imageData, selectedFrameRect.x, selectedFrameRect.y, selectedFrameRect.width, selectedFrameRect.height);
  }, [imageData, selectedFrameRect, showSelectedFrameOnly]);
  const focusedRemappedImageData = useMemo(() => {
    if (!remappedImageData || !showSelectedFrameOnly || !selectedFrameRect) {
      return remappedImageData;
    }
    return cropImageData(
      remappedImageData,
      selectedFrameRect.x,
      selectedFrameRect.y,
      selectedFrameRect.width,
      selectedFrameRect.height,
    );
  }, [remappedImageData, selectedFrameRect, showSelectedFrameOnly]);
  const imageDataToDataUrl = (source: ImageData | null) => {
    if (!source) {
      return null;
    }
    const canvas = document.createElement('canvas');
    canvas.width = source.width;
    canvas.height = source.height;
    const context = canvas.getContext('2d');
    if (!context) {
      return null;
    }
    context.putImageData(source, 0, 0);
    return canvas.toDataURL('image/png');
  };
  const focusedOriginalImageUrl = useMemo(
    () => (showSelectedFrameOnly ? imageDataToDataUrl(focusedOriginalImageData) : imageUrl),
    [focusedOriginalImageData, imageUrl, showSelectedFrameOnly],
  );
  const focusedRemappedPreviewUrl = useMemo(
    () => (showSelectedFrameOnly ? imageDataToDataUrl(focusedRemappedImageData) : remappedPreviewUrl),
    [focusedRemappedImageData, remappedPreviewUrl, showSelectedFrameOnly],
  );
  const readabilityImageData = useMemo(() => {
    if (!imageData) {
      return null;
    }
    if (!selectedFrameRect) {
      return imageData;
    }
    return cropImageData(imageData, selectedFrameRect.x, selectedFrameRect.y, selectedFrameRect.width, selectedFrameRect.height);
  }, [imageData, selectedFrameRect]);
  const readabilityImageUrl = useMemo(() => {
    if (!readabilityImageData) {
      return null;
    }
    return imageDataToDataUrl(readabilityImageData);
  }, [readabilityImageData]);
  const readability = useMemo(() => {
    if (!readabilityImageData) {
      return null;
    }
    return analyzeReadability(readabilityImageData);
  }, [readabilityImageData]);
  const remapPairs = useMemo(
    () =>
      Object.entries(remaps).map(([fromHex, toHex]) => ({
        fromHex,
        toHex,
      })),
    [remaps],
  );
  const setRemap = (fromHex: string, toHex: string) =>
    setRemaps((previous) => {
      if (lockedHexes.includes(fromHex)) {
        return previous;
      }
      if (!toHex) {
        const { [fromHex]: _, ...rest } = previous;
        return rest;
      }
      return { ...previous, [fromHex]: toHex.toUpperCase() };
    });
  const toggleLockHex = (hex: string) =>
    setLockedHexes((previous) => (previous.includes(hex) ? previous.filter((value) => value !== hex) : [...previous, hex]));

  const setLoadedFile = async (file: File) => {
    const loaded = await loadPngImageData(file);
    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
    }
    setImageData(loaded.imageData);
    setImageUrl(loaded.imageUrl);
    setFileNameBase(loaded.fileName || 'asset');
    setHighlightedHex(null);
    setRemaps({});
    setPreviewRemaps({});
    setLockedHexes([]);
    setSmartSelectedHexes([]);
    setSelectedFrameIndex(null);
    setShowSelectedFrameOnly(false);
    setIsSpriteSheet(false);
  };

  const handleFileSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }
    try {
      await setLoadedFile(file);
      onToast(`Loaded ${file.name}`);
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'Failed to load PNG');
    }
  };

  const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (!file) {
      return;
    }
    try {
      await setLoadedFile(file);
      onToast(`Loaded ${file.name}`);
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'Failed to load PNG');
    }
  };

  const handleAutoRemapAll = () => {
    if (!analysis) {
      return;
    }
    const next: Record<string, string> = {};
    for (const row of analysis.colors) {
      if (!row.isValid && row.nearestPaletteHex && !lockedHexes.includes(row.hex)) {
        next[row.hex] = row.nearestPaletteHex;
      }
    }
    setRemaps(next);
    onToast('Auto remap suggestions applied');
  };

  const handleExport = async () => {
    if (!imageData) {
      onToast('Load an image first');
      return;
    }
    const hasAnyRemap = Object.keys(remaps).length > 0;
    if (!hasAnyRemap) {
      onToast('No remaps selected');
      return;
    }
    try {
      const remapped = applyRemapsToImageData(imageData, remaps);
      await exportImageDataAsPng(remapped, `${sanitizeFileName(fileNameBase)}-remapped`);
      onToast('Corrected PNG exported');
    } catch {
      onToast('Export failed');
    }
  };

  return (
    <section className="workspace-panel rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">Asset Validator</h2>
        <div className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{activePaletteLabel}</div>
      </div>

      <HowToUsePanel
        className="mb-4"
        items={[
          'Drop a PNG file or choose one manually to validate it against the active palette.',
          'Switch internal modes: Validation and Color Transform.',
          'Color Transform contains Manual Remap and Smart Recolor over the same shared state.',
        ]}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {([
          { id: 'validation', label: 'Validation' },
          { id: 'color-transform', label: 'Color Transform' },
        ] as const).map((mode) => (
          <button
            key={mode.id}
            type="button"
            onClick={() => setActiveMode(mode.id)}
            className={`rounded border px-3 py-1.5 text-xs font-semibold ${
              activeMode === mode.id
                ? 'border-sky-500 bg-sky-600 text-white'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            {mode.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-3">
          <div
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDrop}
            className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4"
          >
            <div className="flex flex-wrap items-center gap-2">
              <label className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50">
                Choose PNG
                <input type="file" accept="image/png" className="sr-only" onChange={handleFileSelect} />
              </label>
              <p className="text-xs text-slate-500">or drag and drop PNG here (max 2048x2048)</p>
            </div>
          </div>

          {imageData && imageUrl ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Zoom</p>
                {([1, 2, 4, 8] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setZoom(value)}
                    className={`rounded border px-2 py-1 text-xs font-semibold ${
                      zoom === value ? 'border-sky-500 bg-sky-600 text-white' : 'border-slate-300 bg-white hover:bg-slate-50'
                    }`}
                  >
                    {value}x
                  </button>
                ))}
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Original</p>
                  {focusedOriginalImageUrl && focusedOriginalImageData ? (
                    <ImageAnalysisPreview
                      imageUrl={focusedOriginalImageUrl}
                      imageData={focusedOriginalImageData}
                      zoom={zoom}
                      highlightedHex={highlightedHex}
                    selectedHexes={smartSelectedHexes}
                      lockedHexes={lockedHexes}
                      frameRects={showSelectedFrameOnly ? [] : spriteFrames}
                      issueFrameIndexes={showSelectedFrameOnly ? [] : issueFrameIndexes}
                      selectedFrameIndex={showSelectedFrameOnly ? null : selectedFrameIndex}
                      hoveredFrameIndex={showSelectedFrameOnly ? null : hoveredFrameIndex}
                      onFrameHover={showSelectedFrameOnly ? undefined : setHoveredFrameIndex}
                      onFrameSelect={showSelectedFrameOnly ? undefined : setSelectedFrameIndex}
                    onPixelClick={(hex, modifiers) => {
                        setHighlightedHex(hex);
                        if (activeMode === 'color-transform') {
                        setSmartSelectedHexes((previous) => {
                          if (modifiers.altKey) {
                            return previous.filter((value) => value !== hex);
                          }
                          if (modifiers.shiftKey) {
                            return [...new Set([...previous, hex])];
                          }
                          return [hex];
                        });
                        }
                      }}
                      onPixelRightClick={(hex) => {
                        toggleLockHex(hex);
                      }}
                    />
                  ) : (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-xs text-slate-500">
                      Original preview unavailable.
                    </div>
                  )}
                </div>
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Remapped Preview
                    {Object.keys({ ...remaps, ...previewRemaps }).length === 0 ? ' (no remaps yet)' : ''}
                  </p>
                  {focusedRemappedPreviewUrl && focusedRemappedImageData ? (
                    <ImageAnalysisPreview
                      imageUrl={focusedRemappedPreviewUrl}
                      imageData={focusedRemappedImageData}
                      zoom={zoom}
                      highlightedHex={null}
                      frameRects={showSelectedFrameOnly ? [] : spriteFrames}
                      issueFrameIndexes={showSelectedFrameOnly ? [] : issueFrameIndexes}
                      selectedFrameIndex={showSelectedFrameOnly ? null : selectedFrameIndex}
                      hoveredFrameIndex={showSelectedFrameOnly ? null : hoveredFrameIndex}
                      onFrameHover={showSelectedFrameOnly ? undefined : setHoveredFrameIndex}
                      onFrameSelect={showSelectedFrameOnly ? undefined : setSelectedFrameIndex}
                    />
                  ) : (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-xs text-slate-500">
                      Remapped preview unavailable.
                    </div>
                  )}
                </div>
              </div>
              {remapPairs.length > 0 ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Active Remaps</p>
                  <div className="space-y-1 text-xs">
                    {remapPairs.map((pair) => (
                      <div key={`${pair.fromHex}-${pair.toHex}`} className="flex items-center gap-2 font-mono text-slate-700">
                        <span
                          className="h-4 w-4 rounded border border-slate-300"
                          style={{ backgroundColor: `#${pair.fromHex}` }}
                        />
                        <span>#{pair.fromHex}</span>
                        <span className="text-slate-400">-&gt;</span>
                        <span
                          className="h-4 w-4 rounded border border-slate-300"
                          style={{ backgroundColor: `#${pair.toHex}` }}
                        />
                        <span>#{pair.toHex}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
              Load an asset to start validation.
            </div>
          )}
        </div>

        {activeMode === 'validation' ? (
          <ValidationPanel
            analysis={analysis}
            paletteHexes={paletteHexes}
            maxColorCount={maxColorCount}
            onSetMaxColorCount={setMaxColorCount}
            isSpriteSheet={isSpriteSheet}
            onSetIsSpriteSheet={setIsSpriteSheet}
            frameWidth={frameGrid.frameWidth}
            frameHeight={frameGrid.frameHeight}
            frameSpacing={frameGrid.spacing}
            frameMargin={frameGrid.margin}
            onSetFrameWidth={(value) => setFrameGrid((previous) => ({ ...previous, frameWidth: value }))}
            onSetFrameHeight={(value) => setFrameGrid((previous) => ({ ...previous, frameHeight: value }))}
            onSetFrameSpacing={(value) => setFrameGrid((previous) => ({ ...previous, spacing: value }))}
            onSetFrameMargin={(value) => setFrameGrid((previous) => ({ ...previous, margin: value }))}
            frameCount={spriteFrames.length}
            hoveredFrameIndex={hoveredFrameIndex}
            selectedFrameIndex={selectedFrameIndex}
            showSelectedFrameOnly={showSelectedFrameOnly}
            onSetShowSelectedFrameOnly={setShowSelectedFrameOnly}
            onSetSelectedFrameIndex={setSelectedFrameIndex}
            frameWarnings={frameWarnings}
            readability={readability}
            imageData={readabilityImageData}
            imageUrl={readabilityImageUrl}
            highlightedHex={highlightedHex}
            onHighlightColor={setHighlightedHex}
          />
        ) : (
          <ColorTransformPanel
            analysis={analysis}
            paletteHexes={paletteHexes}
            remaps={remaps}
            lockedHexes={lockedHexes}
            selectedHexes={smartSelectedHexes}
            highlightedHex={highlightedHex}
            onHighlightColor={setHighlightedHex}
            onSetRemap={setRemap}
            onToggleLockHex={toggleLockHex}
            onAutoRemapAll={handleAutoRemapAll}
            onResetRemaps={() => setRemaps({})}
            onMergeRemaps={(mapping) => setRemaps((previous) => ({ ...previous, ...mapping }))}
            onSetLockedHexes={setLockedHexes}
            onSetSelectedHexes={setSmartSelectedHexes}
            onSetPreviewRemaps={setPreviewRemaps}
            onExport={handleExport}
          />
        )}
      </div>
    </section>
  );
};
