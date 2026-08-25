import type { RouteContext } from "./types";

/*
 * @AuthGuard()/@CurrentUser() don't hardcode a token format, a
 * cookie/header name, or a database — that's all app-specific. Instead
 * the consumer registers a single `resolveUser` once (in app.ts,
 * before any request is handled), and both decorators call it. This is
 * the library's only global/shared config — everything else stays
 * per-decorator, no DI container.
 */
export type ResolveUser<TUser = unknown> = (
  context: RouteContext
) => Promise<TUser | null> | TUser | null;

let resolveUserFn: ResolveUser | undefined;

export interface ConfigureAuthOptions<TUser = unknown> {
  resolveUser: ResolveUser<TUser>;
}

export function configureAuth<TUser = unknown>(options: ConfigureAuthOptions<TUser>) {
  resolveUserFn = options.resolveUser as ResolveUser;
}

/*
 * @AuthGuard() caches its resolved user on the RouteContext so a
 * @CurrentUser() on the same method doesn't re-resolve (re-read
 * headers/cookies, re-hit a DB) a second time for the same request.
 */
const USER_CACHE_KEY = "__nextjsNestapiUser" as const;

export async function resolveCurrentUser(context: RouteContext): Promise<unknown> {
  const cached = (context as unknown as Record<string, unknown>)[USER_CACHE_KEY];
  if (cached !== undefined) {
    return cached;
  }

  if (!resolveUserFn) {
    throw new Error(
      "nextjs-nestapi: @AuthGuard()/@CurrentUser() require configureAuth({ resolveUser }) " +
        "to be called once (e.g. in app.ts) before any request is handled."
    );
  }

  const user = await resolveUserFn(context);
  (context as unknown as Record<string, unknown>)[USER_CACHE_KEY] = user;
  return user;
}
