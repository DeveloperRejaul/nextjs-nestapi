/*
 * Shared metadata registries for the OpenAPI/Swagger generator
 * (src/openapi/generate-document.ts). Populated by @ApiTags,
 * @ApiOperation, @ApiResponse, and @Body(Dto) — read once at
 * doc-generation time.
 *
 * Keyed the same way as controller.ts / route.ts: by the controller
 * class itself, then by method name.
 */

export interface ApiOperationMeta {
  summary?: string;
  description?: string;
}

export interface ApiResponseMeta {
  status: number;
  description: string;
  type?: new (...args: any[]) => any;
  isArray?: boolean;
}

export const apiTagsRegistry = new Map<any, string[]>();
export const apiOperationRegistry = new Map<any, Map<string | symbol, ApiOperationMeta>>();
export const apiResponseRegistry = new Map<any, Map<string | symbol, ApiResponseMeta[]>>();
export const bodyDtoRegistry = new Map<any, Map<string | symbol, new (...args: any[]) => any>>();

export function registerBodyDto(
  target: any,
  propertyKey: string | symbol,
  DtoClass: new (...args: any[]) => any
) {
  const ctor = target.constructor;
  const methods = bodyDtoRegistry.get(ctor) ?? new Map();
  methods.set(propertyKey, DtoClass);
  bodyDtoRegistry.set(ctor, methods);
}
