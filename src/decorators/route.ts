/* eslint-disable @typescript-eslint/no-explicit-any */
export type RouteMiddleware = (
  context: any,
  next: () => Promise<any>
) => Promise<any> | any;

export interface RouteDefinition {
  method: string;
  path: string;
  handler: string | symbol;
  middlewares?: RouteMiddleware[];
}

export const routeRegistry = new Map<any, RouteDefinition[]>();

export function Route(
  method: string,
  path = ""
): MethodDecorator {
  return (target, propertyKey) => {
    const controller = target.constructor;
    const routes = routeRegistry.get(controller) ?? [];
    const route = routes.find((entry) => entry.handler === propertyKey);

    if (route) {
      route.method = method;
      route.path = path;
    } else {
      routes.push({
        method,
        path,
        handler: propertyKey,
      });
    }

    routeRegistry.set(controller, routes);
  };
}

export function Use(middleware: RouteMiddleware): MethodDecorator {
  return (target, propertyKey) => {
    const controller = target.constructor;
    const routes = routeRegistry.get(controller) ?? [];
    let route = routes.find((entry) => entry.handler === propertyKey);

    if (!route) {
      route = {
        method: "*",
        path: "",
        handler: propertyKey,
        middlewares: [middleware],
      };
      routes.push(route);
    } else {
      route.middlewares = [...(route.middlewares ?? []), middleware];
    }

    routeRegistry.set(controller, routes);
  };
}
