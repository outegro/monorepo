// itmaxxing-web: itmaxxing.outegro.com — job-hunt copilot (lore intake) + BFF over
// itmaxxing-backend (shares Outegro ID SSO).
import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "itmaxxing — job-hunt copilot",
  description: "Brain-dump your career; AI structures it into a résumé-ready knowledge base.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-dvh bg-background text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
