import React, { useState, useEffect } from 'react';
import {
  Database,
  RefreshCw,
  Sparkles,
  Trash2,
  RotateCcw,
  ShieldCheck,
  AlertTriangle,
  FileDown,
  Layers,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { ConfirmDialog } from '../common/ConfirmDialog';
import {
  getDatabaseStats,
  seedRealisticTestData,
  clearTransactionsOnly,
  resetToFactoryState,
  DatabaseStats,
} from '../../services/dev-database.service';
import { createFullBackup, downloadFile } from '../../services/backup.service';

interface DevDatabaseDrawerProps {
  currentMonth: string;
  onDataChanged: () => void;
  onLockDevMode?: () => void;
}

export const DevDatabaseDrawer: React.FC<DevDatabaseDrawerProps> = ({
  currentMonth,
  onDataChanged,
  onLockDevMode,
}) => {
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [confirmAction, setConfirmAction] = useState<'seed' | 'clear-tx' | 'factory-reset' | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadStats = async () => {
    try {
      const s = await getDatabaseStats();
      setStats(s);
    } catch (err) {
      console.error('Failed to inspect database:', err);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleSeed = async () => {
    setLoading(true);
    setConfirmAction(null);
    try {
      await seedRealisticTestData(currentMonth);
      await loadStats();
      onDataChanged();
      setFeedbackMsg({
        type: 'success',
        text: 'Realistic Japanese student test data generated! Check Dashboard, Salary, and Budget.',
      });
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err?.message || 'Failed to seed test data.' });
    } finally {
      setLoading(false);
      setTimeout(() => setFeedbackMsg(null), 5000);
    }
  };

  const handleClearTransactions = async () => {
    setLoading(true);
    setConfirmAction(null);
    try {
      await clearTransactionsOnly();
      await loadStats();
      onDataChanged();
      setFeedbackMsg({
        type: 'success',
        text: 'All test transactions and salary slips cleared.',
      });
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err?.message || 'Failed to clear transactions.' });
    } finally {
      setLoading(false);
      setTimeout(() => setFeedbackMsg(null), 5000);
    }
  };

  const handleFactoryReset = async () => {
    setLoading(true);
    setConfirmAction(null);
    try {
      await resetToFactoryState();
      await loadStats();
      onDataChanged();
      setFeedbackMsg({
        type: 'success',
        text: 'Database reset to 100% spotless factory state. Ready for real data!',
      });
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err?.message || 'Factory reset failed.' });
    } finally {
      setLoading(false);
      setTimeout(() => setFeedbackMsg(null), 5000);
    }
  };

  const handleDownloadCleanTemplate = async () => {
    try {
      // Export current database JSON
      const backup = await createFullBackup();
      const filename = `nihon_wallet_template_${new Date().toISOString().slice(0, 10)}.json`;
      downloadFile(JSON.stringify(backup, null, 2), filename, 'application/json');
      setFeedbackMsg({ type: 'success', text: `Downloaded snapshot: ${filename}` });
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err?.message || 'Failed to export template.' });
    }
  };

  const tableList = stats ? [
    { label: 'Transactions', count: stats.tableCounts.transactions },
    { label: 'Salary Slips', count: stats.tableCounts.salary_records },
    { label: 'Deductions', count: stats.tableCounts.salary_deductions },
    { label: 'Categories', count: stats.tableCounts.categories },
    { label: 'Budgets', count: stats.tableCounts.budgets },
    { label: 'Savings Goals', count: stats.tableCounts.savings_goals },
    { label: 'Deposits', count: stats.tableCounts.savings_contributions },
    { label: 'Recurring', count: stats.tableCounts.recurring_expenses },
  ] : [];

  return (
    <div className="p-4 rounded-3xl bg-neutral-900 text-white space-y-3.5 shadow-md border border-neutral-800">
      {/* Title & Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Database size={14} />
          </div>
          <div>
            <h5 className="text-xs font-bold tracking-tight">Developer Database Suite</h5>
            <p className="text-[10px] text-neutral-400">Local SQLite storage & test manager</p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadStats}
          disabled={loading}
          className="p-1 text-neutral-400 hover:text-white rounded-lg transition-colors"
          title="Refresh table inspection"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Production Readiness Status Pill */}
      {stats && (
        <div
          className={`px-3 py-2 rounded-2xl text-[11px] flex items-center gap-2 border ${
            stats.isCleanProductionState
              ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-300'
              : 'bg-amber-950/60 border-amber-800/80 text-amber-300'
          }`}
        >
          {stats.isCleanProductionState ? (
            <>
              <CheckCircle2 size={15} className="shrink-0 text-emerald-400" />
              <span>
                <strong>Spotless Production State</strong>: 0 test transactions or slips!
              </span>
            </>
          ) : (
            <>
              <AlertTriangle size={15} className="shrink-0 text-amber-400" />
              <span>
                <strong>Contains Testing Data</strong>: {stats.totalTransactions} transactions logged. Run Factory Reset before handover.
              </span>
            </>
          )}
        </div>
      )}

      {/* Feedback Alert */}
      {feedbackMsg && (
        <div
          className={`p-2.5 rounded-xl text-xs flex items-center gap-2 border ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-800 text-emerald-200'
              : 'bg-rose-950/80 border-rose-800 text-rose-200'
          }`}
        >
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Live Table Inspector Grid */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-[10px] text-neutral-400 px-1 font-semibold">
          <span>9-TABLE ROW COUNTS</span>
          <span className="tabular-nums">
            SQLite Size: {stats ? `${Math.round(stats.databaseSizeBytes / 1024)} KB` : '...'}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-1.5 text-center">
          {tableList.map((t, idx) => (
            <div key={idx} className="p-1.5 rounded-xl bg-neutral-800/80 border border-neutral-700/60">
              <span className="text-[10px] text-neutral-400 block truncate">{t.label}</span>
              <span className="text-xs font-bold text-white tabular-nums">{t.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Developer Actions Grid */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        {/* Seed Test Scenario */}
        <button
          type="button"
          onClick={() => setConfirmAction('seed')}
          disabled={loading}
          className="py-2.5 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] transition-all"
        >
          <Sparkles size={13} />
          <span>Seed Test Data</span>
        </button>

        {/* Clear Transactions Only */}
        <button
          type="button"
          onClick={() => setConfirmAction('clear-tx')}
          disabled={loading}
          className="py-2.5 px-3 rounded-2xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all"
        >
          <Trash2 size={13} />
          <span>Clear Activity</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {/* Factory Reset */}
        <button
          type="button"
          onClick={() => setConfirmAction('factory-reset')}
          disabled={loading}
          className="py-2 px-3 rounded-2xl bg-rose-950/50 hover:bg-rose-900/60 border border-rose-800/80 text-rose-300 text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all"
        >
          <RotateCcw size={13} />
          <span>Factory Blank Reset</span>
        </button>

        {/* Snapshot Template */}
        <button
          type="button"
          onClick={handleDownloadCleanTemplate}
          disabled={loading}
          className="py-2 px-3 rounded-2xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-300 text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all"
        >
          <FileDown size={13} />
          <span>Save Snapshot</span>
        </button>
      </div>

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        isOpen={confirmAction === 'seed'}
        title="Load Realistic Test Scenario?"
        message="This will populate sample Tokyo student data (Bento, Suica commute pass, ¥60,000 rent, part-time izakaya salary slip with deductions, and savings goals) for you to test all features and charts."
        confirmLabel="Populate Test Data"
        onConfirm={handleSeed}
        onCancel={() => setConfirmAction(null)}
      />

      <ConfirmDialog
        isOpen={confirmAction === 'clear-tx'}
        title="Clear All Test Transactions?"
        message="This will delete all test income and expense transactions, salary slips, and savings deposit records, but preserve your custom categories, budgets, and recurring bills."
        confirmLabel="Clear Activity"
        isDestructive={true}
        onConfirm={handleClearTransactions}
        onCancel={() => setConfirmAction(null)}
      />

      <ConfirmDialog
        isOpen={confirmAction === 'factory-reset'}
        title="Reset to 100% Factory Clean State?"
        message="This will completely purge all records from the database and re-seed only the clean default categories. Use this when you are done testing and ready to give the phone to your friend."
        confirmLabel="Factory Reset"
        isDestructive={true}
        onConfirm={handleFactoryReset}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
};
