// src/legal.jsx or src/components/LegalPage.jsx
import { motion } from "framer-motion";
import { ArrowLeft, ExternalLink, Mail, ShieldCheck, FileText, ContactRound, User, Database, Clock } from "lucide-react";
import AppLogo from "./AppLogo";
import Footer from "./Footer";
import { getPreferredTheme } from "../utils/storage";

const sections = [
  {
    id: "privacy",
    icon: ShieldCheck,
    title: "Privacy Policy",
    summary: "What data GoType stores and why.",
    points: [
      "GoType stores all typing results, settings, and leaderboard data locally in your browser (localStorage). No data is sent to any server unless you manually export it.",
      "We do not use cookies, trackers, or analytics scripts. Your typing practice stays private to your device.",
      "If you reset the app via Settings, all stored data is permanently deleted from your browser."
    ]
  },
  {
    id: "terms",
    icon: FileText,
    title: "Terms of Use",
    summary: "Simple rules for using GoType.",
    points: [
      "GoType is provided for personal, educational, and non‑commercial typing practice.",
      "You may not reverse engineer, scrape, or attempt to overload the service.",
      "We reserve the right to update these terms – continued use means acceptance.",
      "The app is provided 'as is' without warranties; use at your own risk."
    ]
  },
  {
    id: "developer",
    icon: User,
    title: "Developer",
    summary: "Created by Niranjan Katwal.",
    points: [
      "Designed and built by Niranjan Katwal as a passion project to help people type faster and more accurately.",
      "Background in software development and a love for typing and productivity tools.",
      "Open to feedback, contributions, and collaborations to make GoType even better."
    ]
  },
  {
    id: "contact",
    icon: ContactRound,
    title: "Contact",
    summary: "Reach out for support or feedback.",
    points: [
      "Email: katwalniranjan40@gmail.com (preferred)",
      "GitHub: https://github.com/itsniranjannn/typingmaster",
      "For business inquiries, use the same email."
    ]
  }
];

function SectionCard({ section, isDark }) {
  const Icon = section.icon;

  return (
    <motion.section
      id={section.id}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.35 }}
      className={`rounded-[28px] border p-6 shadow-[0_24px_80px_rgba(0,0,0,0.12)] sm:p-8 ${
        isDark
          ? "border-slate-700/70 bg-slate-900/70"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${isDark ? "bg-cyan-400/10 text-cyan-300" : "bg-sky-50 text-sky-600"}`}>
            <Icon size={22} />
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{section.title}</h2>
            <p className={`mt-1 max-w-2xl text-sm sm:text-base ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              {section.summary}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {section.points.map((point) => (
          <div
            key={point}
            className={`rounded-2xl border px-4 py-3 text-sm leading-6 sm:text-[15px] ${
              isDark
                ? "border-slate-700/70 bg-slate-950/40 text-slate-300"
                : "border-slate-200 bg-slate-50 text-slate-700"
            }`}
          >
            {point}
          </div>
        ))}
      </div>
    </motion.section>
  );
}

function LegalPage() {
  const theme = getPreferredTheme();
  const isDark = theme === "dark";

  return (
    <div className={`min-h-screen ${isDark ? "bg-slate-950 text-slate-100" : "bg-white text-slate-900"}`}>
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className={`absolute left-1/2 top-0 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full blur-3xl ${isDark ? "bg-cyan-500/10" : "bg-sky-300/20"}`} />
        <div className={`absolute right-[-8rem] top-24 h-80 w-80 rounded-full blur-3xl ${isDark ? "bg-blue-500/10" : "bg-blue-200/30"}`} />
      </div>

      <header className={`border-b ${isDark ? "border-slate-800/80 bg-slate-950/80" : "border-slate-200 bg-white/80"} backdrop-blur-xl`}>
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <a href="/" className="inline-flex w-fit">
            <AppLogo isDark={isDark} />
          </a>

          <nav className="flex flex-wrap items-center gap-2 text-sm">
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className={`rounded-full border px-4 py-2 transition ${isDark ? "border-slate-700 bg-slate-900/70 text-slate-200 hover:border-cyan-400/60 hover:text-white" : "border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:text-slate-950"}`}
              >
                {section.title}
              </a>
            ))}
            <a
              href="/"
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 font-medium transition ${isDark ? "bg-cyan-400/10 text-cyan-200 hover:bg-cyan-400/15" : "bg-sky-100 text-sky-700 hover:bg-sky-200"}`}
            >
              <ArrowLeft size={16} />
              Back to app
            </a>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:py-16">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="grid gap-8 lg:grid-cols-[minmax(0,1.6fr)_320px]"
        >
          <section className="space-y-6">
            <div className={`rounded-[32px] border p-7 shadow-[0_30px_90px_rgba(0,0,0,0.14)] sm:p-10 ${isDark ? "border-slate-700/70 bg-slate-900/70" : "border-slate-200 bg-white"}`}>
              <span className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${isDark ? "bg-cyan-400/10 text-cyan-200" : "bg-sky-50 text-sky-700"}`}>
                <ShieldCheck size={14} />
                Policy Center
              </span>
              <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">Privacy, terms, and developer info</h1>
              <p className={`mt-4 max-w-3xl text-base leading-7 sm:text-lg ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                GoType respects your privacy. All data stays on your device. Below you'll find clear information about how the app works, who built it, and how to get in touch.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {sections.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className={`rounded-2xl border px-4 py-4 transition hover:-translate-y-0.5 ${isDark ? "border-slate-700 bg-slate-950/40 hover:border-cyan-400/50" : "border-slate-200 bg-slate-50 hover:border-sky-300"}`}
                  >
                    <div className={`text-xs font-semibold uppercase tracking-[0.18em] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                      {section.title}
                    </div>
                    <div className="mt-2 text-sm leading-6">{section.summary}</div>
                  </a>
                ))}
              </div>
            </div>

            <div className="space-y-5">
              {sections.map((section) => (
                <SectionCard key={section.id} section={section} isDark={isDark} />
              ))}
            </div>
          </section>

          <aside className="space-y-5">
            <div className={`rounded-[28px] border p-6 ${isDark ? "border-slate-700/70 bg-slate-900/70" : "border-slate-200 bg-white"}`}>
              <div className={`text-xs font-semibold uppercase tracking-[0.18em] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Quick Links
              </div>
              <div className="mt-4 space-y-2">
                {sections.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm transition ${isDark ? "border-slate-700/70 bg-slate-950/35 text-slate-200 hover:border-cyan-400/50" : "border-slate-200 bg-slate-50 text-slate-700 hover:border-sky-300"}`}
                  >
                    <span>{section.title}</span>
                    <ExternalLink size={15} />
                  </a>
                ))}
              </div>
            </div>

            <div className={`rounded-[28px] border p-6 ${isDark ? "border-slate-700/70 bg-slate-900/70" : "border-slate-200 bg-white"}`}>
              <div className={`text-xs font-semibold uppercase tracking-[0.18em] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Need help?
              </div>
              <p className={`mt-3 text-sm leading-6 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                For support, feature requests, or policy questions, use the contact section above or email me directly.
              </p>
              <a
                href="#contact"
                className={`mt-5 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${isDark ? "bg-cyan-400/10 text-cyan-200 hover:bg-cyan-400/15" : "bg-sky-100 text-sky-700 hover:bg-sky-200"}`}
              >
                <Mail size={16} />
                Jump to Contact
              </a>
            </div>
          </aside>
        </motion.div>
      </main>

      <Footer isDark={isDark} />
    </div>
  );
}

export default LegalPage;