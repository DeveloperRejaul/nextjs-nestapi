export { Controller, controllerRegistry } from "./decorators/controller";
export { Route, Use, routeRegistry } from "./decorators/route";
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
export { registerParam, wireParamResolvers } from "./decorators/param-registry";
export type { ParamResolver, ParamResolveResult } from "./decorators/param-registry";

export { ApiTags } from "./decorators/api-tags";
export { ApiOperation } from "./decorators/api-operation";
export { ApiResponse } from "./decorators/api-response";
export {
  apiTagsRegistry,
  apiOperationRegistry,
  apiResponseRegistry,
  bodyDtoRegistry,
  registerBodyDto,
} from "./decorators/openapi-registry";
export type { ApiOperationMeta, ApiResponseMeta } from "./decorators/openapi-registry";

export { createApplication } from "./utils/createApplication";
export { registerController } from "./utils/register";
export { Response } from "./utils/Response";
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
