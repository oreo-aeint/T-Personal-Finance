/**
 * T-Personal Finance Tracking (NihonWallet)
 * Private, offline-first Japanese personal finance mobile application.
 */
import React, { useState, useEffect } from 'react';
import { IPhoneFrame } from './components/common/IPhoneFrame';
import { Header } from './components/common/Header';
import { BottomTabBar, TabKey } from './components/common/BottomTabBar';
import { DashboardTab } from './components/dashboard/DashboardTab';
import { TransactionsTab } from './components/transactions/TransactionsTab';
import { BudgetTab } from './components/budget/BudgetTab';
import { SalaryTab } from './components/salary/SalaryTab';
import { SavingsTab } from './components/savings/SavingsTab';
import { RecurringExpensesModal } from './components/recurring/RecurringExpensesModal';
import { MonthlyReportModal } from './components/reports/MonthlyReportModal';
import { SettingsModal } from './components/settings/SettingsModal';
import { getDatabase, subscribeToDatabaseChanges } from './database/db';
import { getCurrentMonthString } from './utils/date';
import { Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { OfflineIndicator } from './components/common/OfflineIndicator';

export default function App() {
  const [dbReady, setDbReady] = useState<boolean>(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('t_nihon_theme') === 'dark';
  });

  const [currentTab, setCurrentTab] = useState<TabKey>('home');
  const [currentMonth, setCurrentMonth] = useState<string>(getCurrentMonthString());
  const [refreshKey, setRefreshKey] = useState<number>(0);

  // Modals state
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState<boolean>(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);

  // Dark mode handler
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('t_nihon_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('t_nihon_theme', 'light');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode((prev) => !prev);

  // Initialize SQLite database
  useEffect(() => {
    let mounted = true;
    getDatabase()
      .then(() => {
        if (mounted) setDbReady(true);
      })
      .catch((err) => {
        console.error('Database initialization failed:', err);
        if (mounted) setDbError(err?.message || 'Failed to initialize local SQLite database.');
      });

    // Subscribe to reactive database changes
    const unsubscribe = subscribeToDatabaseChanges(() => {
      setRefreshKey((k) => k + 1);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  return (
    <IPhoneFrame isDarkMode={isDarkMode} onToggleDarkMode={toggleDarkMode}>
      {/* App Header */}
      <Header
        title={
          currentTab === 'home'
            ? 'T-Personal Finance'
            : currentTab === 'transactions'
            ? 'Activity (家計簿)'
            : currentTab === 'budget'
            ? 'Monthly Budget (予算)'
            : currentTab === 'salary'
            ? 'Part-time Salary (給与)'
            : 'Savings Goals (貯金)'
        }
        onOpenSettings={() => setIsSettingsModalOpen(true)}
      />

      {/* Main Content Area */}
      {!dbReady ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[400px]">
          {dbError ? (
            <div className="p-4 rounded-2xl bg-rose-50 text-rose-700 text-xs border border-rose-200">
              <p className="font-semibold mb-1">SQLite Initialization Error</p>
              <p>{dbError}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <Loader2 size={26} className="text-emerald-700 dark:text-emerald-400 animate-spin" />
              <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                Opening iPhone SQLite database...
              </p>
            </div>
          )}
        </div>
      ) : (
        <main key={refreshKey} className="flex-1 overflow-x-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
              className="w-full flex-1"
            >
              {currentTab === 'home' && (
                <DashboardTab
                  currentMonth={currentMonth}
                  onChangeMonth={setCurrentMonth}
                  onNavigateToTab={setCurrentTab}
                />
              )}

              {currentTab === 'transactions' && (
                <TransactionsTab
                  currentMonth={currentMonth}
                  onOpenRecurringModal={() => setIsRecurringModalOpen(true)}
                  onOpenReportModal={() => setIsReportModalOpen(true)}
                />
              )}

              {currentTab === 'budget' && (
                <BudgetTab currentMonth={currentMonth} />
              )}

              {currentTab === 'salary' && (
                <SalaryTab currentMonth={currentMonth} />
              )}

              {currentTab === 'savings' && (
                <SavingsTab currentMonth={currentMonth} />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      )}

      {/* Bottom Navigation Tab Bar */}
      <BottomTabBar currentTab={currentTab} onSelectTab={setCurrentTab} />

      {/* Recurring Bills Modal */}
      <RecurringExpensesModal
        isOpen={isRecurringModalOpen}
        onClose={() => setIsRecurringModalOpen(false)}
        onPaymentConfirmed={() => setRefreshKey((k) => k + 1)}
      />

      {/* Monthly Report Modal */}
      <MonthlyReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        initialMonth={currentMonth}
      />

      {/* Settings & Backup/Restore Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        isDarkMode={isDarkMode}
        onToggleDarkMode={toggleDarkMode}
        currentMonth={currentMonth}
        onDataRestored={() => setRefreshKey((k) => k + 1)}
      />

      {/* Non-intrusive Offline Indicator */}
      <OfflineIndicator />
    </IPhoneFrame>
  );
}
