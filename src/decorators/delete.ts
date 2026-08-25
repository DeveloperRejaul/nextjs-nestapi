import { Route } from "./route";

export function Delete(path = "") {
  return Route("DELETE", path);
}
