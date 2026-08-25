import { NextRequest, NextResponse } from "next/server";

import { registerController } from "./register";
import { ApplicationOptions, NextJsApp, RouteContext } from "./types";

function normalizePath(path: string) {
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }

  return path.replace(/\\+/g, "/").replace(/\/$/, "") || "/";
}

function matchRoute(
  routePath: string,
  pathname: string
): Record<string, string> | null {
  const routeSegments = normalizePath(routePath)
    .split("/")
    .filter(Boolean);
  const pathSegments = normalizePath(pathname)
    .split("/")
    .filter(Boolean);

  if (routeSegments.length !== pathSegments.length) {
    return null;
  }

  const params: Record<string, string> = {};

  for (let index = 0; index < routeSegments.length; index += 1) {
    const routeSegment = routeSegments[index];
    const pathSegment = pathSegments[index];

    if (routeSegment.startsWith(":")) {
      params[routeSegment.slice(1)] = decodeURIComponent(pathSegment);
      continue;
    }

    if (routeSegment !== pathSegment) {
      return null;
    }
  }

  return params;
}

export function createApplication(options: ApplicationOptions) {
  const app: NextJsApp = {
    routes: [],
    middlewares: [],
    basePath: options.basePath ?? "/api",
    use(middleware) {
      this.middlewares.push(middleware);
    },
    on(method, path, handler) {
      this.routes.push({
        method,
        path: normalizePath(path),
        handler,
      });
    },
    all(path, handler) {
      this.routes.push({
        method: "*",
        path: normalizePath(path),
        handler,
      });
    },
    async handle(request: NextRequest) {
      const url = new URL(request.url);
      const pathname = url.pathname;
      const normalizedPath = pathname.startsWith(this.basePath)
        ? pathname.slice(this.basePath.length) || "/"
        : pathname;

      const matchedRoute = this.routes.find((route) => {
        const methodMatches =
          route.method === "*" || route.method === request.method;

        if (!methodMatches) {
          return false;
        }

        return matchRoute(route.path, normalizedPath) !== null;
      });

      if (!matchedRoute) {
        return NextResponse.json({ message: "Not Found" }, { status: 404 });
      }

      const params = matchRoute(matchedRoute.path, normalizedPath) || {};
      const context: RouteContext = {
        request,
        params,
        query: url.searchParams,
        json: (body, init) => NextResponse.json(body, init),
      };

      const executeHandler = async () => {
        const result = await matchedRoute.handler(context);

        if (result instanceof Response) {
          return result as NextResponse;
        }

        return context.json(result);
      };

      const composed = this.middlewares.reduceRight<() => Promise<NextResponse | Response | any>>(
        (next, middleware) => {
          return async () => middleware(context, next);
        },
        executeHandler
      );

      const result = await composed();

      if (result instanceof Response) {
        return result as NextResponse;
      }

      return context.json(result);
    },
  };

  for (const Controller of options.controllers) {
    registerController(app, Controller);
  }

  return app;
}
