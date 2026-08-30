/*
 * Shared registry for parameter decorators (@Body, @CurrentUser, ...) and
 * for @Use()/@AuthGuard() middleware.
 *
 * A parameter decorator that reassigns the prototype method directly is
 * not reliably applied by SWC/esbuild (verified). What *is* reliable is a
 * class decorator reassigning the prototype method after the class is
 * fully defined. So parameter decorators here only register a resolver;
 * @Controller() reads this registry (and route.ts's per-method @Use()
 * middlewares) and does the actual method wrapping once, via
 * wireControllerMethods() below.
 *
 * Middleware composition lives here — on the method itself — rather than
 * in register.ts's router-dispatch path, precisely so it runs for BOTH a
 * real route call (dispatched through app.handle()) and a controller
 * method bound and called directly as a Server Action
 * (`controller.create.bind(controller)(payload)`), which never goes
 * through register.ts at all.
 */

import { composeMiddlewares } from "../utils/compose";
import { getGlobalMiddlewares } from "../utils/global-middleware";
import type { RouteContext } from "../utils/types";
import { routeRegistry } from "./route";

export type ParamResolveResult =
  | { success: true; value: any }
  | { success: false; response: any };

/*
 * `context` is the same object the middleware chain ran against for this
 * call (see wireControllerMethods) — the real RouteContext for an
 * API-route dispatch, or the synthetic per-call object for a Server
 * Action call. @CurrentUser() reads `context.user` off it; @Body()
 * ignores it and works off `rawInput` alone.
 */
export type ParamResolver = (
  rawInput: any,
  context: any
) => Promise<ParamResolveResult> | ParamResolveResult;

/*
 * Shared by @Body() and @CurrentUser() to tell apart their two call
 * shapes: a RouteContext (API-route dispatch) vs. a plain payload/no
 * argument at all (bound-and-called-directly as a Server Action).
 */
export function isRouteContext(value: unknown): value is RouteContext {
  return (
    !!value &&
    typeof value === "object" &&
    "request" in value &&
    "params" in value &&
    "query" in value &&
    typeof (value as { json?: unknown }).json === "function"
  );
}

interface ParamEntry {
  index: number;
  resolve: ParamResolver;
}

const paramRegistry = new Map<any, Map<string | symbol, ParamEntry[]>>();

export function registerParam(
  target: any,
  propertyKey: string | symbol,
  index: number,
  resolve: ParamResolver
) {
  const ctor = target.constructor;
  const methods = paramRegistry.get(ctor) ?? new Map<string | symbol, ParamEntry[]>();
  const entries = methods.get(propertyKey) ?? [];
  entries.push({ index, resolve });
  methods.set(propertyKey, entries);
  paramRegistry.set(ctor, methods);
}

/*
 * A directly-bound Server Action call has no request/params/query to
 * build a RouteContext from — this is deliberately minimal, just enough
 * surface for a middleware to attach `context.user` (or anything else)
 * to, and for @CurrentUser() to read it back afterward. Middleware that
 * needs headers/cookies in this call shape should reach for Next.js's
 * `next/headers` APIs directly (they work inside a Server Action with no
 * NextRequest in sight) rather than `context.request`, which won't exist
 * here.
 */
function createActionContext(): Record<string, unknown> {
  return {};
}

/*
 * Wires every route method of `target` — anything registered via
 * @Get/@Post/.../@Use(), or carrying a @Body()/@CurrentUser() parameter
 * — so that, called either way (real route dispatch or a directly-bound
 * Server Action), it:
 *
 *   1. runs the app-level middleware chain (registered via app.use(),
 *      see utils/global-middleware.ts), wrapping
 *   2. this method's own @Use()/@AuthGuard() middleware chain, wrapping
 *   3. this method's @Body()/@CurrentUser() parameter resolution, wrapping
 *   4. the original method body.
 *
 * All four steps share one `context` object for the call — see
 * createActionContext() above. Called from @Controller() once the class
 * is fully defined.
 */
export function wireControllerMethods(target: any) {
  const paramMethods = paramRegistry.get(target);
  const routes = routeRegistry.get(target);

  const methodNames = new Set<string | symbol>();
  if (paramMethods) for (const key of paramMethods.keys()) methodNames.add(key);
  if (routes) for (const route of routes) methodNames.add(route.handler);

  for (const propertyKey of methodNames) {
    const original = target.prototype[propertyKey];
    if (typeof original !== "function") continue;

    const entries = [...(paramMethods?.get(propertyKey) ?? [])].sort(
      (a, b) => a.index - b.index
    );
    const methodMiddlewares =
      routes?.find((route) => route.handler === propertyKey)?.middlewares ?? [];

    target.prototype[propertyKey] = async function (this: any, ...rawArgs: any[]) {
      const context = isRouteContext(rawArgs[0]) ? rawArgs[0] : createActionContext();

      const runBody = async () => {
        /*
         * Start from the caller's actual arguments so plain
         * (non-decorated) parameters — e.g. `update(id, @Body() dto)` —
         * survive untouched. Each resolver reads its own positional
         * argument when the caller passed that many args (server-action
         * style: `update(id, dto)`); otherwise it falls back to arg 0
         * (API-route style: a single RouteContext feeds every decorator
         * on the method).
         */
        const resolvedArgs: any[] = [...rawArgs];

        for (const entry of entries) {
          const rawInput = entry.index < rawArgs.length ? rawArgs[entry.index] : rawArgs[0];
          const result = await entry.resolve(rawInput, context);

          if (!result.success) {
            return result.response;
          }

          resolvedArgs[entry.index] = result.value;
        }

        return original.apply(this, resolvedArgs);
      };

      const allMiddlewares = [...getGlobalMiddlewares(), ...methodMiddlewares];
      return composeMiddlewares(context, allMiddlewares, runBody)();
    };
  }
}
