import React, { useState, useEffect } from 'react';
import { BarChart3, ChevronLeft, ChevronRight, PieChart, ArrowUpRight, ArrowDownRight, Layers } from 'lucide-react';
import { ModalSheet } from '../common/ModalSheet';
import { CategoryIcon } from '../common/CategoryIcon';
import type { MonthlyFinancialSummary } from '../../types';
import {
  getMonthlyFinancialSummary,
  getCategoryExpenseBreakdown,
  getHistoricalTrend,
  CategoryBreakdownItem,
  MonthlyTrendItem,
} from '../../services/report.service';
import { formatYen } from '../../utils/currency';
import { formatMonthName, getRelativeMonth } from '../../utils/date';

interface MonthlyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMonth: string;
}

export const MonthlyReportModal: React.FC<MonthlyReportModalProps> = ({
  isOpen,
  onClose,
  initialMonth,
}) => {
  const [reportMonth, setReportMonth] = useState<string>(initialMonth);
  const [summary, setSummary] = useState<MonthlyFinancialSummary | null>(null);
  const [breakdown, setBreakdown] = useState<CategoryBreakdownItem[]>([]);
  const [trends, setTrends] = useState<MonthlyTrendItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    setReportMonth(initialMonth);
  }, [initialMonth]);

  const loadReport = async () => {
    try {
      setLoading(true);
      const [sum, bdown, tr] = await Promise.all([
        getMonthlyFinancialSummary(reportMonth),
        getCategoryExpenseBreakdown(reportMonth),
        getHistoricalTrend(reportMonth, 5),
      ]);
      setSummary(sum);
      setBreakdown(bdown);
      setTrends(tr);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadReport();
    }
  }, [isOpen, reportMonth]);

  // Max value in trends for scaling chart bars
  const maxTrendVal = Math.max(
    1,
    ...trends.flatMap((t) => [t.incomeYen, t.expenseYen])
  );

  return (
    <ModalSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Financial Monthly Report (月次レポート)"
      subtitle="Detailed income, spending, and savings analytics"
      maxHeight="max-h-[92vh]"
    >
      <div className="space-y-4">
        {/* Month Navigation */}
        <div className="flex items-center justify-between p-2 rounded-2xl bg-neutral-100 dark:bg-neutral-800">
          <button
            type="button"
            onClick={() => setReportMonth(getRelativeMonth(reportMonth, -1))}
            className="p-1.5 rounded-xl hover:bg-white dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300"
            aria-label="Previous month"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="text-center">
            <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 block">
              {formatMonthName(reportMonth, 'en')}
            </span>
            <span className="text-[10px] text-neutral-500">
              {formatMonthName(reportMonth, 'ja')}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setReportMonth(getRelativeMonth(reportMonth, 1))}
            className="p-1.5 rounded-xl hover:bg-white dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300"
            aria-label="Next month"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Big Available Spending Summary Card */}
        {summary && (
          <div className="p-4 rounded-3xl bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200/80 dark:border-neutral-700/80 space-y-3">
            <div>
              <span className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium">
                Net Available Balance for {formatMonthName(reportMonth)}
              </span>
              <div
                className={`text-2xl font-extrabold tabular-nums tracking-tight ${
                  summary.availableSpendingYen >= 0 ? 'text-neutral-900 dark:text-neutral-50' : 'text-rose-600'
                }`}
              >
                {formatYen(summary.availableSpendingYen)}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-neutral-200/70 dark:border-neutral-700 text-xs">
              <div>
                <span className="text-[10px] text-neutral-400 block">Income</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                  {formatYen(summary.totalIncomeYen)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-400 block">Living Expenses</span>
                <span className="font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                  {formatYen(summary.totalExpenseYen)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-400 block">Savings Put Away</span>
                <span className="font-bold text-teal-700 dark:text-teal-400 tabular-nums">
                  {formatYen(summary.totalSavingsYen)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Category Expense Breakdown */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs font-semibold text-neutral-800 dark:text-neutral-200 px-1">
            <span className="flex items-center gap-1.5">
              <PieChart size={14} className="text-neutral-500" />
              <span>Expense Breakdown by Category</span>
            </span>
            <span className="text-[11px] font-normal text-neutral-400">
              Total: {formatYen(summary?.totalExpenseYen)}
            </span>
          </div>

          {breakdown.length === 0 ? (
            <div className="p-6 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 text-center border border-neutral-200/70 dark:border-neutral-800">
              <p className="text-xs text-neutral-500">
                No expense transactions recorded in this month.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {breakdown.map((item) => (
                <div
                  key={item.categoryId}
                  className="p-2.5 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200/70 dark:border-neutral-700/80 shadow-2xs space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center text-neutral-700 dark:text-neutral-300">
                        <CategoryIcon name={item.categoryIcon} size={13} />
                      </div>
                      <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                        {item.categoryName}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-bold text-neutral-900 dark:text-neutral-100 tabular-nums">
                        {formatYen(item.amountYen)}
                      </span>
                      <span className="text-[11px] text-neutral-400 font-medium tabular-nums w-8 text-right">
                        {item.percentage}%
                      </span>
                    </div>
                  </div>

                  {/* Horizontal Bar */}
                  <div className="w-full bg-neutral-100 dark:bg-neutral-700 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 5-Month Income vs. Expenses Trend Chart */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between text-xs font-semibold text-neutral-800 dark:text-neutral-200 px-1">
            <span className="flex items-center gap-1.5">
              <BarChart3 size={14} className="text-neutral-500" />
              <span>Multi-Month Income vs Expenses</span>
            </span>
            <div className="flex items-center gap-3 text-[10px] text-neutral-500">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-xs bg-emerald-600 inline-block" />
                <span>Income</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-xs bg-rose-500 inline-block" />
                <span>Expense</span>
              </span>
            </div>
          </div>

          <div className="p-4 rounded-3xl bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200/80 dark:border-neutral-700/80">
            <div className="grid grid-cols-5 gap-2 items-end h-32 pt-4">
              {trends.map((t) => {
                const incomeH = maxTrendVal > 0 ? (t.incomeYen / maxTrendVal) * 100 : 0;
                const expenseH = maxTrendVal > 0 ? (t.expenseYen / maxTrendVal) * 100 : 0;
                const isSelected = t.month === reportMonth;

                return (
                  <button
                    key={t.month}
                    type="button"
                    onClick={() => setReportMonth(t.month)}
                    className={`flex flex-col items-center h-full justify-end group transition-all rounded-xl p-1 ${
                      isSelected ? 'bg-emerald-50/70 dark:bg-emerald-950/40 ring-1 ring-emerald-600' : 'hover:bg-neutral-100 dark:hover:bg-neutral-700/50'
                    }`}
                  >
                    <div className="flex gap-1 items-end h-20 w-full justify-center">
                      {/* Income Bar */}
                      <div
                        className="w-2.5 bg-emerald-600 rounded-t-sm transition-all duration-300 group-hover:brightness-110"
                        style={{ height: `${Math.max(4, incomeH)}%` }}
                        title={`Income: ${formatYen(t.incomeYen)}`}
                      />
                      {/* Expense Bar */}
                      <div
                        className="w-2.5 bg-rose-500 rounded-t-sm transition-all duration-300 group-hover:brightness-110"
                        style={{ height: `${Math.max(4, expenseH)}%` }}
                        title={`Expense: ${formatYen(t.expenseYen)}`}
                      />
                    </div>
                    <span className="text-[10px] font-semibold text-neutral-600 dark:text-neutral-400 mt-2 truncate w-full text-center">
                      {t.month.split('-')[1]}月
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </ModalSheet>
  );
};
