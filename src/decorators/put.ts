import { Route } from "./route";

export function Put(path = "") {
  return Route("PUT", path);
}
