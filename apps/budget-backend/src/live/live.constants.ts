/**
 * Live-sync fanout. A mutation on ANY replica publishes `{ userId }` here; every replica
 * binds its own exclusive queue, so all of them receive it and the one(s) holding that
 * user's socket re-emit "changed" locally (others no-op on an empty room). This is what
 * makes cross-tab / cross-device live updates correct with ≥2 backend replicas — internal
 * to budget, so it lives here rather than in @outegro/contracts (cross-service topology).
 */
export const LIVE_EXCHANGE = "budget.live";

/** socket.io room per user — every one of the user's open tabs joins it. */
export function userRoom(userId: string): string {
  return `user:${userId}`;
}

/** Event the client listens for → it invalidates its queries and refetches. */
export const LIVE_CHANGED_EVENT = "changed";

export interface LiveChangedMessage {
  userId: string;
}
