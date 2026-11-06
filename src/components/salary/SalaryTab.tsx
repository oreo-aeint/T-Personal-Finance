import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Sliders,
  Plus,
  Calendar,
  AlertCircle,
  Clock,
  Trash2,
  Edit3,
  Receipt,
  CheckCircle2,
} from 'lucide-react';
import { ModalSheet } from '../common/ModalSheet';
import { ConfirmDialog } from '../common/ConfirmDialog';
import type { EmploymentSettings, SalaryRecord, SalaryDeduction } from '../../types';
import {
  getEmploymentSettings,
  updateEmploymentSettings,
  calculateEstimatedGross,
  getSalaryRecords,
  saveActualSalaryRecord,
  deleteSalaryRecord,
} from '../../services/salary.service';
import { formatYen, parseYenInput, formatNumber } from '../../utils/currency';
import { formatMonthName, formatDisplayDate, getTodayDateString } from '../../utils/date';

interface SalaryTabProps {
  currentMonth: string;
}

const COMMON_DEDUCTIONS = [
  'Health Insurance (健康保険)',
  'Pension (厚生年金)',
  'Income Tax (所得税)',
  'Resident Tax (住民税)',
  'Employment Insurance (雇用保険)',
  'Other Deductions (その他)',
];

export const SalaryTab: React.FC<SalaryTabProps> = ({ currentMonth }) => {
  const [settings, setSettings] = useState<EmploymentSettings | null>(null);
  const [records, setRecords] = useState<SalaryRecord[]>([]);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState<boolean>(false);
  const [editingRecord, setEditingRecord] = useState<SalaryRecord | null>(null);
  const [deletingRecordId, setDeletingRecordId] = useState<number | null>(null);

  // Settings form state
  const [hourlyWageInput, setHourlyWageInput] = useState<string>('1200');
  const [weeklyHoursInput, setWeeklyHoursInput] = useState<string>('8');
  const [payDayInput, setPayDayInput] = useState<string>('25');

  // Record form state
  const [recordPeriod, setRecordPeriod] = useState<string>(currentMonth);
  const [recordDate, setRecordDate] = useState<string>(getTodayDateString());
  const [grossInput, setGrossInput] = useState<string>('');
  const [hoursWorkedInput, setHoursWorkedInput] = useState<string>('');
  const [recordNote, setRecordNote] = useState<string>('');
  const [deductionsList, setDeductionsList] = useState<{ deduction_name: string; amount_yen: number }[]>([
    { deduction_name: 'Income Tax (所得税)', amount_yen: 0 },
    { deduction_name: 'Health Insurance (健康保険)', amount_yen: 0 },
  ]);
  const [customDeductionName, setCustomDeductionName] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [s, recs] = await Promise.all([
        getEmploymentSettings(),
        getSalaryRecords(),
      ]);
      setSettings(s);
      setHourlyWageInput(String(s.hourly_wage_yen));
      setWeeklyHoursInput(String(s.weekly_hours));
      setPayDayInput(s.pay_day ? String(s.pay_day) : '25');
      setRecords(recs);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentMonth]);

  // Estimated gross calculations
  const estimatedGross = settings
    ? calculateEstimatedGross(settings.hourly_wage_yen, settings.weekly_hours)
    : 0;

  // Find actual record for currently viewed month if recorded
  const currentMonthRecord = records.find((r) => r.pay_period === currentMonth);
  const actualNetThisMonth = currentMonthRecord ? currentMonthRecord.net_yen : 0;
  const differenceFromEstimate = currentMonthRecord ? actualNetThisMonth - estimatedGross : 0;

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const wage = parseYenInput(hourlyWageInput);
    const hours = parseFloat(weeklyHoursInput) || 0;
    const day = parseInt(payDayInput, 10) || null;

    try {
      await updateEmploymentSettings(wage, hours, day);
      setIsSettingsModalOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenNewRecordModal = () => {
    // If a record for currentMonth already exists, automatically open it in edit mode
    const existingForCurrent = records.find((r) => r.pay_period === currentMonth);
    if (existingForCurrent) {
      handleOpenEditRecordModal(existingForCurrent);
      return;
    }
    setEditingRecord(null);
    setRecordPeriod(currentMonth);
    setRecordDate(getTodayDateString());
    // Default estimated gross
    setGrossInput(String(estimatedGross));
    setHoursWorkedInput(String(settings ? settings.weekly_hours * 4 : 32));
    setRecordNote('');
    setDeductionsList([
      { deduction_name: 'Income Tax (所得税)', amount_yen: 0 },
      { deduction_name: 'Health Insurance (健康保険)', amount_yen: 0 },
    ]);
    setErrorMsg(null);
    setIsRecordModalOpen(true);
  };

  const handleOpenEditRecordModal = (record: SalaryRecord) => {
    setEditingRecord(record);
    setRecordPeriod(record.pay_period);
    setRecordDate(record.paid_date);
    setGrossInput(String(record.gross_yen));
    setHoursWorkedInput(record.hours_worked ? String(record.hours_worked) : '');
    setRecordNote(record.note || '');
    setDeductionsList(
      record.deductions && record.deductions.length > 0
        ? record.deductions.map((d) => ({ deduction_name: d.deduction_name, amount_yen: d.amount_yen }))
        : [{ deduction_name: 'Income Tax (所得税)', amount_yen: 0 }]
    );
    setErrorMsg(null);
    setIsRecordModalOpen(true);
  };

  const handlePeriodChange = (newPeriod: string) => {
    setRecordPeriod(newPeriod);
    const existing = records.find((r) => r.pay_period === newPeriod);
    if (existing && (!editingRecord || editingRecord.id !== existing.id)) {
      // Existing record detected for this month, load its data seamlessly
      setEditingRecord(existing);
      setRecordDate(existing.paid_date);
      setGrossInput(String(existing.gross_yen));
      setHoursWorkedInput(existing.hours_worked ? String(existing.hours_worked) : '');
      setRecordNote(existing.note || '');
      setDeductionsList(
        existing.deductions && existing.deductions.length > 0
          ? existing.deductions.map((d) => ({ deduction_name: d.deduction_name, amount_yen: d.amount_yen }))
          : [{ deduction_name: 'Income Tax (所得税)', amount_yen: 0 }]
      );
    }
  };

  // Form total deductions and calculated net
  const formGross = parseYenInput(grossInput);
  const formTotalDeductions = deductionsList.reduce((acc, d) => acc + d.amount_yen, 0);
  const formNet = Math.max(0, formGross - formTotalDeductions);

  const handleAddDeductionRow = (name: string) => {
    if (!name.trim()) return;
    setDeductionsList([...deductionsList, { deduction_name: name.trim(), amount_yen: 0 }]);
    setCustomDeductionName('');
  };

  const handleDeductionAmountChange = (index: number, val: string) => {
    const updated = [...deductionsList];
    updated[index].amount_yen = parseYenInput(val);
    setDeductionsList(updated);
  };

  const handleRemoveDeductionRow = (index: number) => {
    setDeductionsList(deductionsList.filter((_, i) => i !== index));
  };

  const handleSaveSalaryRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formGross <= 0) {
      setErrorMsg('Please enter a gross salary greater than ¥0.');
      return;
    }

    try {
      await saveActualSalaryRecord({
        id: editingRecord?.id,
        pay_period: recordPeriod,
        paid_date: recordDate,
        gross_yen: formGross,
        net_yen: formNet,
        hours_worked: hoursWorkedInput ? parseFloat(hoursWorkedInput) : null,
        note: recordNote || null,
        deductions: deductionsList,
      });

      setIsRecordModalOpen(false);
      loadData();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save salary record.');
    }
  };

  const handleDeleteRecord = async () => {
    if (!deletingRecordId) return;
    try {
      await deleteSalaryRecord(deletingRecordId);
      setDeletingRecordId(null);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-4 px-4 pt-2">
      {/* Part-time Job Settings & Estimate Card */}
      <div className="bg-white dark:bg-neutral-800/80 rounded-3xl p-5 border border-neutral-200/80 dark:border-neutral-700/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-700 dark:text-emerald-400">
              <Briefcase size={16} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                Part-time Work (アルバイト)
              </h3>
              <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
                {settings?.hourly_wage_yen ? `¥${formatNumber(settings.hourly_wage_yen)}/hr · ${settings.weekly_hours} hrs/week` : 'Configuring...'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsSettingsModalOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200/80 dark:bg-neutral-700 dark:hover:bg-neutral-600 text-[11px] font-semibold text-neutral-700 dark:text-neutral-200 transition-colors"
          >
            <Sliders size={12} />
            <span>Configure</span>
          </button>
        </div>

        {/* Calculation Pill */}
        <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-100 dark:border-neutral-800/70 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-500 dark:text-neutral-400 font-medium">
              Estimated Gross Monthly
            </span>
            <span className="font-bold text-neutral-900 dark:text-neutral-100 tabular-nums">
              {formatYen(estimatedGross)}
            </span>
          </div>

          <div className="text-[10px] text-neutral-400 dark:text-neutral-500 flex items-center justify-between">
            <span>Formula: Wage × Weekly Hours × 52 ÷ 12</span>
            <span>Expected Payday: {settings?.pay_day ? `${settings.pay_day}th` : '25th'}</span>
          </div>
        </div>

        {/* Current Month Record Comparison Status */}
        {currentMonthRecord ? (
          <div className="pt-2 border-t border-neutral-100 dark:border-neutral-700/60">
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-600 dark:text-neutral-300">
                Actual Net Received ({formatMonthName(currentMonth)}):
              </span>
              <strong className="text-emerald-700 dark:text-emerald-400 tabular-nums">
                {formatYen(currentMonthRecord.net_yen)}
              </strong>
            </div>
            <div className="flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
              <span>vs. Estimated Gross:</span>
              <span className={`tabular-nums font-semibold ${differenceFromEstimate >= 0 ? 'text-emerald-600' : 'text-neutral-500'}`}>
                {differenceFromEstimate >= 0 ? `+${formatYen(differenceFromEstimate)}` : `-${formatYen(Math.abs(differenceFromEstimate))}`}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-700/60 text-xs">
            <span className="text-neutral-500 dark:text-neutral-400">
              No salary record logged for {formatMonthName(currentMonth)}.
            </span>
            <button
              type="button"
              onClick={handleOpenNewRecordModal}
              className="text-emerald-700 dark:text-emerald-400 font-semibold hover:underline text-[11px]"
            >
              Log Salary
            </button>
          </div>
        )}
      </div>

      {/* Record Salary Action Button */}
      <button
        type="button"
        onClick={handleOpenNewRecordModal}
        className="w-full min-h-[44px] py-2.5 px-4 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm active:scale-98 transition-all"
      >
        <Plus size={16} />
        <span>
          {currentMonthRecord
            ? `Update ${formatMonthName(currentMonth)} Salary Slip (給与記録編集)`
            : 'Record Monthly Salary Payment (給料受取記録)'}
        </span>
      </button>

      {/* Actual Salary History List */}
      <div className="space-y-2.5">
        <h4 className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 px-1">
          Recorded Salary Payments
        </h4>

        {records.length === 0 ? (
          <div className="bg-white dark:bg-neutral-800/60 rounded-3xl p-6 border border-neutral-200/70 dark:border-neutral-800 text-center">
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              No salary records logged yet. When you receive your pay slip (給与明細), log it here with deductions.
            </p>
          </div>
        ) : (
          records.map((rec) => {
            const totalDeds = rec.deductions?.reduce((a, b) => a + b.amount_yen, 0) || 0;
            return (
              <div
                key={rec.id}
                className="bg-white dark:bg-neutral-800/80 rounded-2xl p-4 border border-neutral-200/80 dark:border-neutral-700/80 shadow-xs space-y-2.5 group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 block">
                      Pay Period: {formatMonthName(rec.pay_period)}
                    </span>
                    <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      Paid on {formatDisplayDate(rec.paid_date)} {rec.hours_worked ? `· ${rec.hours_worked} hrs worked` : ''}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenEditRecordModal(rec)}
                      className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700"
                      title="Edit salary slip"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingRecordId(rec.id)}
                      className="p-1.5 text-neutral-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      title="Delete salary record"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Net and Gross Badges */}
                <div className="grid grid-cols-3 gap-2 p-2 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-100 dark:border-neutral-800 text-xs">
                  <div>
                    <span className="text-[10px] text-neutral-400 dark:text-neutral-500 block">Gross (額面)</span>
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200 tabular-nums">
                      {formatYen(rec.gross_yen)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-400 dark:text-neutral-500 block">Deductions (控除)</span>
                    <span className="font-semibold text-rose-600 dark:text-rose-400 tabular-nums">
                      -{formatYen(totalDeds)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-400 dark:text-neutral-500 block">Net (手取り)</span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                      {formatYen(rec.net_yen)}
                    </span>
                  </div>
                </div>

                {/* Deductions Breakdown Tags */}
                {rec.deductions && rec.deductions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {rec.deductions.map((d, i) => (
                      <span
                        key={i}
                        className="text-[10px] text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-700 px-2 py-0.5 rounded-md"
                      >
                        {d.deduction_name}: {formatYen(d.amount_yen)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Employment Settings Modal */}
      <ModalSheet
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        title="Part-time Employment Settings"
        subtitle="Configure your wage and expected hours in Japan"
      >
        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Hourly Wage (時給 JPY ¥)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base font-bold text-neutral-400">
                ¥
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={hourlyWageInput ? formatNumber(parseYenInput(hourlyWageInput)) : ''}
                onChange={(e) => setHourlyWageInput(e.target.value)}
                className="w-full pl-8 pr-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-bold text-neutral-900 dark:text-neutral-100 tabular-nums"
                required
              />
            </div>
            <p className="text-[10px] text-neutral-400 mt-1">
              Current Tokyo minimum wage is approx. ¥1,163/hr (2024-2025).
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Weekly Working Hours (週当たり労働時間)
            </label>
            <input
              type="number"
              step="0.5"
              min="1"
              max="28"
              value={weeklyHoursInput}
              onChange={(e) => setWeeklyHoursInput(e.target.value)}
              className="w-full px-3 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-semibold text-neutral-900 dark:text-neutral-100"
              required
            />
            <p className="text-[10px] text-neutral-400 mt-1">
              Note: Student visa work permit in Japan is capped at 28 hours/week during school terms.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Expected Payday (給料日 - Day of Month)
            </label>
            <input
              type="number"
              min="1"
              max="31"
              value={payDayInput}
              onChange={(e) => setPayDayInput(e.target.value)}
              className="w-full px-3 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-semibold text-neutral-900 dark:text-neutral-100"
              required
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full min-h-[44px] py-3 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all shadow-md shadow-emerald-900/10 active:scale-[0.98]"
            >
              Save Employment Settings
            </button>
          </div>
        </form>
      </ModalSheet>

      {/* Record Monthly Salary Slip Modal */}
      <ModalSheet
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        title={editingRecord ? 'Edit Salary Record' : 'Record Monthly Salary Slip (給与明細)'}
        subtitle="Automatically records net salary as income transaction"
        maxHeight="max-h-[92vh]"
      >
        <form onSubmit={handleSaveSalaryRecord} className="space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs border border-rose-200 dark:border-rose-900/60">
              {errorMsg}
            </div>
          )}

          {/* Pay Period & Payment Date */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Pay Period (Month)
                </label>
                {editingRecord && (
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">
                    Updating slip
                  </span>
                )}
              </div>
              <input
                type="month"
                value={recordPeriod}
                onChange={(e) => handlePeriodChange(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-medium"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Payment Date
              </label>
              <input
                type="date"
                value={recordDate}
                onChange={(e) => setRecordDate(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-medium"
                required
              />
            </div>
          </div>

          {/* Gross Salary & Hours */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Gross Salary (額面給与 ¥)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-neutral-400">
                  ¥
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={grossInput ? formatNumber(parseYenInput(grossInput)) : ''}
                  onChange={(e) => setGrossInput(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold tabular-nums"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Hours Worked (実働時間)
              </label>
              <input
                type="number"
                step="0.5"
                placeholder="e.g. 32"
                value={hoursWorkedInput}
                onChange={(e) => setHoursWorkedInput(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-medium"
              />
            </div>
          </div>

          {/* Deductions (控除) Section */}
          <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Salary Deductions (控除明細)
              </label>
              <span className="text-[11px] text-rose-600 dark:text-rose-400 font-medium tabular-nums">
                Total: -{formatYen(formTotalDeductions)}
              </span>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {deductionsList.map((ded, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="text-xs text-neutral-600 dark:text-neutral-300 w-44 truncate">
                    {ded.deduction_name}
                  </span>
                  <div className="relative flex-1">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400">
                      ¥
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={ded.amount_yen > 0 ? formatNumber(ded.amount_yen) : ''}
                      onChange={(e) => handleDeductionAmountChange(index, e.target.value)}
                      className="w-full pl-6 pr-2 py-1.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs font-medium tabular-nums"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveDeductionRow(index)}
                    className="p-1 text-neutral-400 hover:text-rose-600"
                    title="Remove deduction row"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>

            {/* Quick add common deduction */}
            <div className="mt-2.5 flex items-center gap-1.5">
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) handleAddDeductionRow(e.target.value);
                }}
                className="flex-1 py-1 px-2 text-[11px] bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-700 dark:text-neutral-300"
              >
                <option value="">+ Add Standard Deduction Item...</option>
                {COMMON_DEDUCTIONS.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Calculated Net Take-Home Result */}
          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-emerald-900 dark:text-emerald-200 block">
                Calculated Net Take-Home (手取り金額)
              </span>
              <span className="text-[10px] text-emerald-700/80 dark:text-emerald-400">
                Gross ({formatYen(formGross)}) − Deductions ({formatYen(formTotalDeductions)})
              </span>
            </div>
            <span className="text-lg font-extrabold text-emerald-800 dark:text-emerald-300 tabular-nums">
              {formatYen(formNet)}
            </span>
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Note (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Extra weekend shifts, transport allowance included"
              value={recordNote}
              onChange={(e) => setRecordNote(e.target.value)}
              className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full min-h-[44px] py-3 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all shadow-md shadow-emerald-900/10 active:scale-[0.98]"
            >
              {editingRecord ? 'Update Salary Record & Sync Transaction' : 'Save Salary Record & Create Income Transaction'}
            </button>
          </div>
        </form>
      </ModalSheet>

      {/* Delete Salary Record Dialog */}
      <ConfirmDialog
        isOpen={!!deletingRecordId}
        title="Delete Salary Record?"
        message="Are you sure you want to remove this salary record? Its linked income transaction and deductions will also be deleted."
        confirmLabel="Delete"
        isDestructive={true}
        onConfirm={handleDeleteRecord}
        onCancel={() => setDeletingRecordId(null)}
      />
    </div>
  );
};
