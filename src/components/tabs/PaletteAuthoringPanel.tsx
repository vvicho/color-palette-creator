import { useMemo, useState } from 'react';
import type { PaletteGroup } from '../../types';
import { findClosestPaletteColors, findRampDuplicates } from '../../utils/paletteSimilarity';
import { HowToUsePanel } from '../HowToUsePanel';
import {
  evaluateRampHealth,
  generateRampFromBase,
  type ContrastIntensity,
  type RampSize,
  type SaturationCurve,
  type ShadowStyle,
} from '../../utils/rampGeneration';

type PaletteAuthoringPanelProps = {
  paletteHexes: string[];
  paletteGroups: PaletteGroup[];
  isBusy: boolean;
  onSavePalette: () => void;
  onCopyHex: (hex: string) => void;
  onCommitRamp: (rampHexes: string[], groupName: string | null) => void;
};

const toRgb = (hex: string) => ({
  red: Number.parseInt(hex.slice(0, 2), 16),
  green: Number.parseInt(hex.slice(2, 4), 16),
  blue: Number.parseInt(hex.slice(4, 6), 16),
});

const normalizeHexInput = (value: string) => {
  const cleaned = value.replace(/[^0-9a-fA-F]/g, '').toUpperCase();
  if (cleaned.length === 3) {
    return cleaned
      .split('')
      .map((char) => `${char}${char}`)
      .join('');
  }
  if (cleaned.length >= 6) {
    return cleaned.slice(0, 6);
  }
  return null;
};

