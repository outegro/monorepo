/** Shared RabbitMQ topology constants. One topic exchange for domain events. */
export const EVENTS_EXCHANGE = "outegro.events";

export const TaglineRoutingKey = {
  Requested: "tagline.requested",
} as const;

/** Payload for `tagline.requested` — the slow AI work is done by the worker. */
export interface TaglineRequestedEvent {
  jobId: string;
  prompt: string;
}
