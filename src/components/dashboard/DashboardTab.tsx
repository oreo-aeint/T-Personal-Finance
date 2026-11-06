import React, { useState, useEffect } from 'react';
import { PiggyBank } from 'lucide-react';
import { MonthSelector } from './MonthSelector';
import { FinancialSummaryCard } from './FinancialSummaryCard';
import { CategoryIcon } from '../common/CategoryIcon';
import type {
  MonthlyFinancialSummary,
  Transaction,
  SavingsGoal,
} from '../../types';
import { getMonthlyFinancialSummary, getCategoryExpenseBreakdown } from '../../services/report.service';
import { getTransactions } from '../../services/transaction.service';
import { getSavingsGoals } from '../../services/savings.service';
import { formatYen } from '../../utils/currency';
import { formatDisplayDate } from '../../utils/date';
import { useThemeStyle } from '../../theme/ThemeContext';
import { RenCompanionCard } from '../common/RenCompanionCard';

interface DashboardTabProps {
  currentMonth: string;
  onChangeMonth: (m: string) => void;
  onNavigateToTab: (tab: any) => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  currentMonth,
  onChangeMonth,
  onNavigateToTab,
}) => {
  const [summary, setSummary] = useState<MonthlyFinancialSummary>({
    month: currentMonth,
    totalIncomeYen: 0,
    totalExpenseYen: 0,
    totalSavingsYen: 0,
    availableSpendingYen: 0,
    totalBudgetLimitYen: 0,
    budgetUsagePercent: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [topExpenseCategories, setTopExpenseCategories] = useState<any[]>([]);

  const loadDashboardData = async () => {
    try {
      const [sum, txs, goals, bdown] = await Promise.all([
        getMonthlyFinancialSummary(currentMonth),
        getTransactions({ month: currentMonth, limit: 5 }),
        getSavingsGoals(),
        getCategoryExpenseBreakdown(currentMonth),
      ]);
      setSummary(sum);
      setRecentTransactions(txs);
      setSavingsGoals(goals);
      setTopExpenseCategories(bdown.slice(0, 4));
    } catch (err) {
      console.error(err);
    }
  };

  const { themeStyle } = useThemeStyle();

  useEffect(() => {
    loadDashboardData();
  }, [currentMonth]);

  return (
    <div className="space-y-3.5 px-4 pt-1 pb-4">
      {/* Month Navigator Header */}
      <MonthSelector currentMonth={currentMonth} onChangeMonth={onChangeMonth} />

      {/* Cute Boy Companion: Ren_漣 (Only active in cute theme) */}
      {themeStyle === 'cute' && (
        <RenCompanionCard summary={summary} />
      )}

      {/* Main KPI Card: Available Spending & 3-Pillar Breakdown */}
      <FinancialSummaryCard summary={summary} />

      {/* Spending Distribution by Category */}
      {topExpenseCategories.length > 0 && (
        <div className="bg-white dark:bg-neutral-800/80 rounded-3xl p-4 border border-neutral-200/80 dark:border-neutral-700/80 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between text-xs font-semibold text-neutral-800 dark:text-neutral-200">
            <span>Spending Distribution</span>
            <button
              type="button"
              onClick={() => onNavigateToTab('budget')}
              className="text-[11px] text-emerald-700 dark:text-emerald-400 hover:underline"
            >
              Budget Details
            </button>
          </div>

          <div className="space-y-1.5">
            {topExpenseCategories.map((c) => (
              <div key={c.categoryId} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <CategoryIcon name={c.categoryIcon} size={13} className="text-neutral-500" />
                  <span className="text-neutral-700 dark:text-neutral-300 font-medium">
                    {c.categoryName}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-neutral-900 dark:text-neutral-100 tabular-nums">
                    {formatYen(c.amountYen)}
                  </span>
                  <span className="text-[10px] text-neutral-400 tabular-nums w-7 text-right">
                    {c.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Savings Goals Snippet */}
      {savingsGoals.length > 0 && (
        <div className="bg-white dark:bg-neutral-800/80 rounded-3xl p-4 border border-neutral-200/80 dark:border-neutral-700/80 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between text-xs font-semibold text-neutral-800 dark:text-neutral-200">
            <span className="flex items-center gap-1.5">
              <PiggyBank size={14} className="text-teal-700 dark:text-teal-400" />
              <span>Savings Goals</span>
            </span>
            <button
              type="button"
              onClick={() => onNavigateToTab('savings')}
              className="text-[11px] text-teal-700 dark:text-teal-400 hover:underline"
            >
              See all ({savingsGoals.length})
            </button>
          </div>

          <div className="space-y-2">
            {savingsGoals.slice(0, 2).map((g) => {
              const saved = g.current_saved_yen || 0;
              const pct = Math.min(100, Math.round((saved / g.target_yen) * 100));
              return (
                <div key={g.id} className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200">{g.name}</span>
                    <span className="tabular-nums font-bold text-teal-700 dark:text-teal-400">{pct}% ({formatYen(saved)})</span>
                  </div>
                  <div className="w-full bg-neutral-100 dark:bg-neutral-700 h-1.5 rounded-full overflow-hidden">
                    <div className="h-full bg-teal-600 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Activity / Transactions List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-neutral-800 dark:text-neutral-200 px-1">
          <span>Recent Activity</span>
          <button
            type="button"
            onClick={() => onNavigateToTab('transactions')}
            className="text-[11px] text-emerald-700 dark:text-emerald-400 hover:underline"
          >
            All Activity
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="bg-white dark:bg-neutral-800/60 rounded-3xl p-5 border border-neutral-200/70 dark:border-neutral-800 text-center">
            <p className="text-xs text-neutral-500 mb-2">
              No transactions recorded for this month yet.
            </p>
            <button
              type="button"
              onClick={() => onNavigateToTab('transactions')}
              className="px-3.5 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 text-xs font-semibold hover:bg-neutral-200 transition-colors"
            >
              Go to Activity Log
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-neutral-800/80 rounded-3xl border border-neutral-200/80 dark:border-neutral-700/80 divide-y divide-neutral-100 dark:divide-neutral-700/50 shadow-xs overflow-hidden">
            {recentTransactions.map((tx) => {
              const isIncome = tx.type === 'income';
              return (
                <div key={tx.id} className="p-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        isIncome ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60' : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-700'
                      }`}
                    >
                      <CategoryIcon name={tx.category_icon || 'Tag'} size={15} />
                    </div>
                    <div className="min-w-0">
                      <span className="font-semibold text-neutral-900 dark:text-neutral-100 block truncate">
                        {tx.category_name || 'Uncategorized'}
                      </span>
                      <span className="text-[10px] text-neutral-400 block truncate">
                        {formatDisplayDate(tx.transaction_date)} {tx.note ? `· ${tx.note}` : ''}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`font-bold tabular-nums whitespace-nowrap ml-2 ${
                      isIncome ? 'text-emerald-700 dark:text-emerald-400' : 'text-neutral-900 dark:text-neutral-100'
                    }`}
                  >
                    {isIncome ? `+${formatYen(tx.amount_yen)}` : `-${formatYen(tx.amount_yen)}`}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
