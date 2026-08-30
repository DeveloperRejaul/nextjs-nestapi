/*
 * Real-route half of the auth-middleware redesign smoke test: every call
 * here goes through app.handle(request) — createApplication.ts's
 * dispatcher — exactly the way a catch-all route.ts would invoke it.
 * Verifies:
 *   - the app-level app.use() middleware runs and sets context.user
 *   - @AuthGuard() reads it and 401s/403s/passes correctly
 *   - a per-method @Use() role check reads the same context.user
 *   - @CurrentUser() injects it into the handler
 * See test/auth-middleware.action.test.ts for the same assertions made
 * through a directly-bound Server Action call instead.
 */
import { NextRequest } from "next/server";
import { app, withToken, check, summarize } from "./fixtures";

async function main() {
  console.log("auth-middleware (real route, app.handle())");

  // No token -> @AuthGuard() blocks before the handler ever runs.
  await withToken(undefined, async () => {
    const res = await app.handle(new NextRequest("http://localhost/api/apps/whoami"));
    const body = await res.json();
    check("whoami with no token -> 401", res.status === 401);
    check("whoami with no token -> Unauthorized body", body.statusCode === 401);
  });

  // Valid token, correct role -> @AuthGuard() passes, @CurrentUser() injects the user.
  await withToken("demo-token", async () => {
    const res = await app.handle(new NextRequest("http://localhost/api/apps/whoami"));
    const body = await res.json();
    check("whoami with demo-token -> 200", res.status === 200);
    check("whoami injects resolved user", body.data?.id === "1" && body.data?.role === "ADMIN");
  });

  // ADMIN token hits the SUPER_ADMIN-only route -> per-method @Use() 403s.
  await withToken("demo-token", async () => {
    const res = await app.handle(
      new NextRequest("http://localhost/api/apps", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "acme" }),
      })
    );
    check("create as ADMIN -> 403 (per-method @Use role check)", res.status === 403);
  });

  // SUPER_ADMIN token -> global middleware resolves user, per-method @Use() allows it,
  // @Body() validates and passes the DTO through.
  await withToken("super-token", async () => {
    const res = await app.handle(
      new NextRequest("http://localhost/api/apps", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "acme" }),
      })
    );
    const body = await res.json();
    check("create as SUPER_ADMIN -> 201", res.status === 201);
    check("create returns validated body", body.data?.name === "acme");
  });

  // No @AuthGuard on this route -> @CurrentUser() alone never blocks, resolves to null.
  await withToken(undefined, async () => {
    const res = await app.handle(new NextRequest("http://localhost/api/apps/public"));
    const body = await res.json();
    check("public route with no token -> 200", res.status === 200);
    check("public route's @CurrentUser() resolves to null", body.data?.user === null);
  });

  summarize("route.handle()");
}

main();
