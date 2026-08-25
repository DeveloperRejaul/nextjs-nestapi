import { Route } from "./route";

export function Patch(path = "") {
  return Route("PATCH", path);
}
