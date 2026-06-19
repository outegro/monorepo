import { z } from "zod";

/**
 * Typed, validated env (t3-env ideas, hand-rolled). Server/client split; fails fast
 * at import. The Proxy throws if a server-only var is read in the browser.
 *
 * AUDIT_MINIMAX #63: throw only server-side. On the client, log and let the
 * component decide (fallback / error boundary).
 *
 * Build vs runtime: `next build` evaluates server modules during page-data
 * collection, where runtime env (provided by the Helm Deployment) isn't present
 * yet. Skip validation during the build phase so the image builds; the standalone
 * server still fails fast at request time when a required var is actually missing.
 * `NEXT_PUBLIC_*` analytics IDs are read directly via `process.env` in layout.tsx
 * (build-time inlined), so they're intentionally not part of this runtime object.
 */
const server = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  API_BASE: z.url(), // server-only: backend base for BFF fetches
});

const runtime = {
  NODE_ENV: process.env.NODE_ENV,
  API_BASE: process.env.API_BASE,
};

const isServer = typeof window === "undefined";
const skipValidation =
  process.env.SKIP_ENV_VALIDATION === "true" || process.env.NEXT_PHASE === "phase-production-build";
const parsed = server.safeParse(runtime);

if (!parsed.success && !skipValidation) {
  // Server: throw (fail-fast). Client never reaches here (no server vars in the
  // browser bundle); kept defensive in case the split changes.
  if (isServer) {
    throw new Error(
      `Invalid environment variables:\n${JSON.stringify(z.treeifyError(parsed.error), null, 2)}`,
    );
  }
  console.error("❌ Invalid env (client):", z.treeifyError(parsed.error));
}

type Env = z.infer<typeof server>;

export const env = new Proxy((parsed.success ? parsed.data : {}) as Env, {
  get(target, key: string) {
    if (!isServer && key in server.shape) {
      throw new Error(`❌ Server-only env "${key}" accessed on the client`);
    }
    return Reflect.get(target, key);
  },
});
