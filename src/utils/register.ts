import { NextResponse } from "next/server";
import { controllerRegistry } from "../decorators/controller";
import { routeRegistry, type RouteMiddleware } from "../decorators/route";
import type { NextJsApp, RouteContext } from "./types";

export function registerController(
  app: NextJsApp,
  ControllerClass: any
) {
  const prefix = controllerRegistry.get(ControllerClass);

  if (prefix === undefined) {
    return;
  }

  const routes = routeRegistry.get(ControllerClass) || [];

  const controller = new ControllerClass();

  for (const route of routes) {
    const fullPath = `${prefix}${route.path}`;

    const handler = async (c: RouteContext) => {
      const executeController = async () => {
        const result = await controller[route.handler](c);

        if (result instanceof Response) {
          return result;
        }

        return c.json(result);
      };

      if (route.middlewares?.length) {
        const composedRoute = route.middlewares.reduceRight<
          () => Promise<NextResponse | Response | any>
        >(
          (next, middleware: RouteMiddleware) => {
            return async () => middleware(c, next);
          },
          executeController
        );

        return composedRoute();
      }

      return executeController();
    };

    if (route.method === "*") {
      app.all(fullPath, handler);
    } else {
      app.on(route.method, fullPath, handler);
    }
  }
}
