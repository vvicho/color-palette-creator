import { useEffect, useMemo, useRef, useState } from 'react';
import { CEL_EDGE_STRONG_RATIO, CEL_EDGE_WEAK_RATIO } from '../../constants';
import type { CelToneCount, HarmonyRamp, HarmonySlot } from '../../types';
import { contrastRatioHex } from '../../utils/colorSpace';
import { closestPaletteHex, offsetHsvHex } from '../../utils/harmonyPalette';
import { HowToUsePanel } from '../HowToUsePanel';

type HarmonyAssistantPanelProps = {
  masterPalette: string[];
  activePaletteLabel: string;
  onToast: (message: string) => void;
  onCopyHex: (hex: string) => void;
};

export const HarmonyAssistantPanel = ({
  masterPalette,
  activePaletteLabel,
  onToast,
  onCopyHex,
}: HarmonyAssistantPanelProps) => {
  const [harmonyBaseHex, setHarmonyBaseHex] = useState<string | null>(null);
  const [celToneCount, setCelToneCount] = useState<CelToneCount>(4);
  const [harmonyEditSlot, setHarmonyEditSlot] = useState<HarmonySlot | null>(null);
  const [harmonySlotOverrides, setHarmonySlotOverrides] = useState<Partial<Record<HarmonySlot, string>>>({});
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  /** 0 = smallest highlight band on the sphere preview, 100 = largest */
  const [previewHighlightSize, setPreviewHighlightSize] = useState(50);
  /** 0 = smallest shadow band, 100 = largest */
  const [previewShadowSize, setPreviewShadowSize] = useState(50);

  useEffect(() => {
    if (masterPalette.length === 0) {
      setHarmonyBaseHex(null);
      return;
    }

    setHarmonyBaseHex((previous) => (previous && masterPalette.includes(previous) ? previous : masterPalette[0]));
  }, [masterPalette]);

  const harmonyData = useMemo(() => {
    if (!harmonyBaseHex || masterPalette.length === 0) {
      return null;
    }

    const base = harmonyBaseHex;
    const shadow = closestPaletteHex(offsetHsvHex(base, -16, 0.08, -0.28), masterPalette);
    const light = closestPaletteHex(offsetHsvHex(base, 10, -0.04, 0.18), masterPalette);
    const highlight = closestPaletteHex(offsetHsvHex(base, 18, -0.1, 0.34), masterPalette);

    const ramp: HarmonyRamp =
      celToneCount === 2
        ? { kind: '2', shadow, base }
        : celToneCount === 3
          ? { kind: '3', shadow, base, highlight }
          : { kind: '4', shadow, base, light, highlight };

    const harmonies = {
      complementary: closestPaletteHex(offsetHsvHex(base, 180, 0, 0), masterPalette),
      analogousA: closestPaletteHex(offsetHsvHex(base, -28, 0, 0), masterPalette),
      analogousB: closestPaletteHex(offsetHsvHex(base, 28, 0, 0), masterPalette),
    };

    return { ramp, harmonies };
  }, [harmonyBaseHex, masterPalette, celToneCount]);

  const effectiveHarmonyRamp = useMemo((): HarmonyRamp | null => {
    if (!harmonyData) {
      return null;
    }
    const o = harmonySlotOverrides;
    const r = harmonyData.ramp;
    if (r.kind === '2') {
      return {
        kind: '2',
        shadow: o.shadow ?? r.shadow,
        base: o.base ?? r.base,
      };
    }
    if (r.kind === '3') {
      return {
        kind: '3',
        shadow: o.shadow ?? r.shadow,
        base: o.base ?? r.base,
        highlight: o.highlight ?? r.highlight,
      };
    }
    return {
      kind: '4',
      shadow: o.shadow ?? r.shadow,
      base: o.base ?? r.base,
      light: o.light ?? r.light,
      highlight: o.highlight ?? r.highlight,
    };
  }, [harmonyData, harmonySlotOverrides]);

  const effectiveHarmonies = useMemo(() => {
    if (!harmonyData) {
      return null;
    }
    const o = harmonySlotOverrides;
    const h = harmonyData.harmonies;
    return {
      complementary: o.complementary ?? h.complementary,
      analogousA: o.analogousA ?? h.analogousA,
      analogousB: o.analogousB ?? h.analogousB,
    };
  }, [harmonyData, harmonySlotOverrides]);

  const harmonyShadowBaseContrast = useMemo(() => {
    if (!effectiveHarmonyRamp) {
      return null;
    }
    return contrastRatioHex(effectiveHarmonyRamp.shadow, effectiveHarmonyRamp.base);
  }, [effectiveHarmonyRamp]);

  useEffect(() => {
    setHarmonySlotOverrides({});
    setHarmonyEditSlot(null);
  }, [harmonyBaseHex, celToneCount]);

  useEffect(() => {
    if (!previewCanvasRef.current || !effectiveHarmonyRamp) {
      return;
    }

    const context = previewCanvasRef.current.getContext('2d');
    if (!context) {
      return;
    }

    const width = previewCanvasRef.current.width;
    const height = previewCanvasRef.current.height;
    context.clearRect(0, 0, width, height);

    context.fillStyle = '#1E1E2C';
    context.fillRect(0, 0, width, height);

    const ramp = effectiveHarmonyRamp;
    const shades =
      ramp.kind === '2'
        ? [`#${ramp.shadow}`, `#${ramp.base}`]
        : ramp.kind === '3'
          ? [`#${ramp.shadow}`, `#${ramp.base}`, `#${ramp.highlight}`]
          : [`#${ramp.shadow}`, `#${ramp.base}`, `#${ramp.light}`, `#${ramp.highlight}`];

    /** Stronger than ±1 so sliders near 0/100 change the sphere a lot more */
    const highlightDrive = ((previewHighlightSize - 50) / 50) * 1.65;
    const shadowDrive = ((50 - previewShadowSize) / 50) * 1.65;

    const bandIndex = (intensity: number) => {
      if (ramp.kind === '2') {
        const cut = 0.2 - highlightDrive * 0.26 - shadowDrive * 0.24;
        return intensity > cut ? 1 : 0;
      }
      if (ramp.kind === '3') {
        let hi = Math.min(0.998, 0.88 - highlightDrive * 0.26);
        let lo = 0.14 - highlightDrive * 0.14 - shadowDrive * 0.26;
        lo = Math.max(0.02, Math.min(lo, hi - 0.06));
        hi = Math.max(lo + 0.06, hi);
        if (intensity > hi) return 2;
        if (intensity > lo) return 1;
        return 0;
      }
      let hi = Math.min(0.998, 0.93 - highlightDrive * 0.26);
      let mid = 0.82 - highlightDrive * 0.28;
      let low = 0.22 - highlightDrive * 0.14 - shadowDrive * 0.32;
      low = Math.max(0.02, Math.min(low, mid - 0.06));
      mid = Math.max(low + 0.05, Math.min(mid, hi - 0.06));
      hi = Math.max(mid + 0.05, hi);
      if (intensity > hi) return 3;
      if (intensity > mid) return 2;
      if (intensity > low) return 1;
      return 0;
    };

    const centerX = width / 2;
    const centerY = height / 2 + 4;
    const radius = 56;
    const lightX = -0.7;
    const lightY = -0.7;

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const dx = (x - centerX) / radius;
        const dy = (y - centerY) / radius;
        const distanceSquared = dx * dx + dy * dy;
        if (distanceSquared > 1) {
          continue;
        }

        const dz = Math.sqrt(1 - distanceSquared);
        const intensity = dx * lightX + dy * lightY + dz * 0.9;
        const shadeIndex = bandIndex(intensity);
        context.fillStyle = shades[shadeIndex] ?? shades[0];
        context.fillRect(x, y, 1, 1);
      }
    }
  }, [effectiveHarmonyRamp, previewHighlightSize, previewShadowSize]);

  const copyHexRow = (hex: string) => {
    onCopyHex(hex);
  };

  return (
    <section className="workspace-panel harmony-assistant-panel rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="harmony-assistant-panel__header mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">Color Harmony &amp; Shading Assistant</h2>
        <div className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{activePaletteLabel}</div>
      </div>

      <HowToUsePanel
        className="how-to-use--harmony harmony-assistant-panel__howto mb-4"
        items={[
          'Choose 2-, 3-, or 4-tone cel ramps. Suggested shadow, base, light, and highlight are snapped to your imported palette.',
          'Click a palette swatch to set the base color (sky ring). Click a ramp or harmony row to select it (amber), then a swatch to override that slot—overrides are preview-only.',
          'Use Reset overrides to clear manual picks. Shadow↔base contrast hints help judge whether edges will read on small sprites.',
          'Sprite preview: use Highlight size and Shadow size sliders—lower values shrink those bands (preview only; ramp hexes are unchanged).',
        ]}
      />

      {masterPalette.length === 0 ? (
        <p className="harmony-assistant-panel__empty text-sm text-slate-500">
          Import your master palette first to generate snapped ramps.
        </p>
      ) : (
        <div className="harmony-assistant-panel__grid grid gap-4 lg:grid-cols-[1.3fr_1fr]">
          <div className="harmony-assistant-panel__left space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cel tones</p>
              <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                {([2, 3, 4] as const).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setCelToneCount(n)}
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                      celToneCount === n ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {n}-tone
                  </button>
                ))}
              </div>
            </div>

            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Master Palette</p>
            <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-10 lg:grid-cols-12">
              {masterPalette.map((hex) => (
                <button
                  key={`harmony-source-${hex}`}
                  type="button"
                  onClick={() => {
                    if (harmonyEditSlot) {
                      setHarmonySlotOverrides((prev) => ({ ...prev, [harmonyEditSlot]: hex }));
                      onToast(`${harmonyEditSlot}: #${hex}`);
                      return;
                    }
                    setHarmonyBaseHex(hex);
                  }}
                  className={`h-10 rounded border-2 transition ${
                    harmonyEditSlot
                      ? 'border-amber-300 hover:scale-105'
                      : harmonyBaseHex === hex
                        ? 'border-sky-500 scale-105'
                        : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: `#${hex}` }}
                  title={harmonyEditSlot ? `Set ${harmonyEditSlot} to #${hex}` : `Use #${hex} as base`}
                />
              ))}
            </div>

            <div className="harmony-assistant-panel__sprite-preview rounded-lg border border-slate-200 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Sprite Preview</p>
              <canvas ref={previewCanvasRef} width={160} height={160} className="h-40 w-40 rounded border border-slate-300" />
              <div className="mt-3 space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <label htmlFor="harmony-preview-highlight" className="text-xs font-medium text-slate-600">
                      Highlight size
                    </label>
                    <span className="text-xs tabular-nums text-slate-500">{previewHighlightSize}%</span>
                  </div>
                  <input
                    id="harmony-preview-highlight"
                    type="range"
                    min={0}
                    max={100}
                    value={previewHighlightSize}
                    onChange={(event) => setPreviewHighlightSize(Number(event.target.value))}
                    className="harmony-assistant-panel__slider-highlight w-full accent-sky-600"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={previewHighlightSize}
                    aria-label="Highlight band size on preview sphere"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <label htmlFor="harmony-preview-shadow" className="text-xs font-medium text-slate-600">
                      Shadow size
                    </label>
                    <span className="text-xs tabular-nums text-slate-500">{previewShadowSize}%</span>
                  </div>
                  <input
                    id="harmony-preview-shadow"
                    type="range"
                    min={0}
                    max={100}
                    value={previewShadowSize}
                    onChange={(event) => setPreviewShadowSize(Number(event.target.value))}
                    className="harmony-assistant-panel__slider-shadow w-full accent-sky-600"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={previewShadowSize}
                    aria-label="Shadow band size on preview sphere"
                  />
                </div>
                <p className="text-[10px] text-slate-500">
                  Drag toward 0% for a much thinner highlight or shadow rim; 50% is the default; 100% widens that band.
                </p>
              </div>
            </div>
          </div>

          <div className="harmony-assistant-panel__right space-y-3">
            <div className="rounded-lg border border-slate-200 p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Shading Ramp</p>
                {Object.keys(harmonySlotOverrides).length > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setHarmonySlotOverrides({});
                      setHarmonyEditSlot(null);
                      onToast('Harmony overrides cleared');
                    }}
                    className="rounded border border-slate-300 bg-white px-2 py-0.5 text-[10px] font-semibold hover:bg-slate-50"
                  >
                    Reset overrides
                  </button>
                ) : null}
              </div>
              {harmonyShadowBaseContrast != null ? (
                <p
                  className={`mb-2 text-[10px] font-semibold ${
                    harmonyShadowBaseContrast >= CEL_EDGE_STRONG_RATIO
                      ? 'text-emerald-700'
                      : harmonyShadowBaseContrast >= CEL_EDGE_WEAK_RATIO
                        ? 'text-amber-700'
                        : 'text-rose-700'
                  }`}
                  title="WCAG-style luminance contrast between shadow and base swatches"
                >
                  Shadow ↔ base: {harmonyShadowBaseContrast.toFixed(2)}:1
                  {harmonyShadowBaseContrast >= CEL_EDGE_STRONG_RATIO
                    ? ' — strong (≥3:1, clear cel edge)'
                    : harmonyShadowBaseContrast >= CEL_EDGE_WEAK_RATIO
                      ? ' — OK (2–3:1, softer edge)'
                      : ' — weak (below 2:1, edge may disappear)'}
                </p>
              ) : null}
              <p className="mb-2 text-[10px] text-slate-500">
                Click a row to select it, then a palette swatch to replace that color. Click the row again to deselect.
              </p>
              <div className="space-y-2">
                {effectiveHarmonyRamp && effectiveHarmonies
                  ? (effectiveHarmonyRamp.kind === '2'
                      ? [
                          { label: 'Shadow', slot: 'shadow' as const, hex: effectiveHarmonyRamp.shadow },
                          { label: 'Base', slot: 'base' as const, hex: effectiveHarmonyRamp.base },
                        ]
                      : effectiveHarmonyRamp.kind === '3'
                        ? [
                            { label: 'Shadow', slot: 'shadow' as const, hex: effectiveHarmonyRamp.shadow },
                            { label: 'Base', slot: 'base' as const, hex: effectiveHarmonyRamp.base },
                            {
                              label: 'Highlight',
                              slot: 'highlight' as const,
                              hex: effectiveHarmonyRamp.highlight,
                            },
                          ]
                        : [
                            { label: 'Shadow', slot: 'shadow' as const, hex: effectiveHarmonyRamp.shadow },
                            { label: 'Base', slot: 'base' as const, hex: effectiveHarmonyRamp.base },
                            { label: 'Light', slot: 'light' as const, hex: effectiveHarmonyRamp.light },
                            {
                              label: 'Highlight',
                              slot: 'highlight' as const,
                              hex: effectiveHarmonyRamp.highlight,
                            },
                          ]
                    ).map((item) => (
                      <div
                        key={item.label}
                        role="button"
                        tabIndex={0}
                        onClick={() =>
                          setHarmonyEditSlot((current) => (current === item.slot ? null : item.slot))
                        }
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            setHarmonyEditSlot((current) => (current === item.slot ? null : item.slot));
                          }
                        }}
                        className={`flex w-full cursor-pointer items-center gap-2 rounded border p-2 text-left transition ${
                          harmonyEditSlot === item.slot
                            ? 'border-amber-400 bg-amber-50 ring-1 ring-amber-200'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div
                          className="h-8 w-8 shrink-0 rounded border border-slate-300"
                          style={{ backgroundColor: `#${item.hex}` }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-slate-700">{item.label}</p>
                          <p className="font-mono text-xs text-slate-500">#{item.hex}</p>
                        </div>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            copyHexRow(item.hex);
                          }}
                          className="shrink-0 rounded border border-slate-300 px-2 py-1 text-xs font-semibold hover:bg-slate-50"
                        >
                          Copy HEX
                        </button>
                      </div>
                    ))
                  : null}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Harmonies</p>
              <div className="space-y-2">
                {effectiveHarmonies
                  ? [
                      {
                        label: 'Complementary',
                        slot: 'complementary' as const,
                        hex: effectiveHarmonies.complementary,
                      },
                      { label: 'Analogous -', slot: 'analogousA' as const, hex: effectiveHarmonies.analogousA },
                      { label: 'Analogous +', slot: 'analogousB' as const, hex: effectiveHarmonies.analogousB },
                    ].map((item) => (
                      <div
                        key={item.label}
                        role="button"
                        tabIndex={0}
                        onClick={() =>
                          setHarmonyEditSlot((current) => (current === item.slot ? null : item.slot))
                        }
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            setHarmonyEditSlot((current) => (current === item.slot ? null : item.slot));
                          }
                        }}
                        className={`flex w-full cursor-pointer items-center gap-2 rounded border p-2 text-left transition ${
                          harmonyEditSlot === item.slot
                            ? 'border-amber-400 bg-amber-50 ring-1 ring-amber-200'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div
                          className="h-8 w-8 shrink-0 rounded border border-slate-300"
                          style={{ backgroundColor: `#${item.hex}` }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-slate-700">{item.label}</p>
                          <p className="font-mono text-xs text-slate-500">#{item.hex}</p>
                        </div>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            copyHexRow(item.hex);
                          }}
                          className="shrink-0 rounded border border-slate-300 px-2 py-1 text-xs font-semibold hover:bg-slate-50"
                        >
                          Copy HEX
                        </button>
                      </div>
                    ))
                  : null}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
