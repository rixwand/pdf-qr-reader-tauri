import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import "./App.css";
import DirectoryScanner from "./components/DirectoryScanners";

type Theme = "light" | "dark";

const THEME_STORAGE_KEY = "pdf-qr-reader-theme";

function getInitialTheme(): Theme {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);

  if (savedTheme === "light" || savedTheme === "dark") {
    return savedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function App() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const isDarkMode = theme === "dark";

  function toggleTheme() {
    setTheme(isDarkMode ? "light" : "dark");
  }

  return (
    <main className="overflow-hidden h-screen bg-slate-50 px-6 py-8 text-neutral-800 transition-colors duration-200 dark:bg-slate-900 dark:text-slate-50 sm:px-10">
      <div className="flex w-full justify-end">
        <button
          className="absolute bottom-4 right-4 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm font-medium shadow-sm transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600 dark:border-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700"
          type="button"
          onClick={toggleTheme}
          aria-pressed={isDarkMode}
          aria-label={`Switch to ${isDarkMode ? "light" : "dark"} mode`}>
          {!isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      <DirectoryScanner />
    </main>
  );
}

export default App;
