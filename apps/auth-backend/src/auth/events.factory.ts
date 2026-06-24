import {
  Exchanges,
  type Locale,
  makeEvent,
  type NotifyRequestedData,
  RoutingKeys,
} from "@outegro/contracts";

/**
 * Single place that builds domain events (keeps AuthService free of envelope/exchange
 * plumbing). Each factory returns the event AND the exchange it belongs on.
 */
export interface OutboundEvent {
  exchange: string;
  event: ReturnType<typeof makeEvent>;
}

export function userCreatedEvent(userId: string, email: string, createdAt: Date): OutboundEvent {
  return {
    exchange: Exchanges.Auth,
    event: makeEvent(RoutingKeys.AuthUserCreated, 1, {
      userId,
      email,
      createdAt: createdAt.toISOString(),
    }),
  };
}

export function sessionTerminatedEvent(userId: string, sessionId: string): OutboundEvent {
  return {
    exchange: Exchanges.Auth,
    event: makeEvent(RoutingKeys.AuthSessionTerminated, 1, { userId, sessionId }),
  };
}

export function loginCodeEvent(
  userId: string,
  email: string,
  locale: Locale,
  code: string,
): OutboundEvent {
  const data: NotifyRequestedData = {
    userId,
    template: "login_code",
    channels: ["email"],
    to: { email },
    locale,
    data: { code },
  };
  return { exchange: Exchanges.Notify, event: makeEvent(RoutingKeys.NotifyRequested, 1, data) };
}

export function securityAlertEvent(
  userId: string,
  email: string,
  locale: Locale,
  message: string,
): OutboundEvent {
  const data: NotifyRequestedData = {
    userId,
    template: "security_alert",
    // Telegram too — DeliveryService resolves the chat id and skips if unlinked.
    channels: ["email", "telegram"],
    to: { email },
    locale,
    data: { message },
  };
  return { exchange: Exchanges.Notify, event: makeEvent(RoutingKeys.NotifyRequested, 1, data) };
}
