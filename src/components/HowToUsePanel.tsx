type HowToUsePanelProps = {
  /** BEM-style hook, e.g. `how-to-use--palette` */
  className?: string;
  title?: string;
  items: string[];
};

export const HowToUsePanel = ({ className = '', title = 'How to use', items }: HowToUsePanelProps) => (
  <aside
    className={`how-to-use-panel rounded-lg border border-sky-200 bg-sky-50/90 p-3 text-slate-800 shadow-sm ${className}`.trim()}
  >
    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-sky-900">{title}</p>
    <ul className="list-inside list-disc space-y-1.5 text-xs leading-relaxed text-slate-700">
      {items.map((text) => (
        <li key={text}>{text}</li>
      ))}
    </ul>
  </aside>
);