const rgbToHex = (red: number, green: number, blue: number) =>
  [red, green, blue]
    .map((channel) => channel.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();

export const PaletteAuthoringPanel = ({
  paletteHexes,
  paletteGroups,
  isBusy,
  onSavePalette,
  onCopyHex,
  onCommitRamp,
}: PaletteAuthoringPanelProps) => {
  const [baseHex, setBaseHex] = useState('C59100');
  const [rampSize, setRampSize] = useState<RampSize>(5);
  const [contrastIntensity, setContrastIntensity] = useState<ContrastIntensity>('medium');
  const [shadowStyle, setShadowStyle] = useState<ShadowStyle>('neutral');
  const [saturationCurve, setSaturationCurve] = useState<SaturationCurve>('flat');
  const [materialGroupName, setMaterialGroupName] = useState('Bronze');

  const ramp = useMemo(
    () =>
      generateRampFromBase({
        baseHex,
        rampSize,
        contrastIntensity,
        shadowStyle,
        saturationCurve,
      }),
    [baseHex, contrastIntensity, rampSize, saturationCurve, shadowStyle],
  );

  const warnings = useMemo(() => {
    const health = evaluateRampHealth(ramp);
    const duplicates = findRampDuplicates(ramp, paletteHexes);
    if (duplicates.length > 0) {
      health.push(`Ramp includes ${duplicates.length} colors already in the active project palette.`);
    }
    return health;
  }, [paletteHexes, ramp]);

  const nearbySuggestions = useMemo(() => {
    const target = ramp[Math.floor(ramp.length / 2)] ?? baseHex;
    return findClosestPaletteColors(target, paletteHexes);
  }, [baseHex, paletteHexes, ramp]);

  const updateRgbChannel = (channel: 'red' | 'green' | 'blue', value: number) => {
    const rgb = toRgb(baseHex);
    const next = {
      red: channel === 'red' ? value : rgb.red,
      green: channel === 'green' ? value : rgb.green,
      blue: channel === 'blue' ? value : rgb.blue,
    };
    setBaseHex(rgbToHex(next.red, next.green, next.blue));
  };

  const materialOptions = [
    ...new Set([
      'Skin',
      'Bronze',
      'Grass',
      'Water',
      'Fire',
      'Poison',
      'Marble',
      'Underworld',
      ...paletteGroups.map((group) => group.name),
    ]),
  ];

  return (
    <section className="workspace-panel rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold">Palette Authoring</h2>
        <button
          type="button"
          onClick={() => onCommitRamp(ramp, materialGroupName === '__none__' ? null : materialGroupName)}
          disabled={isBusy}
          className="rounded bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-black"
        >
          {isBusy ? 'Adding...' : 'Add Ramp To Workspace'}
        </button>
        <button
          type="button"
          onClick={onSavePalette}
          className="rounded border border-slate-300 bg-white px-3 py-2 text-xs font-semibold hover:bg-slate-50"
        >
          Save Current Palette
        </button>
      </div>

      <HowToUsePanel
        className="how-to-use--palette-authoring mb-4"
        items={[
          'Pick a seed color, then tune ramp size, contrast, shadow style, and saturation curve.',
          'Review ramp warnings before adding to workspace to avoid muddy or duplicate ramps.',
          'Use nearby suggestions to jump to existing project colors and keep palette cohesion.',
          'Add Ramp To Workspace to merge generated colors; Save Current Palette to persist.',
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr_1fr]">
        <div className="space-y-3 rounded-lg border border-slate-200 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Seed Color Controls</p>
          <input
            value={`#${baseHex}`}
            onChange={(event) => {
              const normalized = normalizeHexInput(event.target.value);
              if (normalized) setBaseHex(normalized);
            }}
            className="w-full rounded border border-slate-300 px-2 py-1 font-mono text-sm"
          />
          <input
            type="color"
            value={`#${baseHex}`}
            onChange={(event) => {
              const normalized = normalizeHexInput(event.target.value);
              if (normalized) setBaseHex(normalized);
            }}
            className="h-10 w-full rounded border border-slate-300"
          />
          {(['red', 'green', 'blue'] as const).map((channel) => (
            <div key={channel}>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">{channel}</label>
              <input
                type="range"
                min={0}
                max={255}
                value={toRgb(baseHex)[channel]}
                onChange={(event) => updateRgbChannel(channel, Number(event.target.value))}
                className="w-full"
              />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-2">
            <select
              value={rampSize}
              onChange={(event) => setRampSize(Number(event.target.value) as RampSize)}
              className="rounded border border-slate-300 px-2 py-1 text-xs"
            >
              <option value={3}>3-tone</option>
              <option value={4}>4-tone</option>
              <option value={5}>5-tone</option>
            </select>
            <select
              value={contrastIntensity}
              onChange={(event) => setContrastIntensity(event.target.value as ContrastIntensity)}
              className="rounded border border-slate-300 px-2 py-1 text-xs"
            >
              <option value="soft">Soft</option>
              <option value="medium">Medium</option>
              <option value="strong">Strong</option>
            </select>
            <select
              value={shadowStyle}
              onChange={(event) => setShadowStyle(event.target.value as ShadowStyle)}
              className="rounded border border-slate-300 px-2 py-1 text-xs"
            >
              <option value="neutral">Neutral Shadow</option>
              <option value="warm">Warm Shadow</option>
              <option value="cool">Cool Shadow</option>
            </select>
            <select
              value={saturationCurve}
              onChange={(event) => setSaturationCurve(event.target.value as SaturationCurve)}
              className="rounded border border-slate-300 px-2 py-1 text-xs"
            >
              <option value="flat">Flat Sat</option>
              <option value="increasing">Increasing Sat</option>
              <option value="decreasing">Decreasing Sat</option>
            </select>
          </div>
        </div>

        <div className="space-y-3 rounded-lg border border-slate-200 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ramp Preview</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {ramp.map((hex, index) => (
              <div key={`ramp-slot-${index}`} className="rounded border border-slate-300">
                <div className="h-16 rounded-t" style={{ backgroundColor: `#${hex}` }} />
                <p className="border-t border-slate-200 px-2 py-1 font-mono text-xs">#{hex}</p>
              </div>
            ))}
          </div>
          <select
            value={materialGroupName}
            onChange={(event) => setMaterialGroupName(event.target.value)}
            className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
          >
            <option value="__none__">Do not assign group</option>
            {materialOptions.map((name) => (
              <option key={`material-${name}`} value={name}>
                Assign to: {name}
              </option>
            ))}
          </select>
          {warnings.length > 0 ? (
            <div className="space-y-1 rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
              {warnings.map((warning) => (
                <p key={warning}>- {warning}</p>
              ))}
            </div>
          ) : (
            <p className="rounded border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-700">
              Ramp looks healthy for readability spacing.
            </p>
          )}
        </div>

        <div className="space-y-3 rounded-lg border border-slate-200 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Current Workspace Palette</p>
          {paletteHexes.length === 0 ? (
            <p className="rounded border border-dashed border-slate-300 bg-slate-50 p-2 text-xs text-slate-500">
              No colors in workspace yet.
            </p>
          ) : (
            <div className="space-y-2">
              <div className="overflow-hidden rounded border border-slate-200">
                <div className="grid grid-cols-12">
                  {paletteHexes.map((hex) => (
                    <button
                      key={`workspace-chip-${hex}`}
                      type="button"
                      onClick={() => onCopyHex(hex)}
                      className="h-5 w-full transition hover:scale-110"
                      style={{ backgroundColor: `#${hex}` }}
                      title={`#${hex} (click to copy)`}
                      aria-label={`Copy #${hex}`}
                    />
                  ))}
                </div>
              </div>
              <p className="text-[10px] text-slate-500">{paletteHexes.length} workspace colors</p>
            </div>
          )}
        </div>

        <div className="space-y-3 rounded-lg border border-slate-200 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nearby Palette Suggestions</p>
          {nearbySuggestions.length === 0 ? (
            <p className="text-xs text-slate-500">No active project palette yet.</p>
          ) : (
            <div className="space-y-2">
              {nearbySuggestions.map((item) => (
                <div key={`near-${item.hex}`} className="flex items-center gap-2 rounded border border-slate-200 p-2">
                  <span className="h-6 w-6 rounded border border-slate-300" style={{ backgroundColor: `#${item.hex}` }} />
                  <p className="font-mono text-xs">#{item.hex}</p>
                  <button
                    type="button"
                    onClick={() => setBaseHex(item.hex)}
                    className="rounded border border-slate-300 bg-white px-2 py-0.5 text-[10px] font-semibold hover:bg-slate-50"
                  >
                    Select
                  </button>
                  <span className="ml-auto text-[10px] text-slate-500">d={item.distance.toFixed(1)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
