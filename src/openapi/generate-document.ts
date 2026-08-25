import { validationMetadatasToSchemas } from "class-validator-jsonschema";
import { controllerRegistry } from "../decorators/controller";
import { routeRegistry } from "../decorators/route";
import {
  apiTagsRegistry,
  apiOperationRegistry,
  apiResponseRegistry,
  bodyDtoRegistry,
} from "../decorators/openapi-registry";

/*
 * Builds an OpenAPI 3.0 document from the app's existing decorator
 * metadata (@Controller/@Get/@Post/.../@Body/@ApiTags/@ApiOperation/
 * @ApiResponse). No separate doc-writing step: annotate a controller
 * and it shows up here.
 *
 * The registries are populated as a side effect of importing your
 * controllers (or your createApplication() call, which imports them
 * for you). Make sure whatever module tree backs your route handler
 * that calls this function actually imports your controllers/app —
 * otherwise the registries will be empty.
 */

export interface GenerateOpenApiDocumentOptions {
  title?: string;
  version?: string;
  description?: string;
  servers?: { url: string; description?: string }[];
  basePath?: string;
}

function toOpenApiPath(path: string) {
  // routeRegistry uses Express-style ":id" params — OpenAPI wants "{id}"
  return path.replace(/:([A-Za-z0-9_]+)/g, "{$1}");
}

function pathParams(path: string) {
  const names = [...path.matchAll(/:([A-Za-z0-9_]+)/g)].map((m) => m[1]);
  return names.map((name) => ({
    name,
    in: "path" as const,
    required: true,
    schema: { type: "string" },
  }));
}

function operationId(controllerName: string, handler: string | symbol) {
  return `${controllerName}_${String(handler)}`;
}

export function generateOpenApiDocument(options: GenerateOpenApiDocumentOptions = {}) {
  const schemas = validationMetadatasToSchemas({
    refPointerPrefix: "#/components/schemas/",
  });

  const paths: Record<string, Record<string, any>> = {};
  const tagsSeen = new Set<string>();

  for (const [ControllerClass, prefix] of controllerRegistry.entries()) {
    const routes = routeRegistry.get(ControllerClass) || [];
    const tags = apiTagsRegistry.get(ControllerClass) || [
      ControllerClass.name.replace(/Controller$/, ""),
    ];
    tags.forEach((t) => tagsSeen.add(t));

    const operations = apiOperationRegistry.get(ControllerClass);
    const responses = apiResponseRegistry.get(ControllerClass);
    const bodyDtos = bodyDtoRegistry.get(ControllerClass);

    for (const route of routes) {
      if (route.method === "*") continue; // middleware-only registrations, not a documentable route

      const fullPath = toOpenApiPath(`${prefix}${route.path}`);
      const method = route.method.toLowerCase();

      const operationMeta = operations?.get(route.handler);
      const responseMeta = responses?.get(route.handler) || [];
      const DtoClass = bodyDtos?.get(route.handler);

      const operation: Record<string, any> = {
        tags,
        operationId: operationId(ControllerClass.name, route.handler),
        summary: operationMeta?.summary || String(route.handler),
        description: operationMeta?.description,
        parameters: pathParams(route.path),
        responses: {},
      };

      if (DtoClass) {
        operation.requestBody = {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: `#/components/schemas/${DtoClass.name}` },
            },
          },
        };
      }

      if (responseMeta.length > 0) {
        for (const r of responseMeta) {
          operation.responses[r.status] = {
            description: r.description,
            ...(r.type && {
              content: {
                "application/json": {
                  schema: r.isArray
                    ? { type: "array", items: { $ref: `#/components/schemas/${r.type.name}` } }
                    : { $ref: `#/components/schemas/${r.type.name}` },
                },
              },
            }),
          };
        }
      } else {
        // Every route ends up documented even without @ApiResponse —
        // a generic fallback beats an empty responses object.
        operation.responses["200"] = { description: "Successful response" };
      }

      paths[fullPath] = paths[fullPath] || {};
      paths[fullPath][method] = operation;
    }
  }

  return {
    openapi: "3.0.0",
    info: {
      title: options.title ?? "API",
      version: options.version ?? "1.0.0",
      description: options.description,
    },
    servers: options.servers ?? [{ url: options.basePath ?? "/api" }],
    tags: [...tagsSeen].map((name) => ({ name })),
    paths,
    components: { schemas },
  };
}
