import React from 'react';
import { WifiOff, Database } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { motion, AnimatePresence } from 'motion/react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-20 left-4 right-4 z-40 max-w-sm mx-auto pointer-events-none"
        >
          <div className="bg-amber-600/95 dark:bg-amber-700/95 backdrop-blur-md text-white px-3.5 py-2 rounded-2xl shadow-lg border border-amber-500/80 flex items-center justify-between text-xs pointer-events-auto">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <WifiOff size={14} />
              <span className="font-semibold">Offline Mode</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] opacity-90">
              <Database size={12} />
              <span>Local SQLite active</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
