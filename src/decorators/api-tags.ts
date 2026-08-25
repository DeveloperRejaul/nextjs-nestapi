import { apiTagsRegistry } from "./openapi-registry";

/*
 * Class decorator — groups a controller's routes under a tag in the
 * generated Swagger UI. Apply alongside @Controller().
 *
 * @ApiTags('Hello')
 * @Controller('/hello')
 * export class HelloController { ... }
 */
export function ApiTags(...tags: string[]): ClassDecorator {
  return (target: any) => {
    apiTagsRegistry.set(target, tags);
    return target;
  };
}
