import { Route } from "./route";

export function All(path = "") {
  return Route("*", path);
}
