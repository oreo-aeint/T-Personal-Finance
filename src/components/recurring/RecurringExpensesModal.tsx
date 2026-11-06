import React, { useState, useEffect } from 'react';
import {
  CalendarClock,
  Plus,
  Check,
  CheckCircle2,
  Trash2,
  AlertCircle,
  Calendar,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { ModalSheet } from '../common/ModalSheet';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { CategoryIcon } from '../common/CategoryIcon';
import type { RecurringExpense, Category } from '../../types';
import {
  getRecurringExpenses,
  createRecurringExpense,
  updateRecurringExpense,
  deleteRecurringExpense,
  confirmRecurringPayment,
} from '../../services/recurring-expense.service';
import { getCategories } from '../../services/transaction.service';
import { formatYen, parseYenInput, formatNumber } from '../../utils/currency';
import { formatDisplayDate, getTodayDateString } from '../../utils/date';

interface RecurringExpensesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentConfirmed?: () => void;
}

const PRESET_RECURRING = [
  { name: 'Monthly Apartment Rent (家賃)', amount: 65000, categoryName: 'Rent', freq: 'monthly' as const },
  { name: 'Mobile Phone & SIM (スマホ代)', amount: 3200, categoryName: 'Phone and Internet', freq: 'monthly' as const },
  { name: 'Fiber Internet (光回線)', amount: 4800, categoryName: 'Phone and Internet', freq: 'monthly' as const },
  { name: 'Suica / Train Pass (定期券)', amount: 12000, categoryName: 'Transportation', freq: 'monthly' as const },
];

