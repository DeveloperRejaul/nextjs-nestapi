/*
 * Shared setup for test/auth-middleware.route.test.ts and
 * test/auth-middleware.action.test.ts — see those files for what's
 * actually being verified. This file just wires up one controller and
 * one app-level auth-resolving middleware that both tests exercise
 * through two different call shapes.
 *
 * Imports from ../dist (the built library), not ../src — per AGENTS.md,
 * "How to verify a change", this is meant to exercise the real built
 * output, the same way a consumer's app would.
 */
import { AsyncLocalStorage } from "node:async_hooks";
import { IsString } from "class-validator";
import {
  Controller,
  Get,
  Post,
  Use,
  AuthGuard,
  CurrentUser,
  Body,
  Response,
  createApplication,
} from "../dist/index.js";

/*
 * Simulates what a real consumer would do with next/headers' cookies()/
 * headers() inside the app-level middleware: resolve identity from
 * request-scoped storage, not from `context` itself. That's what makes
 * the SAME middleware work whether the call arrived as a real route
 * request or as a directly-bound Server Action call — Next.js's own
 * next/headers is itself AsyncLocalStorage-based under the hood, so this
 * mirrors it faithfully without needing a real Next.js server running.
 */
export const session = new AsyncLocalStorage<{ token?: string } | undefined>();

const USERS: Record<string, { id: string; role: string }> = {
  "demo-token": { id: "1", role: "ADMIN" },
  "super-token": { id: "2", role: "SUPER_ADMIN" },
};

export function withToken<T>(token: string | undefined, fn: () => T): T {
  return session.run({ token }, fn);
}

class CreateAppDto {
  @IsString()
  name!: string;
}

@Controller("/apps")
export class AppController {
  // Per-method @Use() — a consumer-defined role check, reading the
  // context.user the app-level middleware already resolved.
  @Use(async (context: any, next: () => Promise<any>) => {
    const user = context.user as { role?: string } | null | undefined;
    if (!user) return Response.Unauthorized();
    if (user.role !== "SUPER_ADMIN") return Response.Forbidden();
    return next();
  })
  @Post("")
  create(@Body(CreateAppDto) dto: CreateAppDto) {
    return Response.Created({ name: dto.name });
  }

  @AuthGuard(["ADMIN", "SUPER_ADMIN"])
  @Get("/whoami")
  whoami(@CurrentUser() user: { id: string; role: string }) {
    return Response.Ok(user);
  }

  // No @AuthGuard — @CurrentUser() alone never blocks; resolves to null
  // for an anonymous caller.
  @Get("/public")
  publicRoute(@CurrentUser() user: { id: string; role: string } | null) {
    return Response.Ok({ user });
  }
}

export const app = createApplication({ controllers: [AppController], basePath: "/api" });

// The one app-level middleware — resolves a user and sets context.user,
// exactly like the redesign's intended usage.
app.use(async (context: any, next: () => Promise<any>) => {
  const token = session.getStore()?.token;
  context.user = token ? USERS[token] ?? null : null;
  return next();
});

let passed = 0;
let failed = 0;

export function check(label: string, condition: boolean) {
  if (condition) {
    passed += 1;
    console.log(`  ok - ${label}`);
  } else {
    failed += 1;
    console.error(`  FAIL - ${label}`);
  }
}

export function summarize(suiteName: string) {
  console.log(`\n${suiteName}: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}
