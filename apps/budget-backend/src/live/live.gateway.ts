import { Logger } from "@nestjs/common";
import { type OnGatewayConnection, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import type { Server, Socket } from "socket.io";
import { TokenVerifierService } from "../common/token-verifier.service";
import { LIVE_CHANGED_EVENT, userRoom } from "./live.constants";

/**
 * Live-sync gateway. Each of a user's open tabs holds a socket that joins the `user:<id>`
 * room; when the backend detects a change for that user it emits `changed` and the tabs
 * refetch. Auth is the SAME access token used for HTTP: in prod the browser connects
 * same-origin (budget.outegro.com/socket.io), so the httpOnly `og_access` cookie rides the
 * handshake; a token in `handshake.auth.token` is also accepted (dev). Origin is reflected
 * with credentials — trust is the token, not the origin.
 */
@WebSocketGateway({ cors: { origin: true, credentials: true } })
export class LiveGateway implements OnGatewayConnection {
  private readonly logger = new Logger(LiveGateway.name);
  @WebSocketServer() private readonly server!: Server;

  constructor(private readonly verifier: TokenVerifierService) {}

  async handleConnection(client: Socket): Promise<void> {
    const token = this.extractToken(client);
    const user = token ? await this.verifier.verify(token) : null;
    if (!user) {
      this.logger.debug(`rejected unauthenticated socket ${client.id}`);
      client.emit("unauthorized");
      client.disconnect(true);
      return;
    }
    client.data.userId = user.userId;
    await client.join(userRoom(user.userId));
  }

  /** Notify every open tab of `userId` that its budget data changed. */
  emitChanged(userId: string): void {
    this.server.to(userRoom(userId)).emit(LIVE_CHANGED_EVENT);
  }

  private extractToken(client: Socket): string | null {
    const fromAuth = client.handshake.auth?.token;
    if (typeof fromAuth === "string" && fromAuth.length > 0) {
      return fromAuth;
    }
    const cookie = client.handshake.headers.cookie;
    if (!cookie) {
      return null;
    }
    const cookieName = process.env.ACCESS_COOKIE ?? "og_access";
    for (const part of cookie.split(";")) {
      const [name, ...rest] = part.trim().split("=");
      if (name === cookieName) {
        return decodeURIComponent(rest.join("="));
      }
    }
    return null;
  }
}
