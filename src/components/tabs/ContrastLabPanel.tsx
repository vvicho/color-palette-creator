import { type DragEvent } from 'react';
import { CEL_EDGE_STRONG_RATIO, CEL_EDGE_WEAK_RATIO } from '../../constants';
import { HowToUsePanel } from '../HowToUsePanel';
import type { PaletteColor } from '../../types';
import { readableTextOnHex } from '../../utils/colorSpace';

type ContrastLabPanelProps = {
  activePaletteLabel: string;
  displayColors: PaletteColor[];
  foregroundHex: string | null;
  backgroundHex: string | null;
  setForegroundHex: (hex: string) => void;
  setBackgroundHex: (hex: string) => void;
  contrastRatio: number | null;
  contrastRating: string;
  onDragStart: (event: DragEvent<HTMLButtonElement>, hex: string) => void;
  allowDrop: (event: DragEvent<HTMLDivElement>) => void;
};

export const ContrastLabPanel = ({
  activePaletteLabel,
  displayColors,
  foregroundHex,
  backgroundHex,
  setForegroundHex,
  setBackgroundHex,
  contrastRatio,
  contrastRating,
  onDragStart,
  allowDrop,
}: ContrastLabPanelProps) => (
  <section className="workspace-panel contrast-lab-panel rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="contrast-lab-panel__header mb-3 flex flex-wrap items-center justify-between gap-2">
      <h2 className="text-base font-semibold">Contrast Lab</h2>
      <div className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{activePaletteLabel}</div>
    </div>

    <HowToUsePanel
      className="how-to-use--contrast contrast-lab-panel__howto mb-4"
      items={[
        'Left-click a swatch to set the text (foreground) color; right-click to set the background.',
        'Drag a swatch onto the Text or Background drop zones to assign it without using clicks.',
        'Read the ratio and WCAG-style badge; the line below summarizes strength at the 3:1 and 2:1 informal cutoffs.',
      ]}
    />

    {displayColors.length === 0 ? (
      <p className="contrast-lab-panel__empty text-sm text-slate-500">Import colors to use drag-and-drop contrast testing.</p>
    ) : (
      <div className="contrast-lab-panel__grid grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="contrast-lab-panel__preview-col space-y-3">
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <div className="grid grid-cols-12">
              {displayColors.map((color) => (
                <div
                  key={`contrast-map-${color.hex}`}
                  className="h-4 w-full"
                  style={{ backgroundColor: `#${color.hex}` }}
                  title={`#${color.hex}`}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-6 gap-2 sm:grid-cols-8 lg:grid-cols-10">
            {displayColors.map((color) => (
              <button
                key={`drag-${color.hex}`}
                type="button"
                draggable
                onDragStart={(event) => onDragStart(event, color.hex)}
                onClick={() => setForegroundHex(color.hex)}
                onContextMenu={(event) => {
                  event.preventDefault();
                  setBackgroundHex(color.hex);
                }}
                className="h-12 w-full rounded border border-slate-200 transition hover:scale-105"
                style={{ backgroundColor: `#${color.hex}` }}
                title={`#${color.hex} - Left click: Text, Right click: Background, Drag: Drop target`}
                aria-label={`Color ${color.hex}. Left click sets text, right click sets background.`}
              />
            ))}
          </div>

          <div
            className="contrast-lab-panel__live-preview rounded-xl border border-slate-200 p-8"
            style={{
              backgroundColor: backgroundHex ? `#${backgroundHex}` : '#ffffff',
              color: foregroundHex ? `#${foregroundHex}` : '#0f172a',
            }}
          >
            <p className="text-2xl font-bold">Preview text over background</p>
            <p className="mt-2 text-sm">
              Gray over purple? Purple over gray? Use the selectors or drag-and-drop targets to test both.
            </p>
          </div>
        </div>

        <div className="contrast-lab-panel__controls space-y-3">
          <div
            onDragOver={allowDrop}
            onDrop={(event) => {
              event.preventDefault();
              const droppedHex = event.dataTransfer.getData('text/plain');
              if (droppedHex) {
                setForegroundHex(droppedHex);
              }
            }}
            className="rounded-lg border border-slate-200 p-3"
          >
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Text color</p>
            <div
              className="rounded p-3 text-sm font-semibold"
              style={{
                backgroundColor: '#f8fafc',
                color: foregroundHex ? `#${foregroundHex}` : '#0f172a',
              }}
            >
              #{foregroundHex ?? '------'}
            </div>
          </div>

          <div
            onDragOver={allowDrop}
            onDrop={(event) => {
              event.preventDefault();
              const droppedHex = event.dataTransfer.getData('text/plain');
              if (droppedHex) {
                setBackgroundHex(droppedHex);
              }
            }}
            className="rounded-lg border border-slate-200 p-3"
          >
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Background color</p>
            <div
              className="rounded p-3 text-sm font-semibold"
              style={{
                backgroundColor: backgroundHex ? `#${backgroundHex}` : '#e2e8f0',
                color: backgroundHex ? readableTextOnHex(backgroundHex) : '#0f172a',
              }}
            >
              #{backgroundHex ?? '------'}
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (!foregroundHex || !backgroundHex) {
                return;
              }
              setForegroundHex(backgroundHex);
              setBackgroundHex(foregroundHex);
            }}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50"
          >
            Swap Text and Background
          </button>

          <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700">
                Ratio: {contrastRatio ? contrastRatio.toFixed(2) : 'N/A'}:1
              </span>
              <span className="rounded bg-white px-2 py-1 text-xs font-semibold text-slate-700">{contrastRating}</span>
            </div>
            {contrastRatio != null ? (
              <p
                className={`mt-2 border-t border-slate-200 pt-2 text-xs font-semibold ${
                  contrastRatio >= CEL_EDGE_STRONG_RATIO
                    ? 'text-emerald-700'
                    : contrastRatio >= CEL_EDGE_WEAK_RATIO
                      ? 'text-amber-700'
                      : 'text-rose-700'
                }`}
              >
                {contrastRatio >= CEL_EDGE_STRONG_RATIO
                  ? '≥3:1 — strong for body text and sharp UI edges'
                  : contrastRatio >= CEL_EDGE_WEAK_RATIO
                    ? '2:1–3:1 — OK for large text or chunky graphics'
                    : 'Below 2:1 — very low separation'}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    )}
  </section>
);
