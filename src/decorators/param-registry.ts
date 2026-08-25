/*
 * Shared registry for parameter decorators (@Body, ...).
 *
 * A parameter decorator that reassigns the prototype method directly
 * is not reliably applied by SWC/esbuild (verified). What *is* reliable
 * is a class decorator reassigning the prototype method after the class
 * is fully defined. So parameter decorators here only register a
 * resolver; @Controller() reads this registry and does the actual
 * wrapping once, per method.
 */

export type ParamResolveResult =
  | { success: true; value: any }
  | { success: false; response: any };

export type ParamResolver = (
  rawInput: any
) => Promise<ParamResolveResult> | ParamResolveResult;

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
 * Wires every method of `target` that has registered param resolvers.
 * Called from @Controller() once the class is fully defined.
 */
export function wireParamResolvers(target: any) {
  const methods = paramRegistry.get(target);
  if (!methods) return;

  for (const [propertyKey, entries] of methods) {
    const original = target.prototype[propertyKey];
    if (typeof original !== "function") continue;

    const sorted = [...entries].sort((a, b) => a.index - b.index);

    target.prototype[propertyKey] = async function (this: any, ...rawArgs: any[]) {
      /*
       * Start from the caller's actual arguments so plain (non-decorated)
       * parameters — e.g. `update(id, @Body() dto)` — survive untouched.
       * Each resolver reads its own positional argument when the caller
       * passed that many args (server-action style: `update(id, dto)`);
       * otherwise it falls back to arg 0 (API-route style: a single
       * RouteContext feeds every decorator on the method).
       */
      const resolvedArgs: any[] = [...rawArgs];

      for (const entry of sorted) {
        const rawInput = entry.index < rawArgs.length ? rawArgs[entry.index] : rawArgs[0];
        const result = await entry.resolve(rawInput);

        if (!result.success) {
          return result.response;
        }

        resolvedArgs[entry.index] = result.value;
      }

      return original.apply(this, resolvedArgs);
    };
  }
}
