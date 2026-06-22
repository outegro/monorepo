import path from "node:path";
import type { NextConfig } from "next";

/**
 * Next 16 standalone Node server (SSR + BFF route handlers). outputFileTracingRoot
 * → workspace root so standalone tracing works from the monorepo. reactCompiler →
 * React 19 Compiler (needs babel-plugin-react-compiler).
 */
const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(import.meta.dirname, "../.."),
  reactStrictMode: true,
  reactCompiler: true,
};

export default nextConfig;
