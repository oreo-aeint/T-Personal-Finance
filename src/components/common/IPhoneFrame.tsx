import React, { useState, useEffect } from 'react';
import {
  Wifi,
  Battery,
  Smartphone,
  Maximize2,
  Moon,
  Sun,
  Database,
  Calendar,
} from 'lucide-react';

interface IPhoneFrameProps {
  children: React.ReactNode;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export const IPhoneFrame: React.FC<IPhoneFrameProps> = ({
  children,
  isDarkMode,
  onToggleDarkMode,
}) => {
  const [deviceFrameMode, setDeviceFrameMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return false;
    }
    return true;
  });
  const [currentTime, setCurrentTime] = useState<string>('9:41');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, '0');
      setCurrentTime(`${hours}:${minutes}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-neutral-200/70 dark:bg-neutral-950 flex flex-col items-center justify-start p-0 md:p-6 transition-colors duration-200">
      {/* Top Desktop Utility Control Strip */}
      <header className="hidden md:flex items-center justify-between w-full max-w-4xl px-4 py-2.5 mb-3 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-md rounded-2xl border border-neutral-300/60 dark:border-neutral-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-emerald-700 dark:bg-emerald-600 flex items-center justify-center text-white font-bold text-xs shadow-xs">
            T
          </div>
          <div>
            <h1 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 leading-tight">
              T-Personal Finance Tracking
            </h1>
            <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
              Private Japanese Personal Finance · Offline SQLite
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Offline local storage pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-[11px] font-medium border border-emerald-200 dark:border-emerald-900/60">
            <Database size={12} className="text-emerald-600 dark:text-emerald-400" />
            <span>Local iPhone DB</span>
          </div>

          {/* Toggle frame vs fullscreen */}
          <button
            type="button"
            onClick={() => setDeviceFrameMode(!deviceFrameMode)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-neutral-100 hover:bg-neutral-200/70 dark:bg-neutral-800 dark:hover:bg-neutral-700/80 text-neutral-700 dark:text-neutral-200 transition-colors"
            title={deviceFrameMode ? 'Switch to Full Screen View' : 'Switch to iPhone Frame View'}
          >
            {deviceFrameMode ? (
              <>
                <Maximize2 size={13} />
                <span>Full View</span>
              </>
            ) : (
              <>
                <Smartphone size={13} />
                <span>iPhone View</span>
              </>
            )}
          </button>

          {/* Dark mode toggle */}
          <button
            type="button"
            onClick={onToggleDarkMode}
            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl bg-neutral-100 hover:bg-neutral-200/70 dark:bg-neutral-800 dark:hover:bg-neutral-700/80 text-neutral-700 dark:text-neutral-200 transition-colors"
            aria-label="Toggle dark mode"
          >
            {isDarkMode ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div
        className={`w-full transition-all duration-300 ease-out flex justify-center ${
          deviceFrameMode
            ? 'max-w-[428px]'
            : 'max-w-md w-full'
        }`}
      >
        {/* iPhone Chassis Frame */}
        <div
          className={`w-full bg-neutral-50 dark:bg-neutral-900 transition-all flex flex-col relative overflow-hidden ${
            deviceFrameMode
              ? 'rounded-[50px] border-[10px] border-neutral-800 dark:border-neutral-700 shadow-2xl ring-1 ring-neutral-900/30 min-h-[880px] max-h-[920px]'
              : 'min-h-screen border-x border-neutral-200 dark:border-neutral-800'
          }`}
        >
          {/* iOS Status Bar (Simulated when in iPhone Chassis mode) */}
          {deviceFrameMode && (
            <div className="sticky top-0 z-40 bg-neutral-50/90 dark:bg-neutral-900/90 backdrop-blur-md px-6 pt-3 pb-2 flex items-center justify-between text-neutral-900 dark:text-neutral-100 select-none">
              {/* Clock */}
              <span className="text-[13px] font-semibold tracking-tight w-14">
                {currentTime}
              </span>

              {/* Dynamic Island */}
              <div className="w-24 h-6 bg-black rounded-full flex items-center justify-end px-2.5 space-x-1.5 shadow-xs">
                <div className="w-2.5 h-2.5 rounded-full bg-neutral-900 border border-neutral-800" />
                <div className="w-2 h-2 rounded-full bg-emerald-500/70" />
              </div>

              {/* Icons */}
              <div className="flex items-center space-x-1.5 w-14 justify-end text-neutral-700 dark:text-neutral-300">
                <span className="text-[10px] font-semibold tracking-wider">5G</span>
                <Wifi size={13} strokeWidth={2.3} />
                <div className="flex items-center">
                  <Battery size={17} strokeWidth={2.2} />
                </div>
              </div>
            </div>
          )}

          {/* Main App Content Viewport */}
          <div className="flex-1 overflow-y-auto pb-20 relative flex flex-col">
            {children}
          </div>

          {/* iOS Bottom Home Indicator */}
          {deviceFrameMode && (
            <div className="pointer-events-none absolute bottom-1 left-0 right-0 z-50 flex justify-center py-1.5">
              <div className="w-32 h-1 bg-neutral-900/40 dark:bg-neutral-100/40 rounded-full" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
