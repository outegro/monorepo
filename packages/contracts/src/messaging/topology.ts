/**
 * RabbitMQ topology — the single source of truth for exchanges, routing keys and
 * queues. Services reference these constants; never hard-code the strings.
 *
 * Conventions:
 *  - one topic exchange per domain (`notify`, `auth`, later `payment`)
 *  - durable quorum queues (RabbitMQ 4.x default for reliability)
 *  - a dead-letter exchange per consumer queue → poisoned messages park in a DLQ
 */

export const Exchanges = {
  Notify: "notify",
  Auth: "auth",
} as const;
export type ExchangeName = (typeof Exchanges)[keyof typeof Exchanges];

export const RoutingKeys = {
  NotifyRequested: "notify.requested",
  AuthUserCreated: "auth.user.created",
  AuthSessionTerminated: "auth.session.terminated",
} as const;
export type RoutingKey = (typeof RoutingKeys)[keyof typeof RoutingKeys];

/** Notifications consumer topology: bind `notify.#`, dead-letter to `notify.dlx`. */
export const NotifyTopology = {
  exchange: Exchanges.Notify,
  pattern: "notify.#",
  queue: "notifications",
  deadLetterExchange: "notify.dlx",
  deadLetterQueue: "notify.dlq",
} as const;
