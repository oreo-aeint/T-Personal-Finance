import React from 'react';
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { formatMonthName, getCurrentMonthString, getRelativeMonth } from '../../utils/date';

interface MonthSelectorProps {
  currentMonth: string; // YYYY-MM
  onChangeMonth: (month: string) => void;
}

export const MonthSelector: React.FC<MonthSelectorProps> = ({
  currentMonth,
  onChangeMonth,
}) => {
  const actualCurrentMonth = getCurrentMonthString();
  const isCurrentMonth = currentMonth === actualCurrentMonth;

  return (
    <div className="flex items-center justify-between px-1 py-1">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChangeMonth(getRelativeMonth(currentMonth, -1))}
          className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/50 dark:hover:bg-neutral-800 transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="flex flex-col">
          <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
            {formatMonthName(currentMonth, 'en')}
          </span>
          <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
            {formatMonthName(currentMonth, 'ja')}
          </span>
        </div>

        <button
          type="button"
          onClick={() => onChangeMonth(getRelativeMonth(currentMonth, 1))}
          className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/50 dark:hover:bg-neutral-800 transition-colors"
          aria-label="Next month"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {!isCurrentMonth && (
        <button
          type="button"
          onClick={() => onChangeMonth(actualCurrentMonth)}
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
        >
          <RotateCcw size={12} />
          <span>This Month</span>
        </button>
      )}
    </div>
  );
};
