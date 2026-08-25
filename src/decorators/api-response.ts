import { apiResponseRegistry, type ApiResponseMeta } from "./openapi-registry";

/*
 * Method decorator — documents one possible response for a route.
 * Repeatable: stack multiple @ApiResponse() calls to document several
 * status codes for the same method.
 *
 * @ApiResponse({ status: 201, description: 'Hello created', type: HelloDto })
 * @ApiResponse({ status: 401, description: 'Unauthorized' })
 * @Post()
 * create(...) { ... }
 */
export function ApiResponse(meta: ApiResponseMeta): MethodDecorator {
  return (target: any, propertyKey) => {
    const ctor = target.constructor;
    const methods = apiResponseRegistry.get(ctor) ?? new Map<string | symbol, ApiResponseMeta[]>();
    const responses = methods.get(propertyKey) ?? [];
    responses.push(meta);
    methods.set(propertyKey, responses);
    apiResponseRegistry.set(ctor, methods);
  };
}
