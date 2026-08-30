import { Response } from "../utils/Response";
import { Use } from "./route";

/*
 * Sugar over @Use() — not a separate dispatch mechanism, and not a
 * resolver either. It assumes some earlier middleware in the chain (an
 * app-level app.use(), typically) already resolved the caller and set
 * `context.user` — this decorator only guards on that value, the same
 * way any other @Use() middleware would, so it runs (and can
 * short-circuit) before this method's @Body()/@CurrentUser() parameter
 * resolvers, and identically for a real route call or a directly-bound
 * Server Action call — see decorators/param-registry.ts.
 *
 * AuthGuard() — must have a resolved user, any role.
 * AuthGuard(['ADMIN', 'EDITOR']) — must have a resolved user AND have
 * one of the listed roles (read from `user.role`).
 */
export function AuthGuard(roles?: string[]): MethodDecorator {
  return Use((context: any, next) => {
    const user = context?.user as { role?: string } | null | undefined;

    if (!user) {
      return Response.Unauthorized();
    }

    if (roles && roles.length > 0 && !roles.includes(user.role as string)) {
      return Response.Forbidden();
    }

    return next();
  });
}
