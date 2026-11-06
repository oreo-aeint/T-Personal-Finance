import React, { useState, useEffect } from 'react';
import { Search, Plus, Minus, Trash2, Edit2, Filter, CalendarClock, BarChart2 } from 'lucide-react';
import { CategoryIcon } from '../common/CategoryIcon';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { TransactionModal } from './TransactionModal';
import type { Category, Transaction, TransactionType } from '../../types';
import { getTransactions, getCategories, deleteTransaction } from '../../services/transaction.service';
import { formatYen } from '../../utils/currency';
import { formatDisplayDate } from '../../utils/date';

interface TransactionsTabProps {
  currentMonth: string;
  onOpenRecurringModal?: () => void;
  onOpenReportModal?: () => void;
}

export const TransactionsTab: React.FC<TransactionsTabProps> = ({
  currentMonth,
  onOpenRecurringModal,
  onOpenReportModal,
}) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedType, setSelectedType] = useState<TransactionType | 'all'>('all');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | 'all'>('all');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalType, setModalType] = useState<TransactionType>('expense');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [txs, cats] = await Promise.all([
        getTransactions({
          month: currentMonth,
          type: selectedType,
          categoryId: selectedCategoryId,
          searchQuery,
        }),
        getCategories(),
      ]);
      setTransactions(txs);
      setCategories(cats);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentMonth, selectedType, selectedCategoryId, searchQuery]);

  const handleDeleteConfirm = async () => {
    if (!deletingTransaction) return;
    try {
      await deleteTransaction(deletingTransaction.id);
      setDeletingTransaction(null);
      loadData();
    } catch (err) {
      console.error('Failed to delete transaction:', err);
    }
  };

  // Filter category dropdown to match selected type if not 'all'
  const filteredCategories = categories.filter(
    (c) => selectedType === 'all' || c.type === selectedType
  );

  return (
    <div className="space-y-3.5 px-4 pt-2 pb-6">
      {/* 1. Fast Logging: Two Dedicated Buttons (Expense vs Income) */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => {
            setEditingTransaction(null);
            setModalType('expense');
            setIsModalOpen(true);
          }}
          className="min-h-[44px] py-2.5 px-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs active:scale-[0.98] transition-all"
        >
          <Minus size={15} strokeWidth={2.5} />
          <span>Log Expense (支出)</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setEditingTransaction(null);
            setModalType('income');
            setIsModalOpen(true);
          }}
          className="min-h-[44px] py-2.5 px-3 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs active:scale-[0.98] transition-all"
        >
          <Plus size={15} strokeWidth={2.5} />
          <span>Log Income (収入)</span>
        </button>
      </div>

      {/* 2. Companion Access: Recurring Bills & Monthly Report */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onOpenRecurringModal}
          className="min-h-[40px] p-2.5 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700/80 hover:bg-neutral-50 dark:hover:bg-neutral-750 flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
        >
          <CalendarClock size={15} className="text-emerald-700 dark:text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 truncate">
            Recurring Bills (固定費)
          </span>
        </button>

        <button
          type="button"
          onClick={onOpenReportModal}
          className="min-h-[40px] p-2.5 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700/80 hover:bg-neutral-50 dark:hover:bg-neutral-750 flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
        >
          <BarChart2 size={15} className="text-emerald-700 dark:text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 truncate">
            Monthly Report (レポート)
          </span>
        </button>
      </div>

      {/* 3. Full-width Search Bar */}
      <div className="relative w-full">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input
          type="text"
          placeholder="Search notes or categories..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-3.5 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/80 rounded-2xl text-xs text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-600 shadow-2xs"
        />
      </div>

      {/* 4. Fixed 3-button Segmented Control (NO horizontal scroll) */}
      <div className="grid grid-cols-3 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-2xl w-full">
        <button
          type="button"
          onClick={() => {
            setSelectedType('all');
            setSelectedCategoryId('all');
          }}
          className={`py-1.5 text-xs font-semibold rounded-xl transition-all ${
            selectedType === 'all'
              ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs'
              : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
          }`}
        >
          All
        </button>
        <button
          type="button"
          onClick={() => {
            setSelectedType('expense');
            setSelectedCategoryId('all');
          }}
          className={`py-1.5 text-xs font-semibold rounded-xl transition-all ${
            selectedType === 'expense'
              ? 'bg-white dark:bg-neutral-900 text-rose-600 dark:text-rose-400 shadow-xs'
              : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
          }`}
        >
          Expenses
        </button>
        <button
          type="button"
          onClick={() => {
            setSelectedType('income');
            setSelectedCategoryId('all');
          }}
          className={`py-1.5 text-xs font-semibold rounded-xl transition-all ${
            selectedType === 'income'
              ? 'bg-white dark:bg-neutral-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
              : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
          }`}
        >
          Income
        </button>
      </div>

      {/* 5. Clean Category Dropdown Selector */}
      <select
        value={selectedCategoryId}
        onChange={(e) => setSelectedCategoryId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
        className="w-full px-3 py-2 rounded-xl text-xs font-medium bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
      >
        <option value="all">All Categories (全カテゴリー)</option>
        {filteredCategories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} ({c.type})
          </option>
        ))}
      </select>

      {/* 6. Transaction List */}
      {transactions.length === 0 ? (
        <div className="bg-white dark:bg-neutral-800/60 rounded-3xl p-8 border border-neutral-200/70 dark:border-neutral-800 text-center my-4">
          <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-neutral-100 dark:bg-neutral-700/60 flex items-center justify-center text-neutral-400">
            <Filter size={20} />
          </div>
          <h4 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
            No transactions found
          </h4>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-xs mx-auto mb-4">
            No recorded transactions matching your search or filters for this month.
          </p>
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => {
                setEditingTransaction(null);
                setModalType('expense');
                setIsModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold shadow-xs hover:bg-rose-700 transition-colors"
            >
              <Minus size={13} strokeWidth={2.5} />
              <span>Log Expense</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingTransaction(null);
                setModalType('income');
                setIsModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 text-white text-xs font-semibold shadow-xs hover:bg-emerald-800 transition-colors"
            >
              <Plus size={13} strokeWidth={2.5} />
              <span>Log Income</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-neutral-800/80 rounded-3xl border border-neutral-200/80 dark:border-neutral-700/80 divide-y divide-neutral-100 dark:divide-neutral-700/50 shadow-xs overflow-hidden">
          {transactions.map((tx) => {
            const isIncome = tx.type === 'income';
            return (
              <div
                key={tx.id}
                className="p-3.5 flex items-center justify-between hover:bg-neutral-50/80 dark:hover:bg-neutral-750 transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                      isIncome
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                        : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300'
                    }`}
                  >
                    <CategoryIcon name={tx.category_icon || 'Tag'} size={18} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                        {tx.category_name || 'Uncategorized'}
                      </span>
                      {tx.salary_record_id && (
                        <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
                          · Salary Net Payout
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-neutral-500 dark:text-neutral-400">
                      <span>{formatDisplayDate(tx.transaction_date)}</span>
                      {tx.note && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="truncate max-w-[140px]">{tx.note}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Amount and Actions */}
                <div className="flex items-center gap-2.5 ml-2">
                  <span
                    className={`text-xs font-bold tabular-nums whitespace-nowrap ${
                      isIncome
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-neutral-900 dark:text-neutral-100'
                    }`}
                  >
                    {isIncome ? `+${formatYen(tx.amount_yen)}` : `-${formatYen(tx.amount_yen)}`}
                  </span>

                  {/* Actions (visible or on hover) */}
                  <div className="flex items-center gap-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                    {!tx.salary_record_id && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTransaction(tx);
                          setIsModalOpen(true);
                        }}
                        className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700"
                        title="Edit transaction"
                      >
                        <Edit2 size={13} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setDeletingTransaction(tx)}
                      className="p-1 text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      title="Delete transaction"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTransaction(null);
        }}
        onSaved={loadData}
        initialTransaction={editingTransaction}
        initialType={modalType}
        defaultMonth={currentMonth}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deletingTransaction}
        title="Delete Transaction?"
        message={`Are you sure you want to remove this ${deletingTransaction?.type} of ${formatYen(deletingTransaction?.amount_yen)}? This action cannot be undone.`}
        confirmLabel="Delete"
        isDestructive={true}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingTransaction(null)}
      />
    </div>
  );
};
