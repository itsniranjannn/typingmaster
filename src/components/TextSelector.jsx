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

  // The selector sits on the wine navbar in both themes, so it uses sand-on-wine styling.
  const shellClass = "border-white/15 bg-black/25 text-sand-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]";
  const activeCoreClass = "bg-gradient-to-b from-sand-50 to-sand-300 text-wine-900 shadow-[0_6px_16px_rgba(0,0,0,0.3)]";
  const activeChipClass = activeCoreClass;
  const inactiveChipClass = "bg-white/10 text-sand-100 hover:bg-white/20";

  return (
    <div className="w-full">
      <div className={`flex w-full overflow-x-auto flex-nowrap items-center gap-2 rounded-full border px-2 py-2 scrollbar-none ${shellClass}`}>
        {topModes.map((modeItem) => {
          const Icon = modeItem.icon;
          const isActive = activeTopMode === modeItem.value;
          const chipClass = modeItem.value === "core"
            ? isActive
              ? activeCoreClass
              : "bg-white/10 text-sand-100 ring-1 ring-sand-300/30 hover:bg-white/20"
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
              <Icon size={16} className={modeItem.value === "core" ? "drop-shadow-[0_0_12px_rgba(189,191,240,0.55)]" : ""} />
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
