import { motion } from "framer-motion";
import { ArrowUpRight, ChevronRight, Mail, ShieldCheck, Sparkles } from "lucide-react";

function Footer({ isDark = true }) {
  const currentYear = new Date().getFullYear();

  return (
    <motion.footer
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className={`relative mt-8 overflow-hidden border-t px-4 py-8 sm:px-6 sm:py-10 ${isDark ? "border-slate-800/80 bg-slate-950" : "border-slate-200 bg-white"}`}
    >
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent`} />
      <div className={`pointer-events-none absolute left-1/2 top-0 h-44 w-44 -translate-x-1/2 rounded-full blur-3xl ${isDark ? "bg-cyan-500/10" : "bg-sky-300/20"}`} />

      <div className="relative mx-auto max-w-6xl">
        <div className={`rounded-[32px] border p-5 shadow-[0_30px_100px_rgba(0,0,0,0.14)] backdrop-blur-xl sm:p-6 ${isDark ? "border-slate-700/70 bg-slate-900/75" : "border-slate-200 bg-white/90"}`}>
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.9fr_0.9fr] lg:items-start">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${isDark ? "border-cyan-400/20 bg-cyan-400/10 text-cyan-300" : "border-sky-200 bg-sky-50 text-sky-700"}`}>
                  <Sparkles size={18} />
                </div>
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300">GoType</div>
                  <div className={`mt-1 text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>Practice. Improve. Repeat.</div>
                </div>
              </div>

              <p className={`max-w-md text-sm leading-6 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                A focused typing experience with a clean, high-contrast interface built to help you build speed, accuracy, and consistency.
              </p>

              <div className="flex flex-wrap gap-2">
                <a
                  href="/legal.html"
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${isDark ? "bg-cyan-400/10 text-cyan-200 hover:bg-cyan-400/15" : "bg-sky-100 text-sky-700 hover:bg-sky-200"}`}
                >
                  <ShieldCheck size={15} />
                  Policy Center
                </a>
                <a
                  href="https://github.com/itsniranjannn"
                  target="_blank"
                  rel="noreferrer"
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${isDark ? "border-slate-700 bg-slate-950/40 text-slate-200 hover:border-cyan-400/50" : "border-slate-200 bg-white text-slate-700 hover:border-sky-300"}`}
                >
                  GitHub
                  <ArrowUpRight size={15} />
                </a>
              </div>
            </div>

            <div className={`rounded-3xl border p-5 ${isDark ? "border-slate-700/70 bg-slate-950/45" : "border-slate-200 bg-slate-50"}`}>
              <div className={`text-xs font-semibold uppercase tracking-[0.2em] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Legal
              </div>
              <div className="mt-4 space-y-2 text-sm">
                <a href="/legal.html#privacy" className={`flex items-center justify-between rounded-2xl px-4 py-3 transition ${isDark ? "bg-slate-900/70 text-slate-200 hover:bg-slate-900" : "bg-white text-slate-700 hover:bg-slate-100"}`}>
                  <span>Privacy</span>
                  <ChevronRight size={15} />
                </a>
                <a href="/legal.html#terms" className={`flex items-center justify-between rounded-2xl px-4 py-3 transition ${isDark ? "bg-slate-900/70 text-slate-200 hover:bg-slate-900" : "bg-white text-slate-700 hover:bg-slate-100"}`}>
                  <span>Terms</span>
                  <ChevronRight size={15} />
                </a>
                <a href="/legal.html#contact" className={`flex items-center justify-between rounded-2xl px-4 py-3 transition ${isDark ? "bg-slate-900/70 text-slate-200 hover:bg-slate-900" : "bg-white text-slate-700 hover:bg-slate-100"}`}>
                  <span>Contact</span>
                  <ChevronRight size={15} />
                </a>
              </div>
            </div>

            <div className={`rounded-3xl border p-5 ${isDark ? "border-slate-700/70 bg-slate-950/45" : "border-slate-200 bg-slate-50"}`}>
              <div className={`text-xs font-semibold uppercase tracking-[0.2em] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Contact
              </div>
              <div className="mt-4 space-y-3 text-sm">
                <a
                  href="mailto:hello@gotype.app"
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 transition ${isDark ? "bg-slate-900/70 text-slate-200 hover:bg-slate-900" : "bg-white text-slate-700 hover:bg-slate-100"}`}
                >
                  <Mail size={15} className="shrink-0 text-cyan-300" />
                  <span className="truncate">katwalniranjan40@gmail.com</span>
                </a>

                <div className={`rounded-2xl border px-4 py-3 ${isDark ? "border-slate-700/70 bg-slate-900/50 text-slate-300" : "border-slate-200 bg-white text-slate-600"}`}>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Built by</div>
                  <div className="mt-1 font-medium">Niranjan</div>
                  <div className="mt-3 text-[12px] leading-5">GoType is designed to feel fast, calm, and precise.</div>
                </div>
              </div>
            </div>
          </div>

          <div className={`mt-6 flex flex-col gap-3 border-t pt-4 text-sm sm:flex-row sm:items-center sm:justify-between ${isDark ? "border-slate-800/80 text-slate-500" : "border-slate-200 text-slate-600"}`}>
            <div>All rights are reserved © {currentYear} GoType</div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="hidden sm:inline">Focused typing. Minimal friction.</span>
             
            </div>
          </div>
        </div>
      </div>
    </motion.footer>
  );
}

export default Footer;
