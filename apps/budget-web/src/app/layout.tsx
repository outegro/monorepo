// budget-web: budget.outegro.com — cascading monthly budget UI + BFF over budget-backend
// (shares Outegro ID SSO).
import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Outegro Budget",
  description: "Каскадный бюджет с конвертацией валют",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className="min-h-dvh bg-background text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
