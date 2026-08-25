import { Route } from "./route";

export function Head(path = "") {
  return Route("HEAD", path);
}
