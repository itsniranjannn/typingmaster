import { motion } from "framer-motion";
import { Keyboard } from "lucide-react";

function AppLogo({ isDark = true }) {
  return (
    <motion.div
      className="group flex items-center gap-3 cursor-pointer"
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
    >
      <motion.div
        className={`relative flex h-12 w-12 items-center justify-center rounded-2xl border ${
          isDark
            ? "border-cyan-400/25 bg-gradient-to-br from-slate-900 to-slate-800 shadow-[0_18px_40px_rgba(15,23,42,0.35)]"
            : "border-blue-200 bg-gradient-to-br from-white to-slate-50 shadow-[0_18px_40px_rgba(15,23,42,0.12)]"
        }`}
        animate={{ rotate: [0, 6, -6, 0], y: [0, -1, 0] }}
        transition={{ duration: 4.5, repeat: Infinity, repeatDelay: 0.5 }}
      >
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-400/20 via-blue-500/10 to-violet-500/20 blur-sm" />
        <Keyboard size={22} className="relative z-10 text-cyan-300" />
      </motion.div>
      <div className="flex flex-col leading-none">
        <span
          className="text-[1.15rem] font-semibold tracking-[-0.04em] text-transparent bg-gradient-to-r from-cyan-300 via-sky-400 to-blue-500 bg-clip-text"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          GoType
        </span>
      </div>
    </motion.div>
  );
}

export default AppLogo;
