import { motion, useReducedMotion } from "framer-motion";

const WORD = [
  { char: "G", accent: true },
  { char: "o", accent: true },
  { char: "T" },
  { char: "y" },
  { char: "p" },
  { char: "e" }
];

/**
 * Animated GoType mark: three speed lines slide in, the "G" draws itself, and a caret blinks.
 * On hover the badge springs and the speed lines run again.
 */
export function LogoMark({ size = 48, animate = true }) {
  const draw = animate ? { initial: { pathLength: 0 }, animate: { pathLength: 1 } } : {};

  return (
    <svg width={size} height={size} viewBox="0 0 56 56" role="img" aria-label="GoType logo" className="overflow-visible">
      <defs>
        <linearGradient id="gt-badge" x1="6" y1="4" x2="50" y2="52" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#b9b3ee" />
          <stop offset="0.55" stopColor="#8d86d6" />
          <stop offset="1" stopColor="#55529c" />
        </linearGradient>
        <linearGradient id="gt-sheen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.45" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* soft glow behind the badge */}
      <rect x="5" y="7" width="46" height="46" rx="15" fill="#6f69bf" opacity="0.45" filter="blur(6px)" />

      {/* badge: a rounded diamond that reads as a tilted keycap */}
      <rect x="4" y="4" width="48" height="48" rx="15" fill="url(#gt-badge)" />
      <rect x="4" y="4" width="48" height="48" rx="15" fill="url(#gt-sheen)" />
      <rect x="4.75" y="4.75" width="46.5" height="46.5" rx="14.25" fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="1.2" />

      {/* speed lines */}
      {[18, 28, 38].map((y, index) => (
        <motion.rect
          key={y}
          x="-4"
          y={y - 1.3}
          width={index === 1 ? 13 : 9}
          height="2.6"
          rx="1.3"
          fill="#ddbf84"
          initial={animate ? { x: -14, opacity: 0 } : false}
          animate={animate ? { x: [-14, -4, -4, -9, -4], opacity: [0, 1, 1, 0.55, 1] } : {}}
          transition={{ duration: 2.4, delay: 0.15 * index, repeat: Infinity, repeatDelay: 3.2, ease: "easeOut" }}
        />
      ))}

      {/* G, drawn on load */}
      <motion.path
        d="M37 20.4A11 11 0 1 0 37.4 33.6V28H28.6"
        fill="none"
        stroke="#fff"
        strokeWidth="4.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...draw}
        transition={{ duration: 1.1, ease: "easeInOut" }}
      />

      {/* caret */}
      <motion.rect
        x="42.5"
        y="19"
        width="3.2"
        height="18"
        rx="1.6"
        fill="#f1e2c2"
        initial={animate ? { opacity: 0 } : false}
        animate={animate ? { opacity: [0, 0, 1, 1, 0, 0] } : {}}
        transition={{ duration: 1.1, delay: 1.1, repeat: Infinity, times: [0, 0.01, 0.02, 0.5, 0.51, 1] }}
      />
    </svg>
  );
}

function AppLogo({ isDark = true }) {
  const reduceMotion = useReducedMotion();
  const animate = !reduceMotion;

  return (
    <motion.div
      className="group flex cursor-pointer select-none items-center gap-3"
      whileHover={animate ? { scale: 1.03 } : undefined}
      whileTap={animate ? { scale: 0.97 } : undefined}
    >
      <motion.div
        whileHover={animate ? { rotate: [0, -8, 6, 0], y: -2 } : undefined}
        transition={{ type: "spring", stiffness: 300, damping: 14 }}
        className="drop-shadow-[0_10px_18px_rgba(85,82,156,0.45)]"
      >
        <LogoMark size={48} animate={animate} />
      </motion.div>

      <div className="flex flex-col leading-none">
        <span className="font-display flex items-end text-[24px] font-extrabold tracking-[-0.04em]" aria-label="GoType">
          {WORD.map((letter, index) => (
            <motion.span
              key={`${letter.char}-${index}`}
              aria-hidden="true"
              className={letter.accent ? (isDark ? "text-sand-300" : "text-wine-700") : isDark ? "text-white" : "text-slate-900"}
              initial={animate ? { y: 14, opacity: 0 } : false}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.25 + index * 0.07, type: "spring", stiffness: 420, damping: 18 }}
              whileHover={animate ? { y: -3, transition: { duration: 0.12 } } : undefined}
            >
              {letter.char}
            </motion.span>
          ))}
          <motion.span
            aria-hidden="true"
            className={`mb-[3px] ml-1 inline-block h-[20px] w-[3px] rounded-full ${isDark ? "bg-sky-300" : "bg-sky-600"}`}
            animate={animate ? { opacity: [1, 1, 0, 0] } : {}}
            transition={{ duration: 1.1, repeat: Infinity, times: [0, 0.5, 0.5, 1] }}
          />
        </span>
        <motion.small
          className={`mt-1.5 text-[11px] font-medium tracking-wide ${isDark ? "text-slate-400" : "text-slate-600"}`}
          initial={animate ? { opacity: 0, x: -6 } : false}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.9, duration: 0.5 }}
        >
          Practice. Improve. Repeat.
        </motion.small>
      </div>
    </motion.div>
  );
}

export default AppLogo;
