import { motion } from "framer-motion";

/**
 * GoType mark: a sand keycap with a visible key-depth edge, a wine "G", and a blinking caret.
 * Designed for the wine navbar, so the key is the light element.
 */
export function LogoMark({ size = 46 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 52 52" role="img" aria-label="GoType logo">
      <defs>
        <linearGradient id="gt-face" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fffaf0" />
          <stop offset="1" stopColor="#efdfb9" />
        </linearGradient>
        <linearGradient id="gt-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#9b1f3f" />
          <stop offset="1" stopColor="#5f1230" />
        </linearGradient>
      </defs>
      {/* key depth */}
      <rect x="3" y="8" width="46" height="41" rx="12" fill="#b9a06a" />
      {/* key face */}
      <rect x="3" y="3" width="46" height="41" rx="12" fill="url(#gt-face)" />
      <rect x="7" y="7" width="38" height="33" rx="9" fill="none" stroke="#fff" strokeOpacity="0.7" strokeWidth="1" />
      {/* G */}
      <path
        d="M31.5 17.2A9.6 9.6 0 1 0 32 29.2V24.2H24.6"
        fill="none"
        transform="translate(-2.2 0)"
        stroke="url(#gt-g)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* caret */}
      <motion.rect
        x="39.4"
        y="16"
        width="2.8"
        height="17"
        rx="1.4"
        fill="#8a1c3b"
        animate={{ opacity: [1, 1, 0, 0] }}
        transition={{ duration: 1.1, repeat: Infinity, times: [0, 0.5, 0.5, 1] }}
      />
    </svg>
  );
}

function AppLogo() {
  return (
    <motion.div className="group flex cursor-pointer items-center gap-3" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
      <div className="drop-shadow-[0_8px_14px_rgba(0,0,0,0.35)]">
        <LogoMark size={46} />
      </div>
      <div className="flex flex-col leading-none">
        <span className="font-display text-[22px] font-extrabold tracking-[-0.03em]">
          <span className="text-sand-300">Go</span>
          <span className="text-white">Type</span>
        </span>
        <small className="mt-1.5 text-[11px] font-medium tracking-wide text-sand-200/80">Practice. Improve. Repeat.</small>
      </div>
    </motion.div>
  );
}

export default AppLogo;
