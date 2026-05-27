import { memo, useState } from "react";
import { X } from "lucide-react";
import { getSoundEnabled, setSoundEnabled, getSoundVolume, setSoundVolume, getPreferredTheme, setPreferredTheme, getScrollMargin, setScrollMargin } from "../utils/storage";

function SettingsModal({ isOpen, onClose, theme, onThemeChange }) {
  const [soundEnabled, setSoundEnabledLocal] = useState(getSoundEnabled());
  const [soundVolume, setSoundVolumeLocal] = useState(getSoundVolume());
  const [scrollMargin, setScrollMarginLocal] = useState(getScrollMargin());

  const handleSoundToggle = () => {
    const newValue = !soundEnabled;
    setSoundEnabledLocal(newValue);
    setSoundEnabled(newValue);
  };

  const handleVolumeChange = (value) => {
    const vol = parseFloat(value);
    setSoundVolumeLocal(vol);
    setSoundVolume(vol);
  };

  const handleScrollMarginChange = (value) => {
    const margin = parseInt(value, 10);
    setScrollMarginLocal(margin);
    setScrollMargin(margin);
  };

  const handleThemeToggle = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    onThemeChange(newTheme);
  };

  const handleResetData = () => {
    if (confirm("Are you sure? This will erase all your typing data.")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  if (!isOpen) return null;

  const isDark = theme === 'dark';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Settings">
      <div className={`w-full max-w-md mx-4 max-h-[90vh] space-y-6 overflow-y-auto rounded-2xl border p-6 shadow-2xl ${isDark ? 'border-slate-700/50 bg-slate-900' : 'border-slate-200 bg-white'}`}>
        <div className="flex items-center justify-between">
          <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Settings</h2>
          <button
            onClick={onClose}
            className={`rounded-lg p-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 ${isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}
            aria-label="Close settings"
          >
            <X size={24} />
          </button>
        </div>

        {/* Sound Settings */}
        <div className={`space-y-4 border-b pb-6 ${isDark ? 'border-slate-700/50' : 'border-slate-200'}`}>
          <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Sound</h3>
          <div className="flex items-center justify-between">
            <label className={`${isDark ? 'text-slate-200' : 'text-slate-700'}`}>Enable sound</label>
            <button
              onClick={handleSoundToggle}
              className={`w-12 h-7 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 ${
                soundEnabled ? "bg-brand-500" : "bg-slate-700"
              }`}
              aria-label="Toggle sound"
            >
              <div
                className={`w-6 h-6 rounded-full bg-white transition-transform ${
                  soundEnabled ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
          </div>
          {soundEnabled && (
            <div className="space-y-2">
              <label className={`${isDark ? 'text-sm text-slate-400' : 'text-sm text-slate-600'}`}>Volume</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={soundVolume}
                onChange={(e) => handleVolumeChange(e.target.value)}
                className="w-full accent-blue-500"
              />
              <p className={`${isDark ? 'text-xs text-slate-400' : 'text-xs text-slate-600'}`}>{Math.round(soundVolume * 100)}%</p>
            </div>
          )}
        </div>

        {/* Typing Scroll */}
        <div className={`space-y-4 border-b pb-6 ${isDark ? 'border-slate-700/50' : 'border-slate-200'}`}>
          <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Typing Scroll</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <label className={`${isDark ? 'text-slate-200' : 'text-slate-700'}`}>Bottom margin</label>
              <span className={`${isDark ? 'text-slate-400' : 'text-slate-500'} text-sm tabular-nums`}>{scrollMargin}px</span>
            </div>
            <input
              type="range"
              min="0"
              max="150"
              step="1"
              value={scrollMargin}
              onChange={(e) => handleScrollMarginChange(e.target.value)}
              className="w-full accent-blue-500"
              aria-label="Typing scroll margin"
            />
            <p className={`${isDark ? 'text-xs text-slate-400' : 'text-xs text-slate-600'}`}>Keeps the active character above the bottom edge while typing.</p>
          </div>
        </div>

        {/* Theme Settings */}
        <div className={`space-y-4 border-b pb-6 ${isDark ? 'border-slate-700/50' : 'border-slate-200'}`}>
          <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Appearance</h3>
          <div className="flex items-center justify-between">
            <label className={`${isDark ? 'text-slate-200' : 'text-slate-700'}`}>Dark mode</label>
            <button
              onClick={handleThemeToggle}
              className={`w-12 h-7 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 ${
                theme === "dark" ? "bg-brand-500" : "bg-slate-300"
              }`}
              aria-label="Toggle theme"
            >
              <div
                className={`w-6 h-6 rounded-full bg-white transition-transform ${
                  theme === "dark" ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Data Management */}
        <div className="space-y-4">
          <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Data</h3>
          <button
            onClick={handleResetData}
            className={`${isDark ? 'w-full rounded-lg border border-rose-700/50 bg-rose-950/30 py-2.5 font-medium text-rose-400 transition-all hover:bg-rose-900/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/60' : 'w-full rounded-lg border border-rose-200 bg-rose-50 py-2.5 font-medium text-rose-700 transition-all hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/60'}`}
            aria-label="Reset all typing data"
          >
            Reset All Data
          </button>
        </div>
      </div>
    </div>
  );
}

export default memo(SettingsModal);
