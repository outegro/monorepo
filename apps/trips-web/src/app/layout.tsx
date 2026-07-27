// trips-web: trips.outegro.com — Korea reel catalogue (review + places) + BFF over
// trips-backend (shares Outegro ID SSO).
import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trips — Korea",
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
