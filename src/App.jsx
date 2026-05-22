import { useEffect, useState } from "react";
import TypingTest from "./components/TypingTest";
import Footer from "./components/Footer";
import { getPreferredTheme, setPreferredTheme } from "./utils/storage";

function App() {
  const [theme, setTheme] = useState(getPreferredTheme());

  useEffect(() => {
    setPreferredTheme(theme);
    document.documentElement.setAttribute("data-theme", theme);
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  const isDark = theme === "dark";
  const bgColor = isDark ? "bg-slate-950" : "bg-white";
  const textColor = isDark ? "text-slate-100" : "text-slate-900";

  return (
    <div className={`app-fade min-h-screen ${bgColor} ${textColor} flex flex-col transition-colors duration-300`}>
      <div className="flex-1">
        <TypingTest
          theme={theme}
          onToggleTheme={() => setTheme((previous) => (previous === "dark" ? "light" : "dark"))}
        />
      </div>
      <Footer isDark={isDark} />
    </div>
  );
}

export default App;
