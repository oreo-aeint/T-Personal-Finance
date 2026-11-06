import React from 'react';
import { AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = false,
  onConfirm,
  onCancel,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={onCancel}
            aria-hidden="true"
          />
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 12 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative z-10 w-full max-w-sm bg-white dark:bg-neutral-900 rounded-[28px] p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 text-center"
          >
            <div className={`mx-auto w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${
              isDestructive ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
            }`}>
              <AlertCircle size={24} />
            </div>
            <h4 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-1.5">
              {title}
            </h4>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed mb-6">
              {message}
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 min-h-[44px] py-2.5 px-4 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors active:scale-95"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className={`flex-1 min-h-[44px] py-2.5 px-4 rounded-xl text-xs font-semibold text-white transition-all shadow-sm ${
                  isDestructive
                    ? 'bg-rose-600 hover:bg-rose-700 active:scale-95'
                    : 'bg-emerald-700 hover:bg-emerald-800 active:scale-95'
                }`}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
