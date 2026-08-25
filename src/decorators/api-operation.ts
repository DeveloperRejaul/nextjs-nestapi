import { apiOperationRegistry, type ApiOperationMeta } from "./openapi-registry";

/*
 * Method decorator — human-readable summary/description for one route,
 * shown in the generated Swagger UI. Doesn't affect runtime behavior.
 *
 * @ApiOperation({ summary: 'Create a hello' })
 * @Post()
 * create(@Body(CreateHelloDto) dto: CreateHelloDto) { ... }
 */
export function ApiOperation(meta: ApiOperationMeta): MethodDecorator {
  return (target: any, propertyKey) => {
    const ctor = target.constructor;
    const methods = apiOperationRegistry.get(ctor) ?? new Map();
    methods.set(propertyKey, meta);
    apiOperationRegistry.set(ctor, methods);
  };
}
