import { motion } from "framer-motion";

function Footer({ isDark = true }) {
  const currentYear = new Date().getFullYear();

  return (
    <motion.footer initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ duration: 0.45 }} className={`border-t px-4 py-4 sm:px-6 ${isDark ? "border-slate-800/70 bg-slate-950" : "border-slate-200 bg-white"}`}>
      <div className={`mx-auto flex max-w-6xl flex-col items-center gap-3 sm:flex-row sm:justify-between sm:items-center text-sm ${isDark ? "text-slate-500" : "text-slate-600"}`}>
        <div className="flex items-center gap-3">
          <div className="font-semibold text-[13px]">GoType</div>
          <div className="hidden sm:block text-[12px]">Practice. Improve. Repeat.</div>
        </div>

        <div className="flex items-center gap-3 text-[13px]">
          <span className="text-[13px]">Developed by Niranjan</span>
          <a href="https://github.com/itsniranjannn" target="_blank" rel="noreferrer" className={`transition ${isDark ? "hover:text-slate-200" : "hover:text-slate-900"}`}>GitHub</a>
          <span className="hidden sm:inline">•</span>
          <a href="/privacy" className={`transition ${isDark ? "hover:text-slate-200" : "hover:text-slate-900"}`}>Privacy</a>
          <span className="hidden sm:inline">•</span>
          <a href="/terms" className={`transition ${isDark ? "hover:text-slate-200" : "hover:text-slate-900"}`}>Terms</a>
          <span className="hidden sm:inline">•</span>
          <a href="/contact" className={`transition ${isDark ? "hover:text-slate-200" : "hover:text-slate-900"}`}>Contact</a>
        </div>

        <div className="text-[13px]">© {currentYear} GoType</div>
      </div>
    </motion.footer>
  );
}

export default Footer;
