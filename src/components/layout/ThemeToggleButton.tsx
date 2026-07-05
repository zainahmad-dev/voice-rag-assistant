"use client";

import { Moon, Sun } from "lucide-react";
import { useState } from "react";

export function ThemeToggleButton() {
  const [isDark, setIsDark] = useState(false);

  return (
    <button
      type="button"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setIsDark((prev) => !prev)}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-foreground-muted transition-colors duration-150 hover:text-foreground"
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
