import pino from "pino";

/**
 * Server/BFF logger. Same shape as the backend pino config.
 * Client-side code should NOT import this — use console or a client logger.
 */
export const logger = pino({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  redact: ["req.headers.authorization", "req.headers.cookie"],
});
