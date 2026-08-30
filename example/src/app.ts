import { createApplication } from "nextjs-nestapi";
import { HelloController } from "./features/hello/controller";

export const app = createApplication({
  controllers: [HelloController],
});

// App-level middleware — runs before every controller method, for both a
// real route call and a directly-bound Server Action call. Resolving the
// user here (rather than in a per-decorator resolver) is what lets
// @CurrentUser()/@AuthGuard() work identically in both call shapes: set
// context.user, and everything downstream just reads it.
app.use(async (context, next) => {
  // context.request only exists for a real route call — a directly-bound
  // Server Action call gets a synthetic context instead (no request to
  // read a header off). A middleware that needs to resolve identity in
  // both call shapes should prefer next/headers' cookies()/headers(),
  // which work the same way in either case without touching `context`.
  const token = context.request?.headers.get("authorization")?.replace("Bearer ", "");
  context.user = token === "demo-token" ? { id: "1", role: "ADMIN" } : null;
  return next();
});
