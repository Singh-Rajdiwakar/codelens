"use client";

import { useState } from "react";
import { Laptop, Moon, Sun } from "lucide-react";
import { THEME_COOKIE, THEMES, type Theme } from "@/lib/theme";

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=31536000; samesite=lax`;
}

export function ThemeControl({ initial }: { initial: Theme }) {
  const [theme, setTheme] = useState<Theme>(initial);

  function choose(next: Theme) {
    setTheme(next);
    applyTheme(next);
  }

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="flex h-9 items-center rounded-full border border-line bg-canvas p-0.5 text-[0.6875rem]"
    >
      {THEMES.map((t) => (
        <button
          key={t}
          type="button"
          role="radio"
          aria-checked={theme === t}
          onClick={() => choose(t)}
          className={`flex h-8 min-w-8 items-center justify-center rounded-full px-2 ${
            theme === t ? "bg-accent text-accent-fg shadow-sm" : "text-fg-muted hover:text-fg"
          }`}
          aria-label={`${t} theme`}
        >
          {t === "system" ? <Laptop size={14} strokeWidth={1.8} /> : t === "light" ? <Sun size={14} strokeWidth={1.8} /> : <Moon size={14} strokeWidth={1.8} />}
        </button>
      ))}
    </div>
  );
}
