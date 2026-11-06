import React, { useState, useEffect } from 'react';
import { Plus, Tag } from 'lucide-react';
import { ModalSheet } from '../common/ModalSheet';
import { CategoryIcon } from '../common/CategoryIcon';
import type { Category, Transaction, TransactionType } from '../../types';
import { getCategories, addCategory, addTransaction, updateTransaction } from '../../services/transaction.service';
import { getTodayDateString } from '../../utils/date';
import { parseYenInput, formatNumber } from '../../utils/currency';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  initialTransaction?: Transaction | null;
  initialType?: TransactionType;
  defaultMonth?: string;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  initialTransaction,
  initialType = 'expense',
  defaultMonth,
}) => {
  const [type, setType] = useState<TransactionType>(initialType);
  const [amountStr, setAmountStr] = useState<string>('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [date, setDate] = useState<string>(getTodayDateString());
  const [note, setNote] = useState<string>('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [isCreatingCustomCat, setIsCreatingCustomCat] = useState<boolean>(false);
  const [customCatName, setCustomCatName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load categories when modal opens or type changes
  useEffect(() => {
    if (isOpen) {
      loadCategories(type);
    }
  }, [isOpen, type]);

  // Populate initial values on edit
  useEffect(() => {
    if (initialTransaction) {
      setType(initialTransaction.type);
      setAmountStr(String(initialTransaction.amount_yen));
      setCategoryId(initialTransaction.category_id);
      setDate(initialTransaction.transaction_date);
      setNote(initialTransaction.note || '');
      setIsCreatingCustomCat(false);
      setCustomCatName('');
    } else {
      setType(initialType || 'expense');
      setAmountStr('');
      setCategoryId(null);
      setIsCreatingCustomCat(false);
      setCustomCatName('');
      if (defaultMonth) {
        setDate(`${defaultMonth}-01`);
      } else {
        setDate(getTodayDateString());
      }
      setNote('');
    }
    setError(null);
  }, [initialTransaction, initialType, isOpen, defaultMonth]);

  const loadCategories = async (txType: TransactionType) => {
    try {
      const cats = await getCategories(txType);
      setCategories(cats);
      if (!initialTransaction && cats.length > 0 && categoryId === null) {
        setCategoryId(cats[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleQuickAdd = (addAmount: number) => {
    const current = parseYenInput(amountStr);
    setAmountStr(String(current + addAmount));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseYenInput(amountStr);
    if (amount <= 0) {
      setError('Please enter a valid amount greater than ¥0');
      return;
    }
    if (!date) {
      setError('Please select a transaction date');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let finalCategoryId = categoryId;

      // If user typed a custom category name, create and persist it in the database
      if (isCreatingCustomCat && customCatName.trim().length > 0) {
        const newCatId = await addCategory(customCatName.trim(), type, 'Tag');
        finalCategoryId = newCatId;
      }

      if (initialTransaction) {
        await updateTransaction(initialTransaction.id, {
          type,
          amount_yen: amount,
          category_id: finalCategoryId,
          transaction_date: date,
          note: note.trim() || null,
        });
      } else {
        await addTransaction({
          type,
          amount_yen: amount,
          category_id: finalCategoryId,
          transaction_date: date,
          note: note.trim() || null,
        });
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save transaction.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalSheet
      isOpen={isOpen}
      onClose={onClose}
      title={initialTransaction ? 'Edit Transaction' : 'New Transaction'}
      subtitle="Track your daily income or expense in Japan"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs border border-rose-200 dark:border-rose-900/60">
            {error}
          </div>
        )}

        {/* Type Toggle: Segmented Control */}
        <div className="grid grid-cols-2 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-2xl">
          <button
            type="button"
            onClick={() => {
              setType('expense');
              loadCategories('expense');
            }}
            className={`py-2 text-xs font-semibold rounded-xl transition-all ${
              type === 'expense'
                ? 'bg-white dark:bg-neutral-900 text-rose-600 dark:text-rose-400 shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            Expense (支出)
          </button>
          <button
            type="button"
            onClick={() => {
              setType('income');
              loadCategories('income');
            }}
            className={`py-2 text-xs font-semibold rounded-xl transition-all ${
              type === 'income'
                ? 'bg-white dark:bg-neutral-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            Income (収入)
          </button>
        </div>

        {/* Amount Input */}
        <div>
          <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
            Amount (JPY ¥)
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-neutral-400">
              ¥
            </span>
            <input
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={amountStr ? formatNumber(parseYenInput(amountStr)) : ''}
              onChange={(e) => setAmountStr(e.target.value)}
              className="w-full pl-9 pr-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl text-xl font-bold text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-600 tabular-nums"
              required
            />
          </div>

          {/* Quick Add Presets */}
          <div className="flex gap-1.5 mt-2">
            {[1000, 3000, 5000, 10000].map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => handleQuickAdd(amt)}
                className="flex-1 py-1 px-1.5 rounded-lg text-[11px] font-medium bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition-colors"
              >
                +¥{formatNumber(amt)}
              </button>
            ))}
          </div>
        </div>

        {/* Category Picker */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Category
            </label>
            <button
              type="button"
              onClick={() => {
                setIsCreatingCustomCat(!isCreatingCustomCat);
                if (!isCreatingCustomCat) {
                  setCategoryId(null);
                }
              }}
              className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1"
            >
              <Plus size={12} />
              <span>{isCreatingCustomCat ? 'Choose Existing' : '+ Custom Name'}</span>
            </button>
          </div>

          {isCreatingCustomCat ? (
            <div className="p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-1.5">
              <label className="block text-[11px] font-semibold text-emerald-900 dark:text-emerald-300">
                Name your {type === 'expense' ? 'expense' : 'income'} category
              </label>
              <input
                type="text"
                placeholder={type === 'expense' ? 'e.g. Japanese School Fees, 100-Yen Shop, Bicycle Registration' : 'e.g. Scholarship (奨学金), Flea Market (メルカリ), Freelance'}
                value={customCatName}
                onChange={(e) => setCustomCatName(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
                autoFocus
                required
              />
              <p className="text-[10px] text-emerald-800/80 dark:text-emerald-400">
                ✨ This custom category will be saved and added to your categories list.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
              {categories.map((cat) => {
                const isSelected = categoryId === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setCategoryId(cat.id);
                      setIsCreatingCustomCat(false);
                    }}
                    className={`flex items-center gap-2 p-2 rounded-xl text-left border transition-all ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 font-semibold shadow-xs'
                        : 'border-neutral-200 dark:border-neutral-700/80 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-750'
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-emerald-600 text-white' : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'}`}>
                      <CategoryIcon name={cat.icon} size={15} />
                    </div>
                    <span className="text-xs truncate">{cat.name}</span>
                  </button>
                );
              })}

              {/* Quick custom card as last item */}
              <button
                type="button"
                onClick={() => {
                  setIsCreatingCustomCat(true);
                  setCategoryId(null);
                }}
                className="flex items-center gap-2 p-2 rounded-xl text-left border border-dashed border-neutral-300 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-850 text-neutral-600 dark:text-neutral-400 hover:border-emerald-600 hover:text-emerald-700 transition-colors"
              >
                <div className="p-1.5 rounded-lg bg-neutral-200/60 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300">
                  <Plus size={15} />
                </div>
                <span className="text-xs font-medium truncate">+ Custom Name</span>
              </button>
            </div>
          )}
        </div>

        {/* Date */}
        <div>
          <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
            Date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-medium text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
            required
          />
        </div>

        {/* Note */}
        <div>
          <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
            Note (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. 7-Eleven bento, commuter pass, school fees"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
          />
        </div>

        {/* Submit */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[44px] py-3 rounded-2xl bg-emerald-700 hover:bg-emerald-800 active:scale-[0.98] text-white text-xs font-bold transition-all shadow-md shadow-emerald-900/10 disabled:opacity-50"
          >
            {loading ? 'Saving...' : initialTransaction ? 'Update Transaction' : 'Save Transaction'}
          </button>
        </div>
      </form>
    </ModalSheet>
  );
};
