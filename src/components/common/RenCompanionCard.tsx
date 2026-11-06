import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles } from 'lucide-react';
import type { MonthlyFinancialSummary } from '../../types';
import { formatYen } from '../../utils/currency';

interface RenCompanionCardProps {
  summary: MonthlyFinancialSummary;
  className?: string;
}

const FUN_TIPS = [
  "Wan! (ワン!) Did you grab convenience store snacks today? Remember to log them! 🍙",
  "Every ¥1,000 you save is a warm bowl of extra chashu ramen! 🍜✨",
  "I'm keeping watch over your wallet like a loyal ninja Shiba! 🐾",
  "Great job checking your finances today bro! Consistency is key! 🎯",
  "Part-time shift coming up? Let's get that bread! 💴",
  "Small daily savings add up to big adventures across Japan! 🗻🚅",
];

export const RenCompanionCard: React.FC<RenCompanionCardProps> = ({
  summary,
  className = '',
}) => {
  const [tipIndex, setTipIndex] = useState<number>(0);
  const [isWagging, setIsWagging] = useState<boolean>(false);

  // Calculate days to next payday (25th of the month)
  const today = new Date();
  const currentDay = today.getDate();
  const payday = 25;
  const daysToPayday = currentDay <= payday ? payday - currentDay : 30 - (currentDay - payday);

  // Dynamic status message
  const getContextMessage = () => {
    if (daysToPayday <= 3 && daysToPayday > 0) {
      return `Almost payday! Only ${daysToPayday} day${daysToPayday === 1 ? '' : 's'} left! Hang in there bro! 🍜 💴`;
    }
    if (daysToPayday === 0) {
      return `Woof!! It's PAYDAY today! Time to celebrate & log that salary slip! 🎉 💴`;
    }
    if (summary.budgetUsagePercent > 90) {
      return `Careful bro! Budget is at ${summary.budgetUsagePercent}%. Let's slow down expenses this week! ⚠️`;
    }
    if (summary.availableSpendingYen > 0) {
      return `Looking good! You have ${formatYen(summary.availableSpendingYen)} in remaining budget! Keep it up! 🍙`;
    }
    return FUN_TIPS[tipIndex % FUN_TIPS.length];
  };

  const handleRenTap = () => {
    setIsWagging(true);
    setTipIndex((prev) => (prev + 1) % FUN_TIPS.length);
    setTimeout(() => setIsWagging(false), 600);
  };

  const currentSpeech = tipIndex === 0 ? getContextMessage() : FUN_TIPS[tipIndex % FUN_TIPS.length];

  return (
    <div
      className={`relative overflow-hidden rounded-3xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/60 p-3.5 shadow-2xs transition-all ${className}`}
    >
      <div className="flex items-center gap-3">
        {/* Animated Shiba Inu Avatar */}
        <motion.button
          type="button"
          onClick={handleRenTap}
          whileTap={{ scale: 0.88, rotate: [-2, 4, -2, 0] }}
          className="relative shrink-0 focus:outline-hidden group"
          title="Tap Ren_漣 for motivation!"
        >
          <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/40 border border-amber-200/90 dark:border-amber-700/60 flex items-center justify-center shadow-xs overflow-hidden">
            {/* Custom SVG Shiba Inu */}
            <svg
              viewBox="0 0 100 100"
              className="w-12 h-12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Ears */}
              <polygon points="20,40 32,15 48,32" fill="#D97706" />
              <polygon points="26,36 34,22 44,32" fill="#FEF3C7" />
              <polygon points="80,40 68,15 52,32" fill="#D97706" />
              <polygon points="74,36 66,22 56,32" fill="#FEF3C7" />

              {/* Head */}
              <circle cx="50" cy="54" r="32" fill="#F59E0B" />

              {/* White Mochi Cheeks & Muzzle */}
              <ellipse cx="50" cy="62" rx="22" ry="16" fill="#FFFBEB" />
              <ellipse cx="36" cy="54" rx="10" ry="8" fill="#FFFBEB" />
              <ellipse cx="64" cy="54" rx="10" ry="8" fill="#FFFBEB" />

              {/* Cool Boyish Bandana */}
              <polygon points="32,74 50,92 68,74" fill="#047857" />
              <polygon points="45,86 50,92 55,86" fill="#065F46" />
              <circle cx="50" cy="80" r="2.5" fill="#FEF08A" />

              {/* Eyes */}
              <ellipse cx="40" cy="48" rx="3.5" ry="4.5" fill="#1F2937" />
              <ellipse cx="60" cy="48" rx="3.5" ry="4.5" fill="#1F2937" />
              <circle cx="41.5" cy="46.5" r="1.2" fill="#FFFFFF" />
              <circle cx="61.5" cy="46.5" r="1.2" fill="#FFFFFF" />

              {/* Shiba Eyebrow Dots */}
              <circle cx="38" cy="38" r="2.2" fill="#FFFBEB" />
              <circle cx="62" cy="38" r="2.2" fill="#FFFBEB" />

              {/* Cute Nose & Mouth */}
              <polygon points="47,56 53,56 50,60" fill="#1F2937" />
              <path
                d="M45,63 Q50,66 50,61 Q50,66 55,63"
                stroke="#1F2937"
                strokeWidth="1.8"
                strokeLinecap="round"
                fill="none"
              />

              {/* Blush */}
              <circle cx="32" cy="56" r="3.5" fill="#FCA5A5" opacity="0.6" />
              <circle cx="68" cy="56" r="3.5" fill="#FCA5A5" opacity="0.6" />
            </svg>
          </div>

          {/* Sparkle badge */}
          <motion.div
            animate={{ rotate: isWagging ? [0, 20, -20, 0] : 0 }}
            className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold shadow-xs border-2 border-white dark:border-neutral-900"
          >
            🐾
          </motion.div>
        </motion.button>

        {/* Speech Bubble & Companion Advice */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1 mb-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-amber-900 dark:text-amber-300">
                Ren_漣 (漣)
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-200/70 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 font-semibold">
                Budget Buddy
              </span>
            </div>
            <button
              type="button"
              onClick={handleRenTap}
              className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 hover:text-amber-900 flex items-center gap-0.5"
            >
              <Sparkles size={11} />
              <span>Tap me</span>
            </button>
          </div>

          <AnimatePresence mode="wait">
            <motion.p
              key={currentSpeech}
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -3 }}
              transition={{ duration: 0.15 }}
              className="text-xs font-medium text-neutral-800 dark:text-neutral-200 leading-snug line-clamp-2"
            >
              {currentSpeech}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
