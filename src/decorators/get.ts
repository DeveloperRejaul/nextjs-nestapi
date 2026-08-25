import { Route } from "./route";

export function Get(path = "") {
  return Route("GET", path);
}
