function Footer({ isDark = true }) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={`border-t px-4 py-3 sm:px-6 ${isDark ? "border-slate-800/70 bg-slate-950" : "border-slate-200 bg-white"}`}>
      <div className={`mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-[11px] ${isDark ? "text-slate-500" : "text-slate-500"}`}>
        <p>Developed by Niranjan</p>
        <span className="hidden sm:inline">•</span>
        <p>GoType – Practice daily. Beat your best.</p>
        <span className="hidden sm:inline">•</span>
        <p>© {currentYear}</p>
        <a
          href="https://github.com/itsniranjannn/typingmaster"
          target="_blank"
          rel="noreferrer"
          className={`transition ${isDark ? "hover:text-slate-200" : "hover:text-slate-900"}`}
        >
          GitHub
        </a>
      </div>
    </footer>
  );
}

export default Footer;
