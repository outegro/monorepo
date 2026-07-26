"use client";

import { Button, LanguageSwitcher } from "@outegro/ui";
import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";

/** Top-right controls: language switcher (RU/EN/UZ/TJ/KG) + light/dark theme toggle. */
export function TopBar() {
  const { locale, setLocale } = useI18n();
  const { resolvedTheme, setTheme } = useTheme();
  // Theme is only known after hydration; render the moon until then to avoid a mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="absolute top-4 right-4 flex items-center gap-1">
      <LanguageSwitcher value={locale} onValueChange={setLocale} />
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Toggle theme"
        onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      >
        {mounted && resolvedTheme === "dark" ? <SunIcon /> : <MoonIcon />}
      </Button>
    </div>
  );
}
