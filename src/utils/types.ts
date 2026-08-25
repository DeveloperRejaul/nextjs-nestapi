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
