import { type MouseEvent, useMemo } from 'react';
import { getFrameIndexAtPoint, type SpriteFrameRect } from '../utils/spriteSheetParser';

type ImageAnalysisPreviewProps = {
  imageUrl: string;
  imageData: ImageData;
  zoom: 1 | 2 | 4 | 8;
  highlightedHex: string | null;
  selectedHexes?: string[];
  useSelectedSetOnly?: boolean;
  lockedHexes?: string[];
  frameRects?: SpriteFrameRect[];
  issueFrameIndexes?: number[];
  selectedFrameIndex?: number | null;
  hoveredFrameIndex?: number | null;
  onFrameHover?: (frameIndex: number | null) => void;
  onFrameSelect?: (frameIndex: number | null) => void;
  onPixelClick?: (hex: string, modifiers: { shiftKey: boolean; altKey: boolean }) => void;
  onPixelRightClick?: (hex: string) => void;
};

const rgbToHex = (red: number, green: number, blue: number) =>
  [red, green, blue]
    .map((channel) => channel.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();

export const ImageAnalysisPreview = ({
  imageUrl,
  imageData,
  zoom,
  highlightedHex,
  selectedHexes = [],
  useSelectedSetOnly = false,
  lockedHexes = [],
  frameRects = [],
  issueFrameIndexes = [],
  selectedFrameIndex = null,
  hoveredFrameIndex = null,
  onFrameHover,
  onFrameSelect,
  onPixelClick,
  onPixelRightClick,
}: ImageAnalysisPreviewProps) => {
  const highlightOverlayUrl = useMemo(() => {
    const lockedSet = new Set(lockedHexes.map((hex) => hex.toUpperCase()));
    const selectedSet = new Set(selectedHexes.map((hex) => hex.toUpperCase()));
    if (highlightedHex && !useSelectedSetOnly) {
      selectedSet.add(highlightedHex.toUpperCase());
    }
    if (selectedSet.size === 0 && lockedSet.size === 0) {
      return null;
    }

    const overlay = new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height);
    for (let index = 0; index < overlay.data.length; index += 4) {
      const alpha = overlay.data[index + 3] ?? 0;
      if (alpha === 0) {
        continue;
      }
      const hex = rgbToHex(overlay.data[index] ?? 0, overlay.data[index + 1] ?? 0, overlay.data[index + 2] ?? 0);
      const isSelected = selectedSet.has(hex);
      const isLocked = lockedSet.has(hex);

      if (isSelected) {
        overlay.data[index] = 255;
        overlay.data[index + 1] = 255;
        overlay.data[index + 2] = 255;
        overlay.data[index + 3] = 255;
      } else if (isLocked) {
        overlay.data[index] = 255;
        overlay.data[index + 1] = 45;
        overlay.data[index + 2] = 45;
        overlay.data[index + 3] = 235;
      } else {
        overlay.data[index] = 18;
        overlay.data[index + 1] = 20;
        overlay.data[index + 2] = 30;
        overlay.data[index + 3] = Math.min(160, alpha);
      }
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
  }, [highlightedHex, imageData, lockedHexes, selectedHexes, useSelectedSetOnly]);

  const scaledWidth = imageData.width * zoom;
  const scaledHeight = imageData.height * zoom;
  const gridOverlayUrl = useMemo(() => {
    if (frameRects.length === 0) {
      return null;
    }
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const context = canvas.getContext('2d');
    if (!context) {
      return null;
    }
    context.clearRect(0, 0, canvas.width, canvas.height);
    const issueSet = new Set(issueFrameIndexes);
    frameRects.forEach((frame) => {
      const isHovered = frame.index === hoveredFrameIndex;
      const isSelectedFrame = frame.index === selectedFrameIndex;
      const isIssue = issueSet.has(frame.index);
      context.strokeStyle = isHovered
        ? '#fbbf24'
        : isSelectedFrame
          ? '#22d3ee'
          : isIssue
            ? '#f87171'
            : 'rgba(148,163,184,0.9)';
      context.lineWidth = 1;
      context.strokeRect(frame.x + 0.5, frame.y + 0.5, frame.width - 1, frame.height - 1);
    });
    return canvas.toDataURL('image/png');
  }, [frameRects, hoveredFrameIndex, imageData.height, imageData.width, issueFrameIndexes, selectedFrameIndex]);
  const readPixelHex = (event: MouseEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = Math.floor((event.clientX - bounds.left) / zoom);
    const y = Math.floor((event.clientY - bounds.top) / zoom);
    if (x < 0 || y < 0 || x >= imageData.width || y >= imageData.height) {
      return null;
    }
    const offset = (y * imageData.width + x) * 4;
    const alpha = imageData.data[offset + 3] ?? 0;
    if (alpha === 0) {
      return null;
    }
    return rgbToHex(imageData.data[offset] ?? 0, imageData.data[offset + 1] ?? 0, imageData.data[offset + 2] ?? 0);
  };

  return (
    <div className="overflow-auto rounded-lg border border-slate-200 bg-slate-900/90 p-3">
      <div
        className="relative inline-block"
        style={{ width: scaledWidth, height: scaledHeight }}
        onClick={(event) => {
          const hex = readPixelHex(event);
          if (hex && onPixelClick) {
            onPixelClick(hex, { shiftKey: event.shiftKey, altKey: event.altKey });
            return;
          }
          if (onFrameSelect && frameRects.length > 0 && event.shiftKey) {
            const bounds = event.currentTarget.getBoundingClientRect();
            const x = Math.floor((event.clientX - bounds.left) / zoom);
            const y = Math.floor((event.clientY - bounds.top) / zoom);
            onFrameSelect(getFrameIndexAtPoint(x, y, frameRects));
          }
        }}
        onContextMenu={(event) => {
          event.preventDefault();
          const hex = readPixelHex(event);
          if (hex && onPixelRightClick) {
            onPixelRightClick(hex);
          }
        }}
        onMouseMove={(event) => {
          if (!onFrameHover || frameRects.length === 0) {
            return;
          }
          const bounds = event.currentTarget.getBoundingClientRect();
          const x = Math.floor((event.clientX - bounds.left) / zoom);
          const y = Math.floor((event.clientY - bounds.top) / zoom);
          onFrameHover(getFrameIndexAtPoint(x, y, frameRects));
        }}
        onMouseLeave={() => {
          if (onFrameHover) {
            onFrameHover(null);
          }
        }}
      >
        <img
          src={imageUrl}
          alt="Uploaded asset preview"
          style={{ width: scaledWidth, height: scaledHeight, imageRendering: 'pixelated' }}
          className="absolute left-0 top-0"
        />
        {highlightOverlayUrl ? (
          <img
            src={highlightOverlayUrl}
            alt="Highlighted matching pixels"
            style={{ width: scaledWidth, height: scaledHeight, imageRendering: 'pixelated' }}
            className="absolute left-0 top-0"
          />
        ) : null}
        {gridOverlayUrl ? (
          <img
            src={gridOverlayUrl}
            alt="Sprite sheet frame grid"
            style={{ width: scaledWidth, height: scaledHeight, imageRendering: 'pixelated' }}
            className="absolute left-0 top-0"
          />
        ) : null}
      </div>
    </div>
  );
};
