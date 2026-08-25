type Executor<T> = () => Promise<T>;
type MiddlewareLike<T> = (context: any, next: Executor<T>) => Promise<T> | T;

/*
 * Wraps `execute` in a reduceRight-composed onion of middlewares —
 * shared by register.ts (per-route @Use/@AuthGuard) and
 * createApplication.ts (app-level app.use()), which otherwise
 * duplicated this exact composition. `execute` itself stays
 * responsible for turning its own result into a real Response (see
 * buildRouteResponse in Response.ts) — this helper only handles the
 * wrapping, so a middleware that short-circuits via `return next()`
 * still sees an already-finalized response from the layer below it.
 */
export function composeMiddlewares<T>(
  context: any,
  middlewares: MiddlewareLike<T>[] | undefined,
  execute: Executor<T>
): Executor<T> {
  if (!middlewares || middlewares.length === 0) {
    return execute;
  }

  return middlewares.reduceRight<Executor<T>>(
    (next, middleware) => async () => middleware(context, next),
    execute
  );
}
