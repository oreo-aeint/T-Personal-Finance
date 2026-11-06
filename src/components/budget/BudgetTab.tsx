import React, { useState, useEffect } from 'react';
import { Plus, Copy, AlertTriangle, CheckCircle2, Trash2 } from 'lucide-react';
import { CategoryIcon } from '../common/CategoryIcon';
import { ModalSheet } from '../common/ModalSheet';
import { ConfirmDialog } from '../common/ConfirmDialog';
import type { Budget, Category } from '../../types';
import { getBudgetsForMonth, setCategoryBudget, deleteBudget, copyBudgetFromPreviousMonth } from '../../services/budget.service';
import { getCategories } from '../../services/transaction.service';
import { formatYen, parseYenInput, formatNumber } from '../../utils/currency';
import { getRelativeMonth, formatMonthName } from '../../utils/date';

interface BudgetTabProps {
  currentMonth: string;
}

export const BudgetTab: React.FC<BudgetTabProps> = ({ currentMonth }) => {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<Category[]>([]);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [limitInput, setLimitInput] = useState<string>('');
  const [copying, setCopying] = useState<boolean>(false);
  const [copySuccessMsg, setCopySuccessMsg] = useState<string | null>(null);
  const [deletingBudgetId, setDeletingBudgetId] = useState<number | null>(null);

  const loadData = async () => {
    try {
      const [bList, cats] = await Promise.all([
        getBudgetsForMonth(currentMonth),
        getCategories('expense'),
      ]);
      setBudgets(bList);
      setExpenseCategories(cats);
    } catch (err) {
      console.error('Failed to load budgets:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentMonth]);

  const totalLimit = budgets.reduce((acc, b) => acc + b.limit_yen, 0);
  const totalSpent = budgets.reduce((acc, b) => acc + (b.spent_yen || 0), 0);
  const totalRemaining = totalLimit - totalSpent;
  const overallPercentage = totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0;

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategoryId) return;
    const limit = parseYenInput(limitInput);
    try {
      await setCategoryBudget(selectedCategoryId, currentMonth, limit);
      setIsModalOpen(false);
      setSelectedCategoryId(null);
      setLimitInput('');
      loadData();
    } catch (err) {
      console.error('Failed to save budget:', err);
    }
  };

  const handleCopyFromPrevious = async () => {
    const prevMonth = getRelativeMonth(currentMonth, -1);
    setCopying(true);
    setCopySuccessMsg(null);
    try {
      const count = await copyBudgetFromPreviousMonth(prevMonth, currentMonth);
      if (count > 0) {
        setCopySuccessMsg(`Copied ${count} category budget${count > 1 ? 's' : ''} from ${formatMonthName(prevMonth)}.`);
        loadData();
      } else {
        setCopySuccessMsg(`No budgets set in ${formatMonthName(prevMonth)} to copy.`);
      }
    } catch (err) {
      console.error('Failed to copy budgets:', err);
    } finally {
      setCopying(false);
      setTimeout(() => setCopySuccessMsg(null), 4000);
    }
  };

  const handleDeleteBudget = async () => {
    if (!deletingBudgetId) return;
    try {
      await deleteBudget(deletingBudgetId);
      setDeletingBudgetId(null);
      loadData();
    } catch (err) {
      console.error('Failed to delete budget:', err);
    }
  };

  return (
    <div className="space-y-4 px-4 pt-2">
      {/* Overall Budget Overview Card */}
      <div className="bg-white dark:bg-neutral-800/80 rounded-3xl p-5 border border-neutral-200/80 dark:border-neutral-700/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
          <span className="font-semibold text-neutral-800 dark:text-neutral-200">
            Monthly Spending Budget ({formatMonthName(currentMonth)})
          </span>
          <span className="tabular-nums font-semibold">{overallPercentage}% used</span>
        </div>

        <div className="flex items-baseline justify-between">
          <div>
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400 block mb-0.5">
              Remaining Budget
            </span>
            <div
              className={`text-2xl font-extrabold tracking-tight tabular-nums ${
                totalRemaining >= 0
                  ? 'text-neutral-900 dark:text-neutral-50'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {formatYen(totalRemaining)}
            </div>
          </div>
          <div className="text-right text-xs">
            <span className="text-neutral-500 dark:text-neutral-400 block">
              Spent: <strong className="text-neutral-900 dark:text-neutral-100 tabular-nums">{formatYen(totalSpent)}</strong>
            </span>
            <span className="text-neutral-500 dark:text-neutral-400 block">
              Limit: <strong className="text-neutral-900 dark:text-neutral-100 tabular-nums">{formatYen(totalLimit)}</strong>
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-neutral-100 dark:bg-neutral-700 h-2.5 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              overallPercentage > 100
                ? 'bg-rose-500'
                : overallPercentage > 80
                ? 'bg-amber-500'
                : 'bg-emerald-600'
            }`}
            style={{ width: `${Math.min(100, overallPercentage)}%` }}
          />
        </div>
      </div>

      {/* Copy banner feedback */}
      {copySuccessMsg && (
        <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2 border border-emerald-200 dark:border-emerald-800">
          <CheckCircle2 size={16} />
          <span>{copySuccessMsg}</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setSelectedCategoryId(expenseCategories[0]?.id || null);
            setLimitInput('');
            setIsModalOpen(true);
          }}
          className="flex-1 min-h-[40px] py-2 px-3 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm active:scale-98 transition-all"
        >
          <Plus size={15} />
          <span>Set Category Budget</span>
        </button>
        <button
          type="button"
          onClick={handleCopyFromPrevious}
          disabled={copying}
          className="min-h-[40px] py-2 px-3 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 text-neutral-700 dark:text-neutral-200 text-xs font-medium flex items-center gap-1.5 shadow-xs transition-colors"
          title="Copy previous month's budget"
        >
          <Copy size={14} />
          <span>Copy Last Month</span>
        </button>
      </div>

      {/* Category Budgets List */}
      <div className="space-y-2.5">
        <h4 className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 px-1">
          Category Limits & Usage
        </h4>

        {budgets.length === 0 ? (
          <div className="bg-white dark:bg-neutral-800/60 rounded-3xl p-6 border border-neutral-200/70 dark:border-neutral-800 text-center">
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3">
              No budgets configured for this month. Set individual spending limits for food, rent, entertainment, etc.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedCategoryId(expenseCategories[0]?.id || null);
                setIsModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800"
            >
              Add First Budget
            </button>
          </div>
        ) : (
          budgets.map((b) => {
            const spent = b.spent_yen || 0;
            const remaining = b.limit_yen - spent;
            const pct = b.limit_yen > 0 ? Math.round((spent / b.limit_yen) * 100) : 0;
            const isExceeded = remaining < 0;

            return (
              <div
                key={b.id}
                className="bg-white dark:bg-neutral-800/80 rounded-2xl p-3.5 border border-neutral-200/80 dark:border-neutral-700/80 shadow-xs space-y-2 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center text-neutral-700 dark:text-neutral-300">
                      <CategoryIcon name={b.category_name} size={15} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 block">
                        {b.category_name}
                      </span>
                      <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
                        Spent {formatYen(spent)} of {formatYen(b.limit_yen)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <span
                        className={`text-xs font-bold tabular-nums block ${
                          isExceeded ? 'text-rose-600 dark:text-rose-400' : 'text-neutral-900 dark:text-neutral-100'
                        }`}
                      >
                        {isExceeded ? `Over by ${formatYen(Math.abs(remaining))}` : `${formatYen(remaining)} left`}
                      </span>
                      <span className="text-[10px] text-neutral-500 dark:text-neutral-400 tabular-nums">
                        {pct}%
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setDeletingBudgetId(b.id)}
                      className="p-1 text-neutral-400 hover:text-rose-600 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 opacity-80 group-hover:opacity-100 transition-opacity"
                      title="Remove budget"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-neutral-100 dark:bg-neutral-700 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 rounded-full ${
                      pct > 100 ? 'bg-rose-500' : pct > 80 ? 'bg-amber-500' : 'bg-emerald-600'
                    }`}
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Set Budget Modal */}
      <ModalSheet
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Set Category Budget"
        subtitle={`Set monthly maximum limit for ${formatMonthName(currentMonth)}`}
      >
        <form onSubmit={handleSaveBudget} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Select Expense Category
            </label>
            <select
              value={selectedCategoryId || ''}
              onChange={(e) => setSelectedCategoryId(Number(e.target.value))}
              className="w-full px-3 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-medium text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
              required
            >
              {expenseCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Monthly Limit (JPY ¥)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base font-bold text-neutral-400">
                ¥
              </span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="e.g. 30,000"
                value={limitInput ? formatNumber(parseYenInput(limitInput)) : ''}
                onChange={(e) => setLimitInput(e.target.value)}
                className="w-full pl-8 pr-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-base font-bold text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-600 tabular-nums"
                required
              />
            </div>
            {/* Quick limits */}
            <div className="flex gap-1.5 mt-2">
              {[10000, 20000, 30000, 50000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setLimitInput(String(amt))}
                  className="flex-1 py-1 px-1.5 rounded-lg text-[11px] font-medium bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                >
                  ¥{formatNumber(amt)}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full min-h-[44px] py-3 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all shadow-md shadow-emerald-900/10 active:scale-[0.98]"
            >
              Save Budget Limit
            </button>
          </div>
        </form>
      </ModalSheet>

      {/* Confirm Delete Budget */}
      <ConfirmDialog
        isOpen={!!deletingBudgetId}
        title="Remove Budget Limit?"
        message="Are you sure you want to remove this category budget for the current month?"
        confirmLabel="Remove"
        isDestructive={true}
        onConfirm={handleDeleteBudget}
        onCancel={() => setDeletingBudgetId(null)}
      />
    </div>
  );
};
