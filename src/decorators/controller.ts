import { wireParamResolvers } from "./param-registry";

export const controllerRegistry = new Map<any, string>();

export function Controller(prefix = ""): ClassDecorator {
  return (target: any) => {
    controllerRegistry.set(target, prefix);
    wireParamResolvers(target);
    return target;
  };
}
