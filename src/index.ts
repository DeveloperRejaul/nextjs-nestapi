export { Controller } from "./decorators/controller";
export { Route, Use } from "./decorators/route";
export type { RouteDefinition, RouteMiddleware } from "./decorators/route";
export { Get } from "./decorators/get";
export { Post } from "./decorators/post";
export { Put } from "./decorators/put";
export { Patch } from "./decorators/patch";
export { Delete } from "./decorators/delete";
export { Head } from "./decorators/head";
export { Options } from "./decorators/options";
export { All } from "./decorators/all";
export { Body } from "./decorators/body";
export { AuthGuard } from "./decorators/auth-guard";
export { CurrentUser } from "./decorators/current-user";

export { ApiTags } from "./decorators/api-tags";
export { ApiOperation } from "./decorators/api-operation";
export { ApiResponse } from "./decorators/api-response";
export type { ApiOperationMeta, ApiResponseMeta } from "./decorators/openapi-registry";

export { createApplication } from "./utils/createApplication";
export { registerController } from "./utils/register";
export { Response } from "./utils/Response";
export { configureAuth } from "./utils/auth";
export type { ResolveUser, ConfigureAuthOptions } from "./utils/auth";
export type {
  ApplicationOptions,
  RouteHandler,
  RouteContext,
  Middleware,
  NextJsApp,
} from "./utils/types";

export { generateOpenApiDocument } from "./openapi/generate-document";
export type { GenerateOpenApiDocumentOptions } from "./openapi/generate-document";
export { createSwaggerUiHandler } from "./openapi/swagger-ui";
export type { SwaggerUiOptions } from "./openapi/swagger-ui";
