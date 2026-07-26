import { Counter, collectDefaultMetrics, Histogram, Registry } from "prom-client";

/**
 * Prometheus registry for itmaxxing-backend. Scraped per-pod at GET /metrics (ServiceMonitor)
 * and surfaced in the "Outegro — AI (MiniMax)" Grafana dashboard. The point is debuggability +
 * cost control: every call to the LLM provider is counted, timed, and token-accounted.
 *
 * Series names are deliberately the SAME as the ones edu-backend used (`minimax_*`) — the
 * dashboard follows the metric, not the service, so it keeps working after edu's removal.
 * Reasoning tokens matter more here than they did for edu: MiniMax-M2 bills them and they
 * dominate the cost of /intake and /structure.
 */
export const registry = new Registry();
collectDefaultMetrics({ register: registry });

/** Calls to the LLM provider, by operation (intake_review/structure) and outcome. */
export const llmRequests = new Counter({
  name: "minimax_requests_total",
  help: "LLM (MiniMax) chat-completion calls by operation and outcome.",
  labelNames: ["operation", "outcome", "model"] as const,
  registers: [registry],
});

/** End-to-end latency of an LLM call (the main UX complaint to watch). */
export const llmDuration = new Histogram({
  name: "minimax_request_duration_seconds",
  help: "LLM (MiniMax) request duration in seconds.",
  labelNames: ["operation", "model"] as const,
  buckets: [0.5, 1, 2, 4, 8, 12, 20, 30, 45, 60],
  registers: [registry],
});

/** Token usage (proxy for cost) split by kind: prompt / completion / reasoning. */
export const llmTokens = new Counter({
  name: "minimax_tokens_total",
  help: "LLM (MiniMax) token usage by kind (prompt/completion/reasoning).",
  labelNames: ["operation", "kind", "model"] as const,
  registers: [registry],
});
