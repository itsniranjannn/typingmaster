import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUp, ArrowUpRight, Mail } from "lucide-react";
import { LogoMark } from "./AppLogo";

const LINKS = [
  { label: "Privacy", href: "/legal#privacy" },
  { label: "Terms", href: "/legal#terms" },
  { label: "Policy center", href: "/legal" },
  { label: "Contact", href: "/legal#contact" }
];

// Rotating promise line under the brand.
const PHRASES = [
  "Build speed, one key at a time.",
  "Accuracy first. Speed follows.",
  "नेपालीमा पनि टाइप गर्नुहोस्।",
  "Practice. Improve. Repeat."
];

function RotatingPhrase({ isDark, reduceMotion }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reduceMotion) return undefined;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % PHRASES.length), 3200);
    return () => window.clearInterval(timer);
  }, [reduceMotion]);

  return (
    <div className="relative h-6 overflow-hidden" aria-live="off">
      <AnimatePresence mode="wait" initial={false}>
        <motion.p
          key={index}
          initial={reduceMotion ? false : { y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={reduceMotion ? undefined : { y: -16, opacity: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className={`text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}
        >
          {PHRASES[index]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

function FooterLink({ href, children, external, isDark, icon: Icon }) {
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
      className={`footer-link group inline-flex items-center gap-1.5 text-sm transition-colors ${
        isDark ? "text-slate-300 hover:text-white" : "text-slate-700 hover:text-slate-950"
      }`}
    >
      {Icon ? <Icon size={14} aria-hidden="true" /> : null}
      <span className="footer-link-text">{children}</span>
      {external ? (
        <ArrowUpRight
          size={12}
          aria-hidden="true"
          className="transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
        />
      ) : null}
    </a>
  );
}

function Footer({ isDark = true }) {
  const currentYear = new Date().getFullYear();
  const reduceMotion = useReducedMotion();
  const muted = isDark ? "text-slate-400" : "text-slate-600";

  const container = {
    hidden: {},
    show: { transition: { staggerChildren: reduceMotion ? 0 : 0.09 } }
  };
  const item = {
    hidden: reduceMotion ? { opacity: 1 } : { opacity: 0, y: 18 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
  };

  const scrollToTop = () => {
    const target = document.querySelector("main") || window;
    target.scrollTo?.({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    window.scrollTo?.({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  };

  return (
    <footer
      className={`footer-root relative mt-8 overflow-hidden border-t ${isDark ? "border-slate-800/80 bg-slate-950" : "border-slate-200 bg-white"}`}
    >
      {/* drifting colour glows */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className={`footer-glow footer-glow-a ${isDark ? "opacity-40" : "opacity-30"}`} />
        <div className={`footer-glow footer-glow-b ${isDark ? "opacity-35" : "opacity-25"}`} />
      </div>
      {/* animated gradient line on the top edge */}
      <div className="footer-shimmer pointer-events-none absolute inset-x-0 top-0 h-px" aria-hidden="true" />

      <motion.div
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.25 }}
        className="relative mx-auto max-w-6xl px-4 pb-20 pt-10 sm:px-8 lg:pb-10"
      >
        <div className="grid gap-8 md:grid-cols-[1.3fr_1fr_1fr]">
          <motion.div variants={item} className="space-y-4">
            <a href="/" className="group inline-flex items-center gap-3" aria-label="GoType home">
              <LogoMark size={44} animate={false} />
              <span className="leading-tight">
                <span className={`block text-xl font-bold tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
                  Go<span className="text-sky-400">Type</span>
                </span>
                <span className={`block text-[11px] font-medium uppercase tracking-[0.2em] ${muted}`}>Typing practice</span>
              </span>
            </a>
            <RotatingPhrase isDark={isDark} reduceMotion={reduceMotion} />
            <p className={`max-w-sm text-xs leading-5 ${muted}`}>
              A calm place to build typing speed and accuracy in English and नेपाली, with guided lessons and a Loksewa-style test.
            </p>
          </motion.div>

          <motion.nav variants={item} aria-label="Footer" className="space-y-3">
            <h3 className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${muted}`}>Explore</h3>
            <ul className="flex flex-col gap-2.5">
              {LINKS.map((link) => (
                <li key={link.label}>
                  <FooterLink href={link.href} isDark={isDark}>
                    {link.label}
                  </FooterLink>
                </li>
              ))}
            </ul>
          </motion.nav>

          <motion.div variants={item} className="space-y-3">
            <h3 className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${muted}`}>Say hello</h3>
            <ul className="flex flex-col gap-2.5">
              <li>
                <FooterLink href="mailto:katwalniranjan40@gmail.com" icon={Mail} isDark={isDark}>
                  katwalniranjan40@gmail.com
                </FooterLink>
              </li>
              <li>
                <FooterLink href="https://github.com/itsniranjannn" external isDark={isDark}>
                  GitHub
                </FooterLink>
              </li>
            </ul>
            <motion.button
              type="button"
              onClick={scrollToTop}
              whileHover={reduceMotion ? undefined : { y: -3 }}
              whileTap={reduceMotion ? undefined : { scale: 0.96 }}
              className={`mt-2 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition-colors ${
                isDark
                  ? "border-slate-700 bg-slate-900/70 text-slate-200 hover:border-sky-400/60 hover:text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:border-sky-500 hover:text-slate-950"
              }`}
            >
              <ArrowUp size={14} aria-hidden="true" className="footer-arrow" />
              Back to top
            </motion.button>
          </motion.div>
        </div>

        <motion.div
          variants={item}
          className={`mt-8 flex flex-col gap-1 border-t pt-4 text-xs sm:flex-row sm:items-center sm:justify-between ${isDark ? "border-slate-800/70" : "border-slate-200"} ${muted}`}
        >
          <span>© {currentYear} GoType. All rights reserved.</span>
          <span className={`font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>Niranjan</span>
        </motion.div>
      </motion.div>
    </footer>
  );
}

export default Footer;
