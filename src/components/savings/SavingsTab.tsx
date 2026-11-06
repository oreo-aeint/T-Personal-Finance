import React, { useState, useEffect } from 'react';
import { Plus, PiggyBank, Target, Calendar, CheckCircle2, Trash2, ArrowUpRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import { ModalSheet } from '../common/ModalSheet';
import { ConfirmDialog } from '../common/ConfirmDialog';
import type { SavingsGoal, SavingsContribution } from '../../types';
import {
  getSavingsGoals,
  getSavingsGoalById,
  createSavingsGoal,
  updateSavingsGoal,
  deleteSavingsGoal,
  addSavingsContribution,
  deleteSavingsContribution,
} from '../../services/savings.service';
import { formatYen, parseYenInput, formatNumber } from '../../utils/currency';
import { formatDisplayDate, getTodayDateString, calculateDaysRemaining } from '../../utils/date';

interface SavingsTabProps {
  currentMonth: string;
}

const PRESET_GOALS = [
  { name: 'Emergency Fund (非常資金)', target: 300000 },
  { name: 'Tuition Fees (学費積立)', target: 200000 },
  { name: 'Travel & Trips (旅行資金)', target: 80000 },
  { name: 'Personal Savings (貯金)', target: 100000 },
];

export const SavingsTab: React.FC<SavingsTabProps> = ({ currentMonth }) => {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [selectedGoalDetail, setSelectedGoalDetail] = useState<{
    goal: SavingsGoal | null;
    contributions: SavingsContribution[];
  } | null>(null);

  const [isGoalModalOpen, setIsGoalModalOpen] = useState<boolean>(false);
  const [isContribModalOpen, setIsContribModalOpen] = useState<boolean>(false);
  const [targetGoalForContrib, setTargetGoalForContrib] = useState<SavingsGoal | null>(null);

  // Goal Form State
  const [goalName, setGoalName] = useState<string>('');
  const [targetYenInput, setTargetYenInput] = useState<string>('');
  const [targetDateInput, setTargetDateInput] = useState<string>('');

  // Contribution Form State
  const [contribAmountInput, setContribAmountInput] = useState<string>('');
  const [contribDateInput, setContribDateInput] = useState<string>(getTodayDateString());
  const [contribNoteInput, setContribNoteInput] = useState<string>('');

  // Delete states
  const [deletingGoalId, setDeletingGoalId] = useState<number | null>(null);
  const [deletingContribId, setDeletingContribId] = useState<number | null>(null);

  const loadData = async () => {
    try {
      const gList = await getSavingsGoals();
      setGoals(gList);
      if (selectedGoalDetail?.goal) {
        const detail = await getSavingsGoalById(selectedGoalDetail.goal.id);
        setSelectedGoalDetail(detail);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentMonth]);

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseYenInput(targetYenInput);
    if (!goalName.trim() || target <= 0) return;

    try {
      await createSavingsGoal({
        name: goalName.trim(),
        target_yen: target,
        target_date: targetDateInput || null,
      });
      setIsGoalModalOpen(false);
      setGoalName('');
      setTargetYenInput('');
      setTargetDateInput('');
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenContribModal = (goal: SavingsGoal) => {
    setTargetGoalForContrib(goal);
    setContribAmountInput('');
    setContribDateInput(getTodayDateString());
    setContribNoteInput('');
    setIsContribModalOpen(true);
  };

  const handleSaveContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetGoalForContrib) return;
    const amount = parseYenInput(contribAmountInput);
    if (amount <= 0) return;

    try {
      await addSavingsContribution({
        goal_id: targetGoalForContrib.id,
        amount_yen: amount,
        contribution_date: contribDateInput,
        note: contribNoteInput.trim() || null,
      });

      // Check if this contribution completed the goal!
      const current = (targetGoalForContrib.current_saved_yen || 0) + amount;
      if (current >= targetGoalForContrib.target_yen) {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.6 },
        });
      }

      setIsContribModalOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteGoal = async () => {
    if (!deletingGoalId) return;
    try {
      await deleteSavingsGoal(deletingGoalId);
      setDeletingGoalId(null);
      if (selectedGoalDetail?.goal?.id === deletingGoalId) {
        setSelectedGoalDetail(null);
      }
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteContrib = async () => {
    if (!deletingContribId) return;
    try {
      await deleteSavingsContribution(deletingContribId);
      setDeletingContribId(null);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const totalSavedAllGoals = goals.reduce((a, b) => a + (b.current_saved_yen || 0), 0);
  const totalTargetAllGoals = goals.reduce((a, b) => a + b.target_yen, 0);

  return (
    <div className="space-y-4 px-4 pt-2">
      {/* Overview Card */}
      <div className="bg-white dark:bg-neutral-800/80 rounded-3xl p-5 border border-neutral-200/80 dark:border-neutral-700/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
          <span className="font-semibold text-neutral-800 dark:text-neutral-200">
            Total Accumulated Savings (総貯金額)
          </span>
          <span className="tabular-nums font-semibold">{goals.length} Goals</span>
        </div>

        <div className="flex items-baseline justify-between">
          <div className="text-2xl font-extrabold text-teal-800 dark:text-teal-300 tracking-tight tabular-nums">
            {formatYen(totalSavedAllGoals)}
          </div>
          <div className="text-right text-xs text-neutral-500 dark:text-neutral-400">
            Target: <strong className="text-neutral-800 dark:text-neutral-200 tabular-nums">{formatYen(totalTargetAllGoals)}</strong>
          </div>
        </div>

        <p className="text-[10px] text-neutral-400 dark:text-neutral-500">
          💡 Savings deposits are allocated toward your future targets and are tracked separately from monthly living expenses.
        </p>
      </div>

      {/* Action Button */}
      <button
        type="button"
        onClick={() => setIsGoalModalOpen(true)}
        className="w-full min-h-[44px] py-2.5 px-4 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm active:scale-98 transition-all"
      >
        <Plus size={16} />
        <span>Create New Savings Goal (目標作成)</span>
      </button>

      {/* Goals List */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 px-1">
          Active Goals
        </h4>

        {goals.length === 0 ? (
          <div className="bg-white dark:bg-neutral-800/60 rounded-3xl p-6 border border-neutral-200/70 dark:border-neutral-800 text-center">
            <div className="w-10 h-10 mx-auto mb-2 rounded-2xl bg-teal-50 dark:bg-teal-950/40 flex items-center justify-center text-teal-700">
              <PiggyBank size={20} />
            </div>
            <h5 className="text-xs font-bold text-neutral-800 dark:text-neutral-200 mb-1">
              No Savings Goals Yet
            </h5>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 max-w-xs mx-auto mb-3">
              Set a target for tuition fees, emergency fund, or vacation in Japan.
            </p>
            <div className="flex flex-wrap justify-center gap-1.5">
              {PRESET_GOALS.slice(0, 2).map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setGoalName(p.name);
                    setTargetYenInput(String(p.target));
                    setIsGoalModalOpen(true);
                  }}
                  className="px-2.5 py-1 text-[11px] bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 rounded-lg"
                >
                  + {p.name}
                </button>
              ))}
            </div>
          </div>
        ) : (
          goals.map((goal) => {
            const saved = goal.current_saved_yen || 0;
            const remaining = Math.max(0, goal.target_yen - saved);
            const pct = Math.min(100, Math.round((saved / goal.target_yen) * 100));
            const isCompleted = saved >= goal.target_yen;
            const daysLeft = calculateDaysRemaining(goal.target_date);

            return (
              <div
                key={goal.id}
                className="bg-white dark:bg-neutral-800/80 rounded-2xl p-4 border border-neutral-200/80 dark:border-neutral-700/80 shadow-xs space-y-3 group"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h5 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                        {goal.name}
                      </h5>
                      {isCompleted && (
                        <span className="flex items-center gap-0.5 text-[10px] font-bold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-1.5 py-0.5 rounded-md">
                          <CheckCircle2 size={11} />
                          <span>Goal Reached!</span>
                        </span>
                      )}
                    </div>
                    {goal.target_date && (
                      <span className="text-[10px] text-neutral-500 dark:text-neutral-400 flex items-center gap-1 mt-0.5">
                        <Calendar size={11} />
                        <span>Target: {formatDisplayDate(goal.target_date)}</span>
                        {daysLeft !== null && (
                          <span>({daysLeft > 0 ? `${daysLeft} days left` : 'Due'})</span>
                        )}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={async () => {
                        const detail = await getSavingsGoalById(goal.id);
                        setSelectedGoalDetail(detail);
                      }}
                      className="px-2 py-1 text-[11px] font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg"
                    >
                      History
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingGoalId(goal.id)}
                      className="p-1 text-neutral-400 hover:text-rose-600 rounded-lg"
                      title="Delete goal"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Progress bar and metrics */}
                <div>
                  <div className="flex items-baseline justify-between text-xs mb-1">
                    <span className="font-extrabold text-neutral-900 dark:text-neutral-100 tabular-nums">
                      {formatYen(saved)}
                      <span className="text-[11px] font-normal text-neutral-400"> of {formatYen(goal.target_yen)}</span>
                    </span>
                    <span className="font-bold text-teal-700 dark:text-teal-400 tabular-nums">
                      {pct}%
                    </span>
                  </div>

                  <div className="w-full bg-neutral-100 dark:bg-neutral-700 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${
                        isCompleted ? 'bg-teal-500' : 'bg-teal-600'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Quick Add Contribution Button */}
                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    Remaining: <strong className="tabular-nums font-semibold">{formatYen(remaining)}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleOpenContribModal(goal)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100/80 dark:bg-teal-950/50 dark:hover:bg-teal-900/50 text-teal-800 dark:text-teal-300 font-semibold text-[11px] transition-colors"
                  >
                    <Plus size={13} />
                    <span>Deposit / Contribute</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Goal Detail & Contribution History Sheet */}
      {selectedGoalDetail && selectedGoalDetail.goal && (
        <ModalSheet
          isOpen={true}
          onClose={() => setSelectedGoalDetail(null)}
          title={selectedGoalDetail.goal.name}
          subtitle={`Target: ${formatYen(selectedGoalDetail.goal.target_yen)} · Saved: ${formatYen(selectedGoalDetail.goal.current_saved_yen)}`}
        >
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h5 className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Deposit History
              </h5>
              <button
                type="button"
                onClick={() => {
                  handleOpenContribModal(selectedGoalDetail.goal!);
                }}
                className="text-xs font-semibold text-teal-700 dark:text-teal-400 hover:underline"
              >
                + Add Deposit
              </button>
            </div>

            {selectedGoalDetail.contributions.length === 0 ? (
              <p className="text-xs text-neutral-500 text-center py-6">
                No deposits recorded for this goal yet.
              </p>
            ) : (
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {selectedGoalDetail.contributions.map((c) => (
                  <div key={c.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 block tabular-nums">
                        +{formatYen(c.amount_yen)}
                      </span>
                      <span className="text-[10px] text-neutral-500">
                        {formatDisplayDate(c.contribution_date)} {c.note ? `· ${c.note}` : ''}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDeletingContribId(c.id)}
                      className="p-1 text-neutral-400 hover:text-rose-600"
                      title="Remove deposit"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ModalSheet>
      )}

      {/* Create Goal Modal */}
      <ModalSheet
        isOpen={isGoalModalOpen}
        onClose={() => setIsGoalModalOpen(false)}
        title="Create Savings Target"
        subtitle="Set a dedicated financial milestone in Japan"
      >
        <form onSubmit={handleCreateGoal} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Goal Name (目標名)
            </label>
            <input
              type="text"
              placeholder="e.g. JLPT Exam & Textbooks, Travel, Emergency"
              value={goalName}
              onChange={(e) => setGoalName(e.target.value)}
              className="w-full px-3 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-medium"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Target Amount (JPY ¥)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base font-bold text-neutral-400">
                ¥
              </span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="e.g. 100,000"
                value={targetYenInput ? formatNumber(parseYenInput(targetYenInput)) : ''}
                onChange={(e) => setTargetYenInput(e.target.value)}
                className="w-full pl-8 pr-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-bold tabular-nums"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Target Completion Date (Optional)
            </label>
            <input
              type="date"
              value={targetDateInput}
              onChange={(e) => setTargetDateInput(e.target.value)}
              className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full min-h-[44px] py-3 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-all shadow-md shadow-teal-900/10 active:scale-[0.98]"
            >
              Create Goal
            </button>
          </div>
        </form>
      </ModalSheet>

      {/* Add Contribution Modal */}
      <ModalSheet
        isOpen={isContribModalOpen}
        onClose={() => setIsContribModalOpen(false)}
        title={`Add Deposit to "${targetGoalForContrib?.name}"`}
        subtitle="Contribute saved money towards this goal"
      >
        <form onSubmit={handleSaveContribution} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Deposit Amount (JPY ¥)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base font-bold text-neutral-400">
                ¥
              </span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={contribAmountInput ? formatNumber(parseYenInput(contribAmountInput)) : ''}
                onChange={(e) => setContribAmountInput(e.target.value)}
                className="w-full pl-8 pr-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-base font-bold tabular-nums"
                required
              />
            </div>

            <div className="flex gap-1.5 mt-2">
              {[5000, 10000, 20000, 50000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setContribAmountInput(String(amt))}
                  className="flex-1 py-1 px-1.5 rounded-lg text-[11px] font-medium bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                >
                  ¥{formatNumber(amt)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Deposit Date
            </label>
            <input
              type="date"
              value={contribDateInput}
              onChange={(e) => setContribDateInput(e.target.value)}
              className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Note (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Transferred from part-time pay"
              value={contribNoteInput}
              onChange={(e) => setContribNoteInput(e.target.value)}
              className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full min-h-[44px] py-3 rounded-2xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-all shadow-md shadow-teal-900/10 active:scale-[0.98]"
            >
              Confirm Deposit
            </button>
          </div>
        </form>
      </ModalSheet>

      {/* Delete Goal Dialog */}
      <ConfirmDialog
        isOpen={!!deletingGoalId}
        title="Delete Savings Goal?"
        message="Are you sure you want to delete this savings goal? Its contribution history will also be permanently deleted."
        confirmLabel="Delete"
        isDestructive={true}
        onConfirm={handleDeleteGoal}
        onCancel={() => setDeletingGoalId(null)}
      />

      {/* Delete Contribution Dialog */}
      <ConfirmDialog
        isOpen={!!deletingContribId}
        title="Delete Contribution Record?"
        message="Are you sure you want to remove this deposit entry?"
        confirmLabel="Delete"
        isDestructive={true}
        onConfirm={handleDeleteContrib}
        onCancel={() => setDeletingContribId(null)}
      />
    </div>
  );
};
