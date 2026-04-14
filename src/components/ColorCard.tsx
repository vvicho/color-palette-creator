import type { PaletteColor } from '../types';

interface ColorCardProps {
  color: PaletteColor;
  onCopy: (hex: string) => void;
}

const getTextClass = (hex: string) => {
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  return luminance > 160 ? 'text-slate-900' : 'text-white';
};

export const ColorCard = ({ color, onCopy }: ColorCardProps) => {
  const textClass = getTextClass(color.hex);

  return (
    <button
      type="button"
      onClick={() => onCopy(color.hex)}
      className="group overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
      aria-label={`Copy #${color.hex}`}
    >
      <div
        className={`aspect-square w-full p-3 ${textClass}`}
        style={{ backgroundColor: `#${color.hex}` }}
      >
        <div className="flex h-full items-end justify-between text-xs font-medium opacity-70">
          <span>Click to copy</span>
          <span className="rounded bg-black/10 px-2 py-0.5 text-[10px] uppercase tracking-wide">
            Swatch
          </span>
        </div>
      </div>
      <div className="space-y-1 p-3">
        <p className="truncate text-sm font-semibold text-slate-900">{color.name}</p>
        <p className="font-mono text-xs tracking-wide text-slate-600">#{color.hex}</p>
      </div>
    </button>
  );
};
