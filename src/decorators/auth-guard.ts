import { Response } from "../utils/Response";
import { resolveCurrentUser } from "../utils/auth";
import type { RouteContext } from "../utils/types";
import { Use } from "./route";

/*
 * Sugar over @Use() — not a separate dispatch mechanism. Reusing the
 * existing middleware chain means @AuthGuard() runs (and can
 * short-circuit) before the route's @Body()/@CurrentUser() parameter
 * resolvers ever start, since @Use middlewares wrap the whole handler
 * call in register.ts, not just the handler body.
 *
 * AuthGuard() — must resolve a user, any role.
 * AuthGuard(['ADMIN', 'EDITOR']) — must resolve a user AND have one
 * of the listed roles (read from `user.role`).
 */
export function AuthGuard(roles?: string[]): MethodDecorator {
  return Use(async (context: RouteContext, next) => {
    const user = (await resolveCurrentUser(context)) as { role?: string } | null;

    if (!user) {
      return Response.Unauthorized();
    }

    if (roles && roles.length > 0 && !roles.includes(user.role as string)) {
      return Response.Forbidden();
    }

    return next();
  });
}
