import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from "@nestjs/common";
import type { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import type { AuthUser } from "../common/current-user.decorator";
import { LivePublisher } from "./live.publisher";

/**
 * After any successful state-changing request (non-GET), fan a "changed" signal out to the
 * user's other tabs. One interceptor on the controller instead of touching ~15 service
 * methods; runs AFTER the guard, so `req.user` is set. GETs are skipped (nothing changed).
 */
@Injectable()
export class LiveSyncInterceptor implements NestInterceptor {
  constructor(private readonly publisher: LivePublisher) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest<{ method: string; user?: AuthUser }>();
    const isMutation = req.method !== "GET" && req.method !== "HEAD";
    return next.handle().pipe(
      tap(() => {
        if (isMutation && req.user?.userId) {
          void this.publisher.publishChanged(req.user.userId);
        }
      }),
    );
  }
}
