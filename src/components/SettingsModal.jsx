import { memo, useState } from "react";
import { X } from "lucide-react";
import { getSoundEnabled, setSoundEnabled, getSoundVolume, setSoundVolume, getPreferredTheme, setPreferredTheme } from "../utils/storage";

function SettingsModal({ isOpen, onClose, theme, onThemeChange }) {
  const [soundEnabled, setSoundEnabledLocal] = useState(getSoundEnabled());
  const [soundVolume, setSoundVolumeLocal] = useState(getSoundVolume());

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Settings">
      <div className="w-full max-w-md mx-4 max-h-[90vh] space-y-6 overflow-y-auto rounded-2xl border border-slate-700/50 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Settings</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition-all hover:bg-slate-800 hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
            aria-label="Close settings"
          >
            <X size={24} />
          </button>
        </div>

        {/* Sound Settings */}
        <div className="space-y-4 border-b border-slate-700/50 pb-6">
          <h3 className="text-lg font-semibold text-white">Sound</h3>
          <div className="flex items-center justify-between">
            <label className="text-slate-200">Enable sound</label>
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
              <label className="text-sm text-slate-400">Volume</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={soundVolume}
                onChange={(e) => handleVolumeChange(e.target.value)}
                className="w-full accent-blue-500"
              />
              <p className="text-xs text-slate-400">{Math.round(soundVolume * 100)}%</p>
            </div>
          )}
        </div>

        {/* Theme Settings */}
        <div className="space-y-4 border-b border-slate-700/50 pb-6">
          <h3 className="text-lg font-semibold text-white">Appearance</h3>
          <div className="flex items-center justify-between">
            <label className="text-slate-200">Dark mode</label>
            <button
              onClick={handleThemeToggle}
              className={`w-12 h-7 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 ${
                theme === "dark" ? "bg-brand-500" : "bg-slate-700"
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
          <h3 className="text-lg font-semibold text-white">Data</h3>
          <button
            onClick={handleResetData}
            className="w-full rounded-lg border border-rose-700/50 bg-rose-950/30 py-2.5 font-medium text-rose-400 transition-all hover:bg-rose-900/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/60"
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
