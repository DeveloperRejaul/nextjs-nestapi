import { NextRequest, NextResponse } from "next/server";

export interface ApplicationOptions {
  controllers: any[];
  basePath?: string;
}

export type RouteHandler = (
  context: RouteContext
) => Promise<NextResponse | Response | any> | NextResponse | Response | any;

export interface RouteContext {
  request: NextRequest;
  params: Record<string, string>;
  query: URLSearchParams;
  json: (body: any, init?: ResponseInit) => NextResponse;
  /*
   * Not set by the library itself — a middleware (app-level app.use() or
   * a per-method @Use()/@AuthGuard()) is expected to set this, and
   * @CurrentUser() reads it back. See decorators/param-registry.ts.
   */
  user?: unknown;
}

export type Middleware = (
  context: RouteContext,
  next: () => Promise<NextResponse | Response | any>
) => Promise<NextResponse | Response | any> | NextResponse | Response | any;

export interface NextJsApp {
  routes: Array<{
    method: string;
    path: string;
    handler: RouteHandler;
  }>;
  middlewares: Middleware[];
  basePath: string;
  use: (middleware: Middleware) => void;
  on: (method: string, path: string, handler: RouteHandler) => void;
  all: (path: string, handler: RouteHandler) => void;
  handle: (request: NextRequest) => Promise<NextResponse>;
}
