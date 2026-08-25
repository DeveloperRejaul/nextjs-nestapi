import { Route } from "./route";

export function Options(path = "") {
  return Route("OPTIONS", path);
}
