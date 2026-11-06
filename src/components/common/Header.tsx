import React from 'react';
import { Settings } from 'lucide-react';
import { useThemeStyle } from '../../theme/ThemeContext';

interface HeaderProps {
  title?: string;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title = 'T-Personal Finance',
  onOpenSettings,
}) => {
  const { themeStyle } = useThemeStyle();

  return (
    <header className="sticky top-0 z-30 bg-neutral-50/95 dark:bg-neutral-900/95 backdrop-blur-md px-4 py-2.5 flex items-center justify-between border-b border-neutral-200/60 dark:border-neutral-800/80 transition-colors">
      <div className="flex items-center gap-2">
        <div
          className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shadow-2xs transition-all ${
            themeStyle === 'cute'
              ? 'bg-amber-600 text-white'
              : 'bg-emerald-700 dark:bg-emerald-600 text-white'
          }`}
        >
          {themeStyle === 'cute' ? '🐾' : 'T'}
        </div>
        <div>
          <h1 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 leading-tight">
            {title}
          </h1>
          <p className="text-[10px] text-neutral-500 dark:text-neutral-400 leading-none">
            {themeStyle === 'cute' ? 'Ren_漣 Wallet · 漣' : 'Student Wallet'}
          </p>
        </div>
      </div>

      {/* Header Contextual Actions - Only Settings */}
      <button
        type="button"
        onClick={onOpenSettings}
        className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-neutral-100 hover:bg-neutral-200/60 dark:hover:bg-neutral-800 transition-colors"
        title="Settings, Backup & Restore"
        aria-label="Settings"
      >
        <Settings size={18} />
      </button>
    </header>
  );
};
