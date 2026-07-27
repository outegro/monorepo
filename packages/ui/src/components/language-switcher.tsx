"use client";

import { LanguagesIcon } from "lucide-react";
import { LOCALES, type Locale } from "../lib/locale.js";
import { Button } from "./button.js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "./dropdown-menu.js";

export interface LanguageSwitcherProps {
  value: Locale;
  onValueChange: (locale: Locale) => void;
  className?: string;
}

/**
 * Purely presentational — the caller owns the locale state, so this works both with
 * next-intl (landing) and with the client-context i18n the subservices use. The locale list
 * and the shared cookie live in lib/locale.
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
