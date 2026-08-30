import { registerParam } from "./param-registry";

/*
 * Injects whatever a middleware put on `context.user` (or `null` if
 * nothing did) — it does not resolve anything itself. Pair it with an
 * app-level `app.use()` middleware (or a per-method @Use()/@AuthGuard())
 * that sets `context.user` before this parameter resolves. Because it
 * only reads a value already sitting on the shared per-call context (see
 * decorators/param-registry.ts), it works identically whether the method
 * is dispatched as a real route or bound and called directly as a Server
 * Action — both call shapes share that same context object.
 */
export function CurrentUser<TUser = unknown>(): ParameterDecorator {
  return (target: any, propertyKey, parameterIndex) => {
    if (propertyKey === undefined) return;

    registerParam(target, propertyKey, parameterIndex, (_rawInput, context) => {
      const user = (context as { user?: TUser } | undefined)?.user ?? null;
      return { success: true as const, value: user as TUser | null };
    });
  };
}
