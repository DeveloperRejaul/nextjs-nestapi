import type { RouteMiddleware } from "../decorators/route";

/*
 * The library's one piece of global/shared state (no DI container, same
 * philosophy as the rest of this library) — registered via
 * createApplication()'s `app.use()` and consumed from exactly one place:
 * decorators/param-registry.ts's wireControllerMethods(), which wraps
 * every controller method with this chain before its own @Use()
 * middleware and parameter resolution run.
 *
 * There's deliberately no per-app-instance isolation here. A controller
 * method bound and called directly as a Server Action has no reference
 * to any particular `NextJsApp` instance to look middlewares up on — a
 * single global list is the only place a middleware registered via
 * `app.use()` can live that both call shapes (real route dispatch and a
 * directly-bound Server Action call) can reach.
 */
const globalMiddlewares: RouteMiddleware[] = [];

export function registerGlobalMiddleware(middleware: RouteMiddleware) {
  globalMiddlewares.push(middleware);
}

export function getGlobalMiddlewares(): RouteMiddleware[] {
  return globalMiddlewares;
}