export const RecurringExpensesModal: React.FC<RecurringExpensesModalProps> = ({
  isOpen,
  onClose,
  onPaymentConfirmed,
}) => {
  const [items, setItems] = useState<RecurringExpense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [confirmingExpense, setConfirmingExpense] = useState<RecurringExpense | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [nameInput, setNameInput] = useState<string>('');
  const [amountInput, setAmountInput] = useState<string>('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [frequency, setFrequency] = useState<'monthly' | 'weekly' | 'yearly'>('monthly');
  const [dueDateInput, setDueDateInput] = useState<string>(getTodayDateString());
  const [noteInput, setNoteInput] = useState<string>('');

  const loadData = async () => {
    try {
      const [list, cats] = await Promise.all([
        getRecurringExpenses(),
        getCategories('expense'),
      ]);
      setItems(list);
      setCategories(cats);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const handleCreateRecurring = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseYenInput(amountInput);
    if (!nameInput.trim() || amount <= 0) {
      setErrorMsg('Please enter a valid name and amount.');
      return;
    }

    try {
      await createRecurringExpense({
        name: nameInput.trim(),
        amount_yen: amount,
        category_id: categoryId,
        frequency,
        next_due_date: dueDateInput,
        note: noteInput.trim() || null,
        is_active: 1,
      });

      setIsFormOpen(false);
      setNameInput('');
      setAmountInput('');
      setNoteInput('');
      setErrorMsg(null);
      loadData();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save recurring expense.');
    }
  };

  const handleToggleActive = async (expense: RecurringExpense) => {
    try {
      await updateRecurringExpense(expense.id, {
        name: expense.name,
        amount_yen: expense.amount_yen,
        category_id: expense.category_id,
        frequency: expense.frequency,
        next_due_date: expense.next_due_date,
        note: expense.note,
        is_active: expense.is_active === 1 ? 0 : 1,
      });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleConfirmPayment = async () => {
    if (!confirmingExpense) return;
    try {
      setErrorMsg(null);
      await confirmRecurringPayment(confirmingExpense.id, confirmingExpense.next_due_date);
      setSuccessMsg(`Recorded ${confirmingExpense.name} payment of ${formatYen(confirmingExpense.amount_yen)}. Due date updated!`);
      setConfirmingExpense(null);
      loadData();
      if (onPaymentConfirmed) onPaymentConfirmed();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Payment confirmation failed.');
      setConfirmingExpense(null);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteRecurringExpense(deletingId);
      setDeletingId(null);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleApplyPreset = (preset: typeof PRESET_RECURRING[0]) => {
    setNameInput(preset.name);
    setAmountInput(String(preset.amount));
    setFrequency(preset.freq);
    const matchedCat = categories.find((c) => c.name.toLowerCase().includes(preset.categoryName.toLowerCase()));
    if (matchedCat) {
      setCategoryId(matchedCat.id);
    }
  };

  return (
    <ModalSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Recurring Expenses (固定費)"
      subtitle="Scheduled reminders for rent, phone, and utilities"
      maxHeight="max-h-[90vh]"
    >
      <div className="space-y-4">
        {/* Banner feedback */}
        {successMsg && (
          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2 border border-rose-200 dark:border-rose-800">
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Action Button */}
        <button
          type="button"
          onClick={() => {
            if (categories.length > 0 && categoryId === null) {
              setCategoryId(categories[0].id);
            }
            setIsFormOpen(true);
          }}
          className="w-full min-h-[44px] py-2.5 px-4 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm active:scale-98 transition-all"
        >
          <Plus size={16} />
          <span>Add Recurring Bill Reminder</span>
        </button>

        {/* Recurring List */}
        {items.length === 0 ? (
          <div className="bg-neutral-50 dark:bg-neutral-800/60 rounded-3xl p-6 border border-neutral-200/70 dark:border-neutral-800 text-center">
            <CalendarClock size={24} className="mx-auto mb-2 text-neutral-400" />
            <h5 className="text-xs font-bold text-neutral-800 dark:text-neutral-200 mb-1">
              No Recurring Reminders
            </h5>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 max-w-xs mx-auto mb-4">
              Add reminders for your Tokyo rent, SoftBank/Docomo phone bill, or internet to never miss a due date.
            </p>
            <div className="flex flex-wrap justify-center gap-1.5">
              {PRESET_RECURRING.slice(0, 2).map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    handleApplyPreset(p);
                    setIsFormOpen(true);
                  }}
                  className="px-2.5 py-1 text-[11px] bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg text-neutral-700 dark:text-neutral-200"
                >
                  + {p.name.split(' (')[0]}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {items.map((item) => {
              const isActive = item.is_active === 1;
              return (
                <div
                  key={item.id}
                  className={`bg-white dark:bg-neutral-800/80 rounded-2xl p-3.5 border transition-all shadow-xs space-y-2.5 ${
                    isActive ? 'border-neutral-200/80 dark:border-neutral-700/80' : 'opacity-60 border-neutral-200/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center text-neutral-700 dark:text-neutral-300">
                        <CategoryIcon name={item.category_name} size={15} />
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                          {item.name}
                        </h5>
                        <div className="flex items-center gap-1.5 text-[10px] text-neutral-500 dark:text-neutral-400">
                          <span className="capitalize">{item.frequency}</span>
                          <span>·</span>
                          <span>Due: {formatDisplayDate(item.next_due_date)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 tabular-nums">
                        {formatYen(item.amount_yen)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleToggleActive(item)}
                        className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                        title={isActive ? 'Pause reminder' : 'Activate reminder'}
                      >
                        {isActive ? <ToggleRight size={18} className="text-emerald-600" /> : <ToggleLeft size={18} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingId(item.id)}
                        className="p-1 text-neutral-400 hover:text-rose-600"
                        title="Delete recurring item"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Confirmation Button: user confirms when payment has actually happened */}
                  {isActive && (
                    <div className="pt-1 flex items-center justify-between border-t border-neutral-100 dark:border-neutral-700/60">
                      <span className="text-[10px] text-neutral-400">
                        Not paid until you confirm
                      </span>
                      <button
                        type="button"
                        onClick={() => setConfirmingExpense(item)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100/80 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-semibold text-[11px] transition-colors"
                      >
                        <Check size={12} strokeWidth={2.5} />
                        <span>Confirm Paid</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Add Recurring Expense Modal Form */}
        {isFormOpen && (
          <div className="p-4 rounded-3xl bg-neutral-50 dark:bg-neutral-800/90 border border-neutral-200 dark:border-neutral-700 mt-4 space-y-3">
            <h5 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
              New Recurring Expense
            </h5>

            {/* Presets quick tags */}
            <div className="flex flex-wrap gap-1">
              {PRESET_RECURRING.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPreset(p)}
                  className="px-2 py-0.5 text-[10px] bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-md text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100"
                >
                  {p.name.split(' (')[0]}
                </button>
              ))}
            </div>

            <form onSubmit={handleCreateRecurring} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-300 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Monthly Rent, Wifi Bill, Netflix"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-300 mb-1">
                    Amount (JPY ¥)
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400">
                      ¥
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={amountInput ? formatNumber(parseYenInput(amountInput)) : ''}
                      onChange={(e) => setAmountInput(e.target.value)}
                      className="w-full pl-6 pr-2 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold tabular-nums"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-300 mb-1">
                    Category
                  </label>
                  <select
                    value={categoryId || ''}
                    onChange={(e) => setCategoryId(Number(e.target.value))}
                    className="w-full px-2 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs"
                    required
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-300 mb-1">
                    Frequency
                  </label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as any)}
                    className="w-full px-2 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="weekly">Weekly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-300 mb-1">
                    First Due Date
                  </label>
                  <input
                    type="date"
                    value={dueDateInput}
                    onChange={(e) => setDueDateInput(e.target.value)}
                    className="w-full px-2 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="flex-1 py-2 text-xs font-medium text-neutral-600 dark:text-neutral-400 bg-neutral-200 dark:bg-neutral-700 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs"
                >
                  Save Reminder
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Confirm Payment Dialog */}
      <ConfirmDialog
        isOpen={!!confirmingExpense}
        title="Confirm Payment?"
        message={`Mark "${confirmingExpense?.name}" (${formatYen(confirmingExpense?.amount_yen)}) as paid on ${confirmingExpense?.next_due_date}? This will create one expense transaction and advance the next due date.`}
        confirmLabel="Confirm Payment"
        onConfirm={handleConfirmPayment}
        onCancel={() => setConfirmingExpense(null)}
      />

      {/* Delete Dialog */}
      <ConfirmDialog
        isOpen={!!deletingId}
        title="Delete Recurring Expense?"
        message="Are you sure you want to remove this recurring reminder?"
        confirmLabel="Delete"
        isDestructive={true}
        onConfirm={handleDelete}
        onCancel={() => setDeletingId(null)}
      />
    </ModalSheet>
  );
};
