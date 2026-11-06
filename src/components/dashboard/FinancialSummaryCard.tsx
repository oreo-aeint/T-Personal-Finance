import React from 'react';
import { TrendingUp, TrendingDown, PiggyBank, Wallet } from 'lucide-react';
import type { MonthlyFinancialSummary } from '../../types';
import { formatYen } from '../../utils/currency';

interface FinancialSummaryCardProps {
  summary: MonthlyFinancialSummary;
}

export const FinancialSummaryCard: React.FC<FinancialSummaryCardProps> = ({
  summary,
}) => {
  const isSurplus = summary.availableSpendingYen >= 0;

  return (
    <div className="bg-white dark:bg-neutral-800/80 rounded-3xl p-5 border border-neutral-200/80 dark:border-neutral-700/80 shadow-xs space-y-4">
      {/* Primary KPI: Available Spending */}
      <div>
        <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 mb-1">
          <span className="font-medium">Available Spending (今月使えるお金)</span>
          <span className="text-[11px]">Net Income − Expenses − Savings</span>
        </div>
        <div className="flex items-baseline justify-between">
          <div
            className={`text-3xl font-extrabold tracking-tight tabular-nums ${
              isSurplus
                ? 'text-neutral-900 dark:text-neutral-50'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {formatYen(summary.availableSpendingYen)}
          </div>
          {summary.totalBudgetLimitYen > 0 && (
            <div className="text-right">
              <span className="text-xs text-neutral-500 dark:text-neutral-400 block">
                Budget Used: <strong className="text-neutral-800 dark:text-neutral-200 tabular-nums">{summary.budgetUsagePercent}%</strong>
              </span>
            </div>
          )}
        </div>

        {/* Budget Progress Bar if limit exists */}
        {summary.totalBudgetLimitYen > 0 && (
          <div className="w-full bg-neutral-100 dark:bg-neutral-700 h-2 rounded-full overflow-hidden mt-2.5">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                summary.budgetUsagePercent > 100
                  ? 'bg-rose-500'
                  : summary.budgetUsagePercent > 80
                  ? 'bg-amber-500'
                  : 'bg-emerald-600'
              }`}
              style={{ width: `${Math.min(100, summary.budgetUsagePercent)}%` }}
            />
          </div>
        )}
      </div>

      {/* 3 Pillar Summary Grid: Income, Expenses, Savings */}
      <div className="grid grid-cols-3 gap-2.5 pt-3 border-t border-neutral-100 dark:border-neutral-700/60">
        {/* Income */}
        <div className="p-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 text-[11px] font-medium mb-1">
            <TrendingUp size={13} />
            <span>Income</span>
          </div>
          <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100 tabular-nums truncate">
            {formatYen(summary.totalIncomeYen)}
          </p>
        </div>

        {/* Expense */}
        <div className="p-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 text-[11px] font-medium mb-1">
            <TrendingDown size={13} />
            <span>Expenses</span>
          </div>
          <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100 tabular-nums truncate">
            {formatYen(summary.totalExpenseYen)}
          </p>
        </div>

        {/* Savings */}
        <div className="p-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-1.5 text-teal-700 dark:text-teal-400 text-[11px] font-medium mb-1">
            <PiggyBank size={13} />
            <span>Savings</span>
          </div>
          <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100 tabular-nums truncate">
            {formatYen(summary.totalSavingsYen)}
          </p>
        </div>
      </div>
    </div>
  );
};
