"use client";

import { LanguagesIcon } from "lucide-react";
import { Button } from "./button.js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "./dropdown-menu.js";

/** The five locales the platform ships, in display order. */
export const LOCALES = [
  { code: "ru", label: "Русский", short: "RU" },
  { code: "en", label: "English", short: "EN" },
  { code: "uz", label: "O'zbekcha", short: "UZ" },
  { code: "tg", label: "Тоҷикӣ", short: "TJ" },
  { code: "ky", label: "Кыргызча", short: "KG" },
] as const;

export type Locale = (typeof LOCALES)[number]["code"];

export interface LanguageSwitcherProps {
  value: Locale;
  onValueChange: (locale: Locale) => void;
  className?: string;
}

/**
 * Purely presentational — the caller owns the locale state, so this works both with
 * next-intl (landing) and with the client-context i18n the subservices use. Previously
 * each app carried its own copy of a five-button row; a dropdown scales past five and is
 * stock shadcn.
 */
export function LanguageSwitcher({ value, onValueChange, className }: LanguageSwitcherProps) {
  const current = LOCALES.find((l) => l.code === value) ?? LOCALES[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className={className}>
          <LanguagesIcon />
          {current.short}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={value} onValueChange={(v) => onValueChange(v as Locale)}>
          {LOCALES.map((l) => (
            <DropdownMenuRadioItem key={l.code} value={l.code}>
              {l.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
