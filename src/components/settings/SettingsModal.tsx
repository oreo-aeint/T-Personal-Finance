import React, { useState, useRef, useEffect } from 'react';
import {
  Settings,
  Download,
  Upload,
  FileSpreadsheet,
  Plus,
  Trash2,
  Tag,
  ShieldCheck,
  Moon,
  Sun,
  AlertTriangle,
  CheckCircle2,
  Info,
  Clock,
} from 'lucide-react';
import { ModalSheet } from '../common/ModalSheet';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { CategoryIcon, AVAILABLE_ICONS } from '../common/CategoryIcon';
import { DevDatabaseDrawer } from './DevDatabaseDrawer';
import type { Category, TransactionType } from '../../types';
import { getCategories, addCategory, deleteCategory } from '../../services/transaction.service';
import { createFullBackup, restoreFromBackup, exportTransactionsToCSV, downloadFile } from '../../services/backup.service';
import { useThemeStyle } from '../../theme/ThemeContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  currentMonth?: string;
  onDataRestored?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  isDarkMode,
  onToggleDarkMode,
  currentMonth = '2026-11',
  onDataRestored,
}) => {
  const { themeStyle, setThemeStyle } = useThemeStyle();
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCatName, setNewCatName] = useState<string>('');
  const [newCatType, setNewCatType] = useState<TransactionType>('expense');
  const [newCatIcon, setNewCatIcon] = useState<string>('Tag');
  const [isCategorySectionOpen, setIsCategorySectionOpen] = useState<boolean>(false);

  const [deletingCatId, setDeletingCatId] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [pendingRestoreData, setPendingRestoreData] = useState<any | null>(null);
  const [lastBackupDate, setLastBackupDate] = useState<string | null>(() => {
    return localStorage.getItem('t_nihon_last_backup_date');
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadCategoriesData = async () => {
    try {
      const cats = await getCategories();
      setCategories(cats);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadCategoriesData();
    }
  }, [isOpen]);

  const handleExportJSON = async () => {
    try {
      const backup = await createFullBackup();
      const jsonStr = JSON.stringify(backup, null, 2);
      const filename = `nihon_wallet_backup_${new Date().toISOString().slice(0, 10)}.json`;
      downloadFile(jsonStr, filename, 'application/json');
      const nowStr = new Date().toISOString();
      localStorage.setItem('t_nihon_last_backup_date', nowStr);
      setLastBackupDate(nowStr);
      setStatusMessage({ type: 'success', text: `Backup exported successfully as ${filename}` });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Backup export failed' });
    }
  };

  const handleExportCSV = async () => {
    try {
      const csvStr = await exportTransactionsToCSV();
      const filename = `nihon_wallet_transactions_${new Date().toISOString().slice(0, 10)}.csv`;
      downloadFile(csvStr, filename, 'text/csv');
      setStatusMessage({ type: 'success', text: `CSV exported successfully as ${filename}` });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'CSV export failed' });
    }
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed.version || !parsed.tables) {
          throw new Error('Selected file is not a valid NihonWallet JSON backup.');
        }
        setPendingRestoreData(parsed);
      } catch (err: any) {
        setStatusMessage({ type: 'error', text: err?.message || 'Invalid JSON file.' });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleConfirmRestore = async () => {
    if (!pendingRestoreData) return;
    try {
      await restoreFromBackup(pendingRestoreData);
      setPendingRestoreData(null);
      setStatusMessage({ type: 'success', text: 'Database successfully restored from backup!' });
      loadCategoriesData();
      if (onDataRestored) onDataRestored();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Restoration failed. Rolled back.' });
      setPendingRestoreData(null);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      await addCategory(newCatName.trim(), newCatType, newCatIcon);
      setNewCatName('');
      loadCategoriesData();
      setStatusMessage({ type: 'success', text: `Added category "${newCatName.trim()}".` });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Failed to add category' });
    }
  };

  const handleDeleteCategory = async () => {
    if (!deletingCatId) return;
    try {
      await deleteCategory(deletingCatId);
      setDeletingCatId(null);
      loadCategoriesData();
      setStatusMessage({ type: 'success', text: 'Category deleted.' });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Cannot delete category' });
      setDeletingCatId(null);
    }
  };

  return (
    <ModalSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Settings & Data Management (設定)"
      subtitle="Backup, export, categories, and offline preferences"
      maxHeight="max-h-[92vh]"
    >
      <div className="space-y-4">
        {/* Status Notification */}
        {statusMessage && (
          <div
            className={`p-3 rounded-2xl text-xs flex items-center gap-2 border ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800'
            }`}
          >
            {statusMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Developer Workflow & Testing Suite */}
        <DevDatabaseDrawer
          currentMonth={currentMonth}
          onDataChanged={() => {
            loadCategoriesData();
            if (onDataRestored) onDataRestored();
          }}
        />

        {/* Section 1: Appearance & Currency */}
        <div className="p-4 rounded-3xl bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200/80 dark:border-neutral-700/80 space-y-3">
          <h5 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
            Display & Preferences
          </h5>

          <div className="flex items-center justify-between text-xs">
            <div>
              <span className="font-semibold text-neutral-800 dark:text-neutral-200 block">
                Appearance Theme
              </span>
              <span className="text-[10px] text-neutral-500">
                {isDarkMode ? 'Dark Mode active' : 'Light Mode (Japanese minimalist)'}
              </span>
            </div>
            <button
              type="button"
              onClick={onToggleDarkMode}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 text-neutral-700 dark:text-neutral-200 font-semibold text-xs flex items-center gap-1.5 shadow-2xs"
            >
              {isDarkMode ? <Sun size={13} /> : <Moon size={13} />}
              <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
            </button>
          </div>

          {/* Theme Style: Kawaii Boy vs Classic */}
          <div className="pt-2 border-t border-neutral-200/60 dark:border-neutral-700 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <div>
                <span className="font-semibold text-neutral-800 dark:text-neutral-200 block">
                  App Visual Style
                </span>
                <span className="text-[10px] text-neutral-500">
                  Switch back to Classic Clean UI anytime
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 p-1 bg-neutral-200/70 dark:bg-neutral-700/60 rounded-2xl">
              <button
                type="button"
                onClick={() => setThemeStyle('cute')}
                className={`py-1.5 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  themeStyle === 'cute'
                    ? 'bg-white dark:bg-neutral-800 text-amber-800 dark:text-amber-300 shadow-xs'
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800'
                }`}
              >
                <span>🐕 Kawaii Boy</span>
              </button>
              <button
                type="button"
                onClick={() => setThemeStyle('classic')}
                className={`py-1.5 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  themeStyle === 'classic'
                    ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-xs'
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800'
                }`}
              >
                <span>🏛️ Classic Clean</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-2 border-t border-neutral-200/60 dark:border-neutral-700">
            <div>
              <span className="font-semibold text-neutral-800 dark:text-neutral-200 block">
                Currency & Locale
              </span>
              <span className="text-[10px] text-neutral-500">
                Japanese Yen (JPY ¥), Integer amounts
              </span>
            </div>
            <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
              ¥ (JPY)
            </span>
          </div>
        </div>

        {/* Section 2: Backup and Restore (Crucial for offline-only iPhone app) */}
        <div className="p-4 rounded-3xl bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200/80 dark:border-neutral-700/80 space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-emerald-700 dark:text-emerald-400" />
            <h5 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
              Offline Data Backup & Restore
            </h5>
          </div>

          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
            All data is stored locally in your phone's SQLite storage with no cloud tracking. Create periodic backups so you never lose your records.
          </p>

          {/* Backup Reminder Banner */}
          <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 text-xs space-y-1.5">
            <div className="flex items-center justify-between text-amber-900 dark:text-amber-300 font-semibold">
              <div className="flex items-center gap-1.5">
                <Clock size={13} />
                <span>Backup Reminder</span>
              </div>
              {lastBackupDate && (
                <span className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">
                  {new Date(lastBackupDate).toLocaleDateString()}
                </span>
              )}
            </div>
            <p className="text-[11px] text-amber-800 dark:text-amber-200/90 leading-relaxed">
              {lastBackupDate
                ? `Last backed up on ${new Date(lastBackupDate).toLocaleDateString()}. Export a fresh copy each month after payday!`
                : 'No backup exported yet! Because this app is 100% private with no cloud servers, export a backup copy once a month to keep your financial records safe.'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            {/* Export JSON */}
            <button
              type="button"
              onClick={handleExportJSON}
              className="py-2.5 px-3 rounded-2xl bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 text-neutral-800 dark:text-neutral-200 text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs hover:bg-neutral-100 dark:hover:bg-neutral-650 transition-colors"
            >
              <Download size={14} />
              <span>Export Backup (JSON)</span>
            </button>

            {/* Restore JSON */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="py-2.5 px-3 rounded-2xl bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 text-neutral-800 dark:text-neutral-200 text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs hover:bg-neutral-100 dark:hover:bg-neutral-650 transition-colors"
            >
              <Upload size={14} />
              <span>Restore Backup</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              className="hidden"
              onChange={handleFileSelected}
            />
          </div>

          {/* Export CSV */}
          <div className="pt-2 border-t border-neutral-200/60 dark:border-neutral-700">
            <button
              type="button"
              onClick={handleExportCSV}
              className="w-full py-2 px-3 rounded-2xl bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 text-neutral-800 dark:text-neutral-200 text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs hover:bg-neutral-100 dark:hover:bg-neutral-650 transition-colors"
            >
              <FileSpreadsheet size={14} />
              <span>Export Transactions to CSV</span>
            </button>
          </div>
        </div>

        {/* Section 3: Categories Management */}
        <div className="p-4 rounded-3xl bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200/80 dark:border-neutral-700/80 space-y-3">
          <div className="flex items-center justify-between">
            <h5 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
              Categories ({categories.length})
            </h5>
            <button
              type="button"
              onClick={() => setIsCategorySectionOpen(!isCategorySectionOpen)}
              className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold"
            >
              {isCategorySectionOpen ? 'Hide' : 'Manage Custom'}
            </button>
          </div>

          {isCategorySectionOpen && (
            <div className="space-y-3 pt-2 border-t border-neutral-200/60 dark:border-neutral-700">
              {/* Add category form */}
              <form onSubmit={handleAddCategory} className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="New category name..."
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-medium"
                    required
                  />
                  <select
                    value={newCatType}
                    onChange={(e) => setNewCatType(e.target.value as any)}
                    className="px-2 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs"
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-neutral-500">Icon:</span>
                  <div className="flex gap-1 overflow-x-auto py-1">
                    {AVAILABLE_ICONS.slice(0, 8).map((iconName) => (
                      <button
                        key={iconName}
                        type="button"
                        onClick={() => setNewCatIcon(iconName)}
                        className={`p-1.5 rounded-lg border ${
                          newCatIcon === iconName
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                            : 'border-neutral-200 dark:border-neutral-700 text-neutral-600'
                        }`}
                      >
                        <CategoryIcon name={iconName} size={13} />
                      </button>
                    ))}
                  </div>
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-xl bg-emerald-700 text-white text-xs font-semibold shrink-0"
                  >
                    Add
                  </button>
                </div>
              </form>

              {/* Category chips list */}
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {categories.map((c) => (
                  <div
                    key={c.id}
                    className="p-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200/70 dark:border-neutral-700/70 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <CategoryIcon name={c.icon} size={14} />
                      <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                        {c.name}
                      </span>
                      <span className="text-[10px] text-neutral-400">
                        ({c.type}) {c.is_default === 1 ? '· Default' : ''}
                      </span>
                    </div>

                    {c.is_default === 0 && (
                      <button
                        type="button"
                        onClick={() => setDeletingCatId(c.id)}
                        className="p-1 text-neutral-400 hover:text-rose-600"
                        title="Delete custom category"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Section 4: App Information */}
        <div className="p-4 rounded-3xl bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200/80 dark:border-neutral-700/80 space-y-1.5 text-neutral-500 dark:text-neutral-400 text-[11px] leading-relaxed">
          <div className="flex items-center gap-1.5 text-neutral-700 dark:text-neutral-200 font-semibold mb-1">
            <Info size={14} />
            <span>T-Personal Finance Tracking (NihonWallet)</span>
          </div>
          <p>
            Designed exclusively for foreign students and part-time workers living in Japan.
          </p>
          <p>
            • 100% Offline-First: All transactions, budgets, salary deductions, and savings stored in SQLite on this iPhone.
          </p>
          <p>
            • No login or remote cloud transmission required.
          </p>
        </div>
      </div>

      {/* Confirm Restore Dialog */}
      <ConfirmDialog
        isOpen={!!pendingRestoreData}
        title="Restore Data from Backup?"
        message="Restoring from this backup will completely replace your current database records across all 9 tables. Are you sure you want to proceed?"
        confirmLabel="Restore Database"
        isDestructive={true}
        onConfirm={handleConfirmRestore}
        onCancel={() => setPendingRestoreData(null)}
      />

      {/* Confirm Delete Category Dialog */}
      <ConfirmDialog
        isOpen={!!deletingCatId}
        title="Delete Custom Category?"
        message="Are you sure you want to delete this custom category? Existing transactions will become uncategorized."
        confirmLabel="Delete"
        isDestructive={true}
        onConfirm={handleDeleteCategory}
        onCancel={() => setDeletingCatId(null)}
      />
    </ModalSheet>
  );
};
