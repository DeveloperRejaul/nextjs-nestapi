import { controllerRegistry } from "../decorators/controller";
import { routeRegistry } from "../decorators/route";
import { buildRouteResponse } from "./Response";
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

    /*
     * Middleware (both app-level app.use() and this route's own @Use())
     * already runs as part of calling controller[route.handler] itself
     * — see decorators/param-registry.ts's wireControllerMethods(). This
     * handler just invokes it and finalizes whatever comes back.
     */
    const handler = async (c: RouteContext) => {
      const result = await controller[route.handler](c);

      if (result instanceof Response) {
        return result;
      }

      return buildRouteResponse(c, result);
    };

    if (route.method === "*") {
      app.all(fullPath, handler);
    } else {
      app.on(route.method, fullPath, handler);
    }
  }
}
