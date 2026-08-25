import { NextRequest, NextResponse } from "next/server";

import { registerController } from "./register";
import { buildRouteResponse } from "./Response";
import { composeMiddlewares } from "./compose";
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

      let matchedRoute: (typeof this.routes)[number] | undefined;
      let params: Record<string, string> = {};

      for (const route of this.routes) {
        const methodMatches = route.method === "*" || route.method === request.method;
        if (!methodMatches) continue;

        const matchedParams = matchRoute(route.path, normalizedPath);
        if (matchedParams) {
          matchedRoute = route;
          params = matchedParams;
          break;
        }
      }

      if (!matchedRoute) {
        return NextResponse.json({ message: "Not Found" }, { status: 404 });
      }
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

        return buildRouteResponse(context, result);
      };

      const result = await composeMiddlewares(context, this.middlewares, executeHandler)();

      if (result instanceof Response) {
        return result as NextResponse;
      }

      return buildRouteResponse(context, result);
    },
  };

  for (const Controller of options.controllers) {
    registerController(app, Controller);
  }

  return app;
}
