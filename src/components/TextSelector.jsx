import { memo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Edit3, ChevronDown, Globe, Hash, TimerReset, Target, Target as TargetIcon } from "lucide-react";
import { TYPING_MODES, GOAL_VARIANTS } from "../constants/typingModes";

function TextSelector({ mode, goalVariant = GOAL_VARIANTS.SUSTAIN, timeLimitSeconds = 25, onModeChange, customText, onCustomTextChange, isDark }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);

  const modes = [
    { value: TYPING_MODES.TIME, label: `Time ${timeLimitSeconds}s`, icon: Globe },
    { value: TYPING_MODES.WORDS, label: "Words", icon: TimerReset },
    { value: `${TYPING_MODES.GOAL}:${GOAL_VARIANTS.SUSTAIN}`, label: "Goal (Sustain)", icon: Target },
    { value: `${TYPING_MODES.GOAL}:${GOAL_VARIANTS.REACH}`, label: "Goal (Reach)", icon: TargetIcon },
    { value: TYPING_MODES.QUOTE, label: "Quotes", icon: BookOpen },
    { value: TYPING_MODES.CUSTOM, label: "Custom", icon: Edit3 },
    { value: TYPING_MODES.NUMBERS, label: "Numbers", icon: Hash }
  ];

  const currentMode =
    modes.find((m) => m.value === `${mode}:${goalVariant}`) ||
    modes.find((m) => m.value === mode) ||
    modes[0];
  const CurrentIcon = currentMode.icon;

  const bgClass = isDark ? "bg-slate-900/50 border-slate-700/50 text-slate-100" : "bg-slate-100 border-slate-300 text-slate-900";
  const hoverBgClass = isDark ? "hover:bg-slate-800" : "hover:bg-slate-200";
  const buttonClass = isDark ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800" : "text-slate-600 hover:text-slate-900 hover:bg-slate-200";

  return (
    <div className="relative">
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${bgClass} ${hoverBgClass} transition-all`}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <CurrentIcon size={18} />
        <span className="text-sm font-medium">{currentMode.label}</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={16} />
        </motion.div>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`absolute top-full mt-2 left-0 z-50 rounded-lg border ${bgClass} shadow-lg`}
          >
            {modes.map((m) => {
              const Icon = m.icon;
              return (
                <motion.button
                  key={m.value}
                  onClick={() => {
                    if (String(m.value).startsWith(`${TYPING_MODES.GOAL}:`)) {
                      const nextVariant = String(m.value).split(":")[1] || GOAL_VARIANTS.SUSTAIN;
                      onModeChange(TYPING_MODES.GOAL, { goalVariant: nextVariant });
                    } else if (m.value === TYPING_MODES.TIME) {
                      onModeChange(TYPING_MODES.TIME, { timeLimitSeconds });
                    } else {
                      onModeChange(m.value);
                    }
                    setIsOpen(false);
                    setShowCustomInput(m.value === TYPING_MODES.CUSTOM);
                  }}
                  className={`w-full flex items-center gap-2 px-4 py-2 text-sm ${buttonClass} text-left first:rounded-t-lg last:rounded-b-lg`}
                  whileHover={{ x: 4 }}
                >
                  <Icon size={16} />
                  {m.label}
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCustomInput && mode === TYPING_MODES.CUSTOM && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="absolute top-full mt-2 left-0 right-0 z-40"
          >
            <textarea
              value={customText}
              onChange={(e) => onCustomTextChange(e.target.value)}
              onPaste={() => setShowCustomInput(true)}
              placeholder="Paste your custom text here..."
              className={`w-full px-3 py-2 rounded-lg border ${bgClass} outline-none resize-none text-sm`}
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
