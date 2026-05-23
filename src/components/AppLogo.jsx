import { motion } from "framer-motion";
import { Keyboard } from "lucide-react";

function AppLogo({ isDark = true }) {
  return (
    <motion.div
      className="group flex items-center gap-3 cursor-pointer"
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.98 }}
    >
      <motion.div
        className={`relative flex h-12 w-12 items-center justify-center rounded-2xl border ${
          isDark
            ? "border-cyan-400/25 bg-gradient-to-br from-slate-900 to-slate-800 shadow-[0_18px_40px_rgba(2,6,23,0.6)]"
            : "border-blue-200 bg-gradient-to-br from-white to-slate-50 shadow-[0_18px_40px_rgba(15,23,42,0.12)]"
        }`}
        initial={{ rotate: 0 }}
        animate={{ rotate: [0, 3, -3, 0] }}
        transition={{ duration: 6, repeat: Infinity, repeatDelay: 1 }}
      >
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-400/12 via-blue-400/8 to-violet-500/10 blur-sm" />
        <Keyboard size={20} className="relative z-10 text-cyan-300" />
      </motion.div>
      <div className="flex flex-col leading-none">
        <span
          className="text-lg font-semibold tracking-[-0.02em] text-transparent bg-gradient-to-r from-cyan-300 via-sky-400 to-blue-500 bg-clip-text"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          GoType
        </span>
        <small className={`text-[11px] -mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Practice. Improve. Repeat.</small>
      </div>
    </motion.div>
  );
}

export default AppLogo;
