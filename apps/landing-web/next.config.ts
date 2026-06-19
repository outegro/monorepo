import path from "node:path";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/**
 * Next 16 standalone Node server (NOT static export + nginx).
 * We need SSR + BFF route handlers + /api/health.
 *
 * outputFileTracingRoot → workspace root, чтобы standalone-трассировка работала
 * из монорепо (даже без shared-пакетов).
 *
 * reactCompiler → React 19 Compiler (top-level in Next 16, needs babel-plugin-react-compiler).
 */
const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(import.meta.dirname, "../.."),
  reactStrictMode: true,
  reactCompiler: true,
};

export default withNextIntl(nextConfig);
