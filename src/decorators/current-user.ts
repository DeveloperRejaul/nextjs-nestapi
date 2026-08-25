import { resolveCurrentUser } from "../utils/auth";
import { isRouteContext, registerParam } from "./param-registry";

/*
 * Injects the resolved auth user (or null). Never blocks the request
 * on its own — pair with @AuthGuard() on the same method to actually
 * require authentication. If @AuthGuard() already ran for this
 * request, this reuses its result instead of resolving twice (see
 * utils/auth.ts).
 */
export function CurrentUser<TUser = unknown>(): ParameterDecorator {
  return (target: any, propertyKey, parameterIndex) => {
    if (propertyKey === undefined) return;

    registerParam(target, propertyKey, parameterIndex, async (rawInput) => {
      if (!isRouteContext(rawInput)) {
        return { success: true as const, value: null as TUser | null };
      }

      const user = (await resolveCurrentUser(rawInput)) as TUser | null;
      return { success: true as const, value: user };
    });
  };
}
