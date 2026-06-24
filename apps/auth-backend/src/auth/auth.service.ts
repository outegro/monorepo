import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Locale } from "@outegro/contracts";
import type { ClientContext } from "../common/client-context";
import type { Env } from "../config/env.validation";
import { OutboxService } from "../outbox/outbox.service";
import { PrismaService } from "../prisma/prisma.service";
import { TokensService } from "../tokens/tokens.service";
import { type UserRecord, UsersRepository } from "../users/users.repository";
import { EntitlementsService } from "./entitlements.service";
import {
  loginCodeEvent,
  securityAlertEvent,
  sessionTerminatedEvent,
  userCreatedEvent,
} from "./events.factory";
import { LoginCodesRepository } from "./login-codes.repository";
import { type SessionRecord, SessionsService } from "./sessions.service";

/** Max wrong attempts against a single login code before it's dead (brute-force cap). */
const MAX_CODE_ATTEMPTS = 5;

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
}

/**
 * Orchestrates the auth flows. Persistence is delegated to repositories/services; this
 * class owns the *policy* (when to mint, revoke, alert) and keeps event production atomic
 * with DB writes via the transactional outbox.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersRepository,
    private readonly codes: LoginCodesRepository,
    private readonly sessions: SessionsService,
    private readonly entitlements: EntitlementsService,
    private readonly tokens: TokensService,
    private readonly outbox: OutboxService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /** Step 1: create-or-find the user, mint a one-time code, email it. Always 202 (no enumeration). */
  async requestCode(email: string): Promise<void> {
    const code = this.generateCode();
    const codeHash = this.hashCode(code);
    const ttl = this.config.get("CODE_TTL", { infer: true });
    const expiresAt = new Date(Date.now() + ttl * 1000);

    await this.prisma.$transaction(async (tx) => {
      let user = await this.users.findByEmail(email, tx);
      if (!user) {
        user = await this.users.create(email, tx);
        const created = userCreatedEvent(user.id, user.email, user.createdAt);
        await this.outbox.enqueue(tx, created.exchange, created.event);
      }
      await this.codes.create(user.id, codeHash, expiresAt, tx);
      const notify = loginCodeEvent(user.id, user.email, this.localeOf(user), code);
      await this.outbox.enqueue(tx, notify.exchange, notify.event);
    });
  }

  /** Step 2: validate the code, verify the email, start a session. */
  async verifyCode(email: string, code: string, ctx: ClientContext): Promise<SessionTokens> {
    const user = await this.users.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException({ code: "invalid_code" });
    }
    const active = await this.codes.findActive(user.id);
    if (!active) {
      throw new UnauthorizedException({ code: "invalid_code" });
    }
    if (active.attempts >= MAX_CODE_ATTEMPTS) {
      throw new HttpException({ code: "too_many_attempts" }, HttpStatus.TOO_MANY_REQUESTS);
    }
    if (!this.codesMatch(active.codeHash, code)) {
      await this.codes.incrementAttempts(active.id);
      throw new UnauthorizedException({ code: "invalid_code" });
    }

    await this.codes.consume(active.id);
    if (!user.emailVerified) {
      await this.users.markEmailVerified(user.id);
    }
    return this.startSession(user, "email", ctx);
  }

  /** Rotate the refresh token. REUSE ⇒ burn the session + alert (stolen token). */
  async refresh(oldToken: string, ctx: ClientContext): Promise<SessionTokens> {
    const { result, token, sessionId } = await this.tokens.rotateRefresh(oldToken);
    if (!sessionId || result === "DEAD") {
      throw new UnauthorizedException({ code: "invalid_refresh" });
    }
    if (result === "REUSE") {
      await this.handleReuse(sessionId);
      throw new UnauthorizedException({ code: "invalid_refresh" });
    }

    const session = await this.sessions.findById(sessionId);
    if (!session || !token) {
      throw new UnauthorizedException({ code: "invalid_refresh" });
    }
    void this.sessions.touch(sessionId, ctx);
    const roles = await this.entitlements.getRoles(session.userId);
    const accessToken = await this.tokens.signAccessToken({
      userId: session.userId,
      sessionId,
      roles,
    });
    return { accessToken, refreshToken: token, sessionId };
  }

  /** BFF-initiated logout: kill the refresh token (Redis) and mark the row revoked. */
  async logout(refreshToken: string): Promise<void> {
    const sessionId = refreshToken.split(".")[0];
    if (!sessionId) {
      return;
    }
    await this.tokens.revokeSession(sessionId);
    await this.sessions.revoke(sessionId, "user");
  }

  me(userId: string): Promise<UserRecord | null> {
    return this.users.findById(userId);
  }

  async listSessions(
    userId: string,
    currentSessionId: string,
  ): Promise<Array<SessionRecord & { current: boolean }>> {
    const sessions = await this.sessions.listActive(userId);
    return sessions.map((s) => ({ ...s, current: s.id === currentSessionId }));
  }

  getEntitlements(userId: string) {
    return this.entitlements.list(userId);
  }

  /** The user's configured sign-in methods (for the "how you sign in" profile section). */
  async getIdentities(userId: string): Promise<{
    email: string | null;
    emailVerified: boolean;
    google: string[];
    passkeys: number;
  }> {
    const [user, identities, passkeys] = await Promise.all([
      this.users.findById(userId),
      this.prisma.identity.findMany({
        where: { userId, provider: "google" },
        select: { email: true },
      }),
      this.prisma.webauthnCredential.count({ where: { userId } }),
    ]);
    return {
      email: user?.email ?? null,
      emailVerified: user?.emailVerified ?? false,
      google: identities.map((i) => i.email).filter((e): e is string => e !== null),
      passkeys,
    };
  }

  /** User-initiated termination of one of their own sessions. */
  async terminateSession(userId: string, sessionId: string): Promise<void> {
    const session = await this.sessions.findById(sessionId);
    if (!session || session.userId !== userId) {
      throw new NotFoundException({ code: "session_not_found" });
    }
    await this.tokens.revokeSession(sessionId);
    await this.prisma.$transaction(async (tx) => {
      await this.sessions.revoke(sessionId, "user", tx);
      const ev = sessionTerminatedEvent(userId, sessionId);
      await this.outbox.enqueue(tx, ev.exchange, ev.event);
    });
  }

  /** "Log out everywhere else" — terminate every active session except the caller's. */
  async terminateOtherSessions(userId: string, currentSessionId: string): Promise<void> {
    const others = (await this.sessions.listActive(userId)).filter(
      (s) => s.id !== currentSessionId,
    );
    for (const s of others) {
      await this.tokens.revokeSession(s.id);
    }
    if (others.length === 0) {
      return;
    }
    await this.prisma.$transaction(async (tx) => {
      for (const s of others) {
        await this.sessions.revoke(s.id, "user", tx);
        const ev = sessionTerminatedEvent(userId, s.id);
        await this.outbox.enqueue(tx, ev.exchange, ev.event);
      }
    });
  }

  /**
   * Issue a session for an already-authenticated user (passkey / Google login share the
   * same session machinery + security alert as email-code).
   */
  async issueSessionForUser(
    userId: string,
    authMethod: string,
    ctx: ClientContext,
  ): Promise<SessionTokens> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new UnauthorizedException({ code: "user_not_found" });
    }
    return this.startSession(user, authMethod, ctx);
  }

  /** Create a session row (+ security alert), then mint refresh + access tokens. */
  private async startSession(
    user: UserRecord,
    authMethod: string,
    ctx: ClientContext,
  ): Promise<SessionTokens> {
    const roles = await this.entitlements.getRoles(user.id);
    const session = await this.prisma.$transaction(async (tx) => {
      const created = await this.sessions.create(user.id, authMethod, ctx, tx);
      const alert = securityAlertEvent(
        user.id,
        user.email,
        this.localeOf(user),
        this.loginAlertMessage(this.localeOf(user), ctx),
      );
      await this.outbox.enqueue(tx, alert.exchange, alert.event);
      return created;
    });

    const refreshToken = await this.tokens.issueRefresh(session.id);
    const accessToken = await this.tokens.signAccessToken({
      userId: user.id,
      sessionId: session.id,
      roles,
    });
    return { accessToken, refreshToken, sessionId: session.id };
  }

  /** Refresh-token reuse detected: the Lua already burned Redis; revoke the row + alert. */
  private async handleReuse(sessionId: string): Promise<void> {
    const session = await this.sessions.findById(sessionId);
    if (!session) {
      return;
    }
    await this.prisma.$transaction(async (tx) => {
      await this.sessions.revoke(sessionId, "reuse", tx);
      const terminated = sessionTerminatedEvent(session.userId, sessionId);
      await this.outbox.enqueue(tx, terminated.exchange, terminated.event);
      const user = await this.users.findById(session.userId, tx);
      if (user) {
        const alert = securityAlertEvent(
          user.id,
          user.email,
          this.localeOf(user),
          this.reuseAlertMessage(this.localeOf(user)),
        );
        await this.outbox.enqueue(tx, alert.exchange, alert.event);
      }
    });
  }

  private localeOf(user: UserRecord): Locale {
    return user.locale === "en" ? "en" : "ru";
  }

  private generateCode(): string {
    return randomInt(0, 1_000_000).toString().padStart(6, "0");
  }

  private hashCode(code: string): string {
    return createHash("sha256").update(code).digest("hex");
  }

  /** Constant-time comparison of the stored hash against a freshly hashed candidate. */
  private codesMatch(storedHash: string, candidate: string): boolean {
    const candidateHash = this.hashCode(candidate);
    const a = Buffer.from(storedHash, "hex");
    const b = Buffer.from(candidateHash, "hex");
    return a.length === b.length && timingSafeEqual(a, b);
  }

  private loginAlertMessage(locale: Locale, ctx: ClientContext): string {
    const where = ctx.country
      ? locale === "en"
        ? ` from ${ctx.country}`
        : ` из ${ctx.country}`
      : "";
    return locale === "en"
      ? `New sign-in to your Outegro account${where}. If this wasn't you, revoke the session.`
      : `Новый вход в аккаунт Outegro${where}. Если это были не вы — отзовите сессию.`;
  }

  private reuseAlertMessage(locale: Locale): string {
    return locale === "en"
      ? "A session was ended because its refresh token was reused (possible theft)."
      : "Сессия завершена: refresh-токен использован повторно (возможная кража).";
  }
}
