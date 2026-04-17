import type { WorkspaceTab } from '../types';

type WorkspaceTabBarProps = {
  workspaceTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
};

export const WorkspaceTabBar = ({ workspaceTab, onSelectTab }: WorkspaceTabBarProps) => (
  <nav className="workspace-tab-bar flex flex-wrap gap-2" aria-label="Workspace">
    <button
      type="button"
      onClick={() => onSelectTab('palette')}
      className={`workspace-tab workspace-tab--palette rounded-lg border px-3 py-2 text-sm font-semibold ${
        workspaceTab === 'palette'
          ? 'border-sky-500 bg-sky-600 text-white'
          : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
      }`}
    >
      Palette Builder
    </button>
    <button
      type="button"
      onClick={() => onSelectTab('contrast')}
      className={`workspace-tab workspace-tab--contrast rounded-lg border px-3 py-2 text-sm font-semibold ${
        workspaceTab === 'contrast'
          ? 'border-sky-500 bg-sky-600 text-white'
          : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
      }`}
    >
      Contrast Lab
    </button>
    <button
      type="button"
      onClick={() => onSelectTab('harmony')}
      className={`workspace-tab workspace-tab--harmony rounded-lg border px-3 py-2 text-sm font-semibold ${
        workspaceTab === 'harmony'
          ? 'border-sky-500 bg-sky-600 text-white'
          : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
      }`}
    >
      Harmony Assistant
    </button>
  </nav>
);
