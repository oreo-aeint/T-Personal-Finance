import React from 'react';
import { Home, ArrowLeftRight, PieChart, Briefcase, PiggyBank } from 'lucide-react';
import { motion } from 'motion/react';

export type TabKey = 'home' | 'transactions' | 'budget' | 'salary' | 'savings';

interface BottomTabBarProps {
  currentTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  currentTab,
  onSelectTab,
}) => {
  const tabs = [
    { key: 'home' as TabKey, label: 'Home', icon: Home },
    { key: 'transactions' as TabKey, label: 'Activity', icon: ArrowLeftRight },
    { key: 'budget' as TabKey, label: 'Budget', icon: PieChart },
    { key: 'salary' as TabKey, label: 'Salary', icon: Briefcase },
    { key: 'savings' as TabKey, label: 'Savings', icon: PiggyBank },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md border-t border-neutral-200/70 dark:border-neutral-800/80 transition-colors"
      aria-label="Bottom Navigation"
    >
      <div className="max-w-md mx-auto grid grid-cols-5 h-16 items-center px-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.key;
          return (
            <motion.button
              key={tab.key}
              type="button"
              whileTap={{ scale: 0.88 }}
              onClick={() => onSelectTab(tab.key)}
              className={`flex flex-col items-center justify-center min-h-[44px] py-1 transition-colors select-none no-tap-highlight ${
                isActive
                  ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
                  : 'text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300 font-medium'
              }`}
            >
              <div
                className={`relative p-1 rounded-xl transition-all duration-200 ${
                  isActive ? 'bg-emerald-50 dark:bg-emerald-950/50 scale-105' : ''
                }`}
              >
                <Icon size={20} strokeWidth={isActive ? 2.3 : 1.8} />
              </div>
              <span className="text-[10px] tracking-tight mt-0.5 whitespace-nowrap">
                {tab.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
};
