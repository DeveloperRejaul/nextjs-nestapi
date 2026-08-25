import { Route } from "./route";

export function Post(path = "") {
  return Route("POST", path);
}
