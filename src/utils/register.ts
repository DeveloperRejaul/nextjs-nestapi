import { controllerRegistry } from "../decorators/controller";
import { routeRegistry } from "../decorators/route";
import { buildRouteResponse } from "./Response";
import { composeMiddlewares } from "./compose";
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

        return buildRouteResponse(c, result);
      };

      return composeMiddlewares(c, route.middlewares, executeController)();
    };

    if (route.method === "*") {
      app.all(fullPath, handler);
    } else {
      app.on(route.method, fullPath, handler);
    }
  }
}
