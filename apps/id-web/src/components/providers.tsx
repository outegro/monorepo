"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider, useTheme } from "next-themes";
import { useState } from "react";
import { Toaster } from "sonner";
import { I18nProvider } from "@/lib/i18n";
import { makeQueryClient } from "@/lib/query-client";

/** Sonner toaster wired to the active theme (so toasts match light/dark). */
function ThemedToaster() {
  const { resolvedTheme } = useTheme();
  return (
    <Toaster position="top-center" richColors theme={resolvedTheme === "dark" ? "dark" : "light"} />
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(makeQueryClient);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <I18nProvider>
        <QueryClientProvider client={queryClient}>
          {children}
          <ThemedToaster />
        </QueryClientProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
