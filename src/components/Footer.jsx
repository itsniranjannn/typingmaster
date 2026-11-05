import { ArrowUpRight, Mail } from "lucide-react";

const LINKS = [
  { label: "Privacy", href: "/legal#privacy" },
  { label: "Terms", href: "/legal#terms" },
  { label: "Policy center", href: "/legal" },
  { label: "Contact", href: "/legal#contact" }
];

/**
 * Slim, flat footer: brand and promise on the left, links in one row, one quiet
 * bottom line. No cards inside cards, so it stops competing with the typing area.
 */
function Footer({ isDark = true }) {
  const currentYear = new Date().getFullYear();
  const muted = isDark ? "text-slate-400" : "text-slate-600";
  const link = isDark ? "text-slate-300 hover:text-white" : "text-slate-700 hover:text-slate-950";

  return (
    <footer
      className={`mt-6 border-t px-4 py-6 sm:px-8 ${isDark ? "border-slate-800/80 bg-slate-950/60" : "border-slate-200 bg-white/80"}`}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="max-w-sm">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-gradient-to-br from-sky-400 to-wine-400" aria-hidden="true" />
            <span className={`text-sm font-semibold tracking-wide ${isDark ? "text-slate-100" : "text-slate-900"}`}>GoType</span>
          </div>
          <p className={`mt-1.5 text-xs leading-5 ${muted}`}>
            Practice. Improve. Repeat. A calm place to build typing speed and accuracy in English and नेपाली.
          </p>
        </div>

        <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          {LINKS.map((item) => (
            <a key={item.label} href={item.href} className={`transition ${link}`}>
              {item.label}
            </a>
          ))}
          <a
            href="https://github.com/itsniranjannn"
            target="_blank"
            rel="noreferrer"
            className={`inline-flex items-center gap-1.5 transition ${link}`}
          >
            GitHub
            <ArrowUpRight size={12} aria-hidden="true" />
          </a>
          <a href="mailto:katwalniranjan40@gmail.com" className={`inline-flex items-center gap-1.5 transition ${link}`}>
            <Mail size={14} aria-hidden="true" />
            Email
          </a>
        </nav>
      </div>

      <div className={`mx-auto mt-5 flex max-w-6xl flex-col gap-1 border-t pt-4 text-xs sm:flex-row sm:items-center sm:justify-between ${isDark ? "border-slate-800/70" : "border-slate-200"} ${muted}`}>
        <span>© {currentYear} GoType. All rights reserved.</span>
        <span>Built by Niranjan · Focused typing, minimal friction.</span>
      </div>
    </footer>
  );
}

export default Footer;
