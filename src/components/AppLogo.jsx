import { motion } from "framer-motion";

/**
 * GoType mark: a rounded keycap holding a "G" built from an arc and a bar,
 * with a blinking caret beside it. Pure SVG so it scales crisply and themes via gradients.
 */
export function LogoMark({ size = 44 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-label="GoType logo">
      <defs>
        <linearGradient id="gt-key" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#a8233f" />
          <stop offset="1" stopColor="#651230" />
        </linearGradient>
        <linearGradient id="gt-shine" x1="24" y1="4" x2="24" y2="26" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="3" y="3" width="42" height="42" rx="12" fill="url(#gt-key)" />
      <rect x="3" y="3" width="42" height="42" rx="12" fill="url(#gt-shine)" />
      <path
        d="M30.5 17.5A9 9 0 1 0 31 28.5V24H24"
        fill="none"
        stroke="#f4e8cf"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <motion.rect
        x="35.5"
        y="15"
        width="2.6"
        height="18"
        rx="1.3"
        fill="#f4e8cf"
        animate={{ opacity: [1, 1, 0, 0] }}
        transition={{ duration: 1.1, repeat: Infinity, times: [0, 0.5, 0.5, 1] }}
      />
    </svg>
  );
}

function AppLogo({ isDark = true }) {
  return (
    <motion.div className="group flex cursor-pointer items-center gap-3" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
      <div className="rounded-2xl shadow-[0_10px_30px_rgba(138,28,59,0.5)]">
        <LogoMark size={44} />
      </div>
      <div className="flex flex-col leading-none">
        <span className="font-display text-xl font-extrabold tracking-[-0.03em]" >
          <span className={isDark ? "text-cyan-300" : "text-wine-700"}>Go</span>
          <span className={isDark ? "text-white" : "text-slate-900"}>Type</span>
        </span>
        <small className={`mt-1 text-[11px] ${isDark ? "text-slate-400" : "text-slate-600"}`}>Practice. Improve. Repeat.</small>
      </div>
    </motion.div>
  );
}

export default AppLogo;
