type Executor<T> = () => Promise<T>;
type MiddlewareLike<T> = (context: any, next: Executor<T>) => Promise<T> | T;

/*
 * Wraps `execute` in a reduceRight-composed onion of middlewares. Called
 * from exactly one place — decorators/param-registry.ts's
 * wireControllerMethods() — which composes both the app-level app.use()
 * chain and a method's own @Use()/@AuthGuard() chain around that
 * method's parameter resolution and body, on the method itself. That's
 * what makes the middleware chain run identically for a real route call
 * (dispatched through app.handle()) and a controller method bound and
 * called directly as a Server Action, neither of which goes through a
 * second, router-dispatch-level composition anymore. `execute` itself
 * stays responsible for turning its own result into a real Response
 * (see buildRouteResponse in Response.ts) — this helper only handles the
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
