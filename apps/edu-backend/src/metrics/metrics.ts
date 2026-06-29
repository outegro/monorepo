import { Counter, collectDefaultMetrics, Histogram, Registry } from "prom-client";

/**
 * Prometheus registry for edu-backend. Scraped per-pod at GET /metrics (PodMonitor) and
 * surfaced in the "Outegro — AI (MiniMax)" Grafana dashboard. The point is debuggability +
 * cost control: every call to the LLM provider is counted, timed, and token-accounted.
 */
export const registry = new Registry();
collectDefaultMetrics({ register: registry });

/** Calls to the LLM provider, by operation (homework/ask/quiz) and outcome. */
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
