/*
 * Server-Action half of the auth-middleware redesign smoke test: every
 * call here is a controller method bound and called directly, the way
 * `export const createApp = controller.create.bind(controller)` would be
 * used from a real Next.js Server Action — app.handle() is never
 * involved. This is exactly the call shape that used to make
 * @CurrentUser() always return null (see AGENTS.md's "Auth guard"
 * section for the pre-redesign bug this fixes).
 *
 * Verifies the SAME app-level app.use() middleware and per-method
 * @Use() middleware still run, in the same order, against a synthetic
 * per-call context — see decorators/param-registry.ts. See
 * test/auth-middleware.route.test.ts for the same assertions made
 * through a real app.handle(request) dispatch instead.
 */
import { AppController, withToken, check, summarize } from "./fixtures";

// Constructing the controller and binding its methods directly is
// exactly what a Next.js Server Action file would do, e.g.:
//   export const createApp = new AppController().create.bind(...);
const controller = new AppController();
const whoami = controller.whoami.bind(controller);
const create = controller.create.bind(controller);
const publicRoute = controller.publicRoute.bind(controller);

async function main() {
  console.log("auth-middleware (Server Action, direct bound call)");

  // No token -> @AuthGuard() blocks before the handler body ever runs.
  await withToken(undefined, async () => {
    const result: any = await whoami();
    check("whoami() with no token -> Unauthorized shape", result?.statusCode === 401);
  });

  // Valid token, correct role -> @AuthGuard() passes, @CurrentUser() injects the
  // user from the synthetic context the app-level middleware set .user on.
  await withToken("demo-token", async () => {
    const result: any = await whoami();
    check(
      "whoami() with demo-token injects resolved user",
      result?.statusCode === 200 && result.data?.id === "1" && result.data?.role === "ADMIN"
    );
  });

  // ADMIN token calling the SUPER_ADMIN-only action -> per-method @Use() 403s,
  // same as the real-route case, without ever touching app.handle().
  await withToken("demo-token", async () => {
    const result: any = await create({ name: "acme" });
    check("create() as ADMIN -> Forbidden shape (per-method @Use role check)", result?.statusCode === 403);
  });

  // SUPER_ADMIN token -> global middleware resolves the user on the synthetic
  // context, per-method @Use() allows it, @Body() validates the plain payload
  // (not a RouteContext) and passes the DTO through.
  await withToken("super-token", async () => {
    const result: any = await create({ name: "acme" });
    check(
      "create() as SUPER_ADMIN -> Created shape with validated body",
      result?.statusCode === 201 && result.data?.name === "acme"
    );
  });

  // @Body() validation still runs identically in this call shape.
  await withToken("super-token", async () => {
    const result: any = await create({});
    check("create({}) -> ValidationFailed shape", result?.success === false && result?.errors?.length > 0);
  });

  // No @AuthGuard -> @CurrentUser() alone never blocks, resolves to null.
  await withToken(undefined, async () => {
    const result: any = await publicRoute();
    check("publicRoute() with no token -> user is null", result?.data?.user === null);
  });

  summarize("Server Action (direct bind)");
}

main();
