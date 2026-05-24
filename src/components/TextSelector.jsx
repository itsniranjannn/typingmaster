import { memo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Crown, Edit3, Hash } from "lucide-react";
import { TYPING_MODES } from "../constants/typingModes";

function TextSelector({
  mode,
  onModeChange,
  onCoreSelect,
  customText,
  onCustomTextChange,
  isDark
}) {
  const [showCustomInput, setShowCustomInput] = useState(false);

  const isCoreActive = [TYPING_MODES.TIME, TYPING_MODES.WORDS, TYPING_MODES.GOAL].includes(mode);
  const topModes = [
    { value: "core", label: "Classic Core", icon: Crown, title: "Classic Core: Time, Words, and Goal modes with the secondary settings bar." },
    { value: TYPING_MODES.QUOTE, label: "Quotes", icon: BookOpen, title: "Quotes mode: type a preset quote for punctuation and rhythm practice." },
    { value: TYPING_MODES.CUSTOM, label: "Custom", icon: Edit3, title: "Custom mode: paste your own text and practice it." },
    { value: TYPING_MODES.NUMBERS, label: "Numbers", icon: Hash, title: "Numbers mode: practice mixed numbers and words." }
  ];

  const activeTopMode = isCoreActive ? "core" : mode;

  const shellClass = isDark
    ? "border-slate-700/60 bg-slate-950/55 text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_12px_24px_rgba(15,23,42,0.25)]"
    : "border-slate-200/80 bg-white/70 text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_12px_24px_rgba(148,163,184,0.14)]";
  const activeCoreClass = isDark
    ? "bg-gradient-to-r from-cyan-400 via-sky-500 to-indigo-500 text-white shadow-[0_0_0_1px_rgba(125,211,252,0.35),0_12px_30px_rgba(14,165,233,0.24)]"
    : "bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-500 text-white shadow-[0_0_0_1px_rgba(56,189,248,0.25),0_12px_30px_rgba(14,165,233,0.18)]";
  const activeChipClass = isDark
    ? "bg-slate-100 text-slate-950 shadow-[0_0_0_1px_rgba(255,255,255,0.2)]"
    : "bg-slate-900 text-white shadow-[0_0_0_1px_rgba(15,23,42,0.18)]";
  const inactiveChipClass = isDark
    ? "bg-slate-900/70 text-slate-200 hover:bg-slate-800"
    : "bg-white/90 text-slate-700 hover:bg-slate-100";

  return (
    <div className="w-full">
      <div className={`flex w-full overflow-x-auto flex-nowrap items-center gap-2 rounded-full border px-2 py-2 scrollbar-none ${shellClass}`}>
        {topModes.map((modeItem) => {
          const Icon = modeItem.icon;
          const isActive = activeTopMode === modeItem.value;
          const chipClass = modeItem.value === "core"
            ? isActive
              ? activeCoreClass
              : isDark
                ? "bg-slate-900/70 text-slate-200 ring-1 ring-cyan-300/20 hover:bg-slate-800"
                : "bg-white/90 text-slate-700 ring-1 ring-cyan-500/20 hover:bg-slate-100"
            : isActive
              ? activeChipClass
              : inactiveChipClass;

            return (
            <motion.button
              key={modeItem.value}
              onClick={() => {
                if (modeItem.value === "core") {
                  onCoreSelect?.();
                  setShowCustomInput(false);
                  return;
                }

                onModeChange(modeItem.value);
                setShowCustomInput(modeItem.value === TYPING_MODES.CUSTOM);
              }}
              className={`inline-flex flex-shrink-0 whitespace-nowrap items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold tracking-[0.01em] transition ${chipClass}`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              aria-pressed={isActive}
              title={modeItem.title}
            >
              <Icon size={16} className={modeItem.value === "core" ? "drop-shadow-[0_0_12px_rgba(125,211,252,0.55)]" : ""} />
              <span>{modeItem.label}</span>
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence>
        {showCustomInput && mode === TYPING_MODES.CUSTOM && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="mt-2"
          >
            <textarea
              value={customText}
              onChange={(e) => onCustomTextChange(e.target.value)}
              onPaste={() => setShowCustomInput(true)}
              placeholder="Paste your custom text here..."
              className={`w-full rounded-2xl border px-4 py-3 outline-none resize-none text-sm ${isDark ? "border-slate-700/60 bg-slate-950/60 text-slate-100 placeholder:text-slate-500" : "border-slate-200/80 bg-white/80 text-slate-900 placeholder:text-slate-400"}`}
              rows={3}
              onBlur={() => setShowCustomInput(customText.length === 0)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default memo(TextSelector);
