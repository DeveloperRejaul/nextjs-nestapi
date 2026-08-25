export function appTemplate(): string {
  return `import { createApplication } from "nextjs-nestapi";

export const app = createApplication({
  controllers: [],
});
`;
}

export function catchAllRouteTemplate(appImportPath: string): string {
  return `import { NextRequest } from "next/server";
import { app } from "${appImportPath}";

async function handleRequest(request: NextRequest) {
  return app.handle(request);
}

export const GET = handleRequest;
export const POST = handleRequest;
export const PUT = handleRequest;
export const PATCH = handleRequest;
export const DELETE = handleRequest;
export const OPTIONS = handleRequest;
export const HEAD = handleRequest;
`;
}

export function openApiRouteTemplate(appImportPath: string): string {
  return `import { NextResponse } from "next/server";
import { generateOpenApiDocument } from "nextjs-nestapi";
import "${appImportPath}";

export async function GET() {
  return NextResponse.json(
    generateOpenApiDocument({ title: "API", version: "1.0.0" })
  );
}
`;
}

export function swaggerUiRouteTemplate(): string {
  return `import { createSwaggerUiHandler } from "nextjs-nestapi";

export const GET = createSwaggerUiHandler({ openApiUrl: "/api/openapi.json" });
`;
}

export function controllerTemplate(className: string, kebabName: string): string {
  return `import { Controller, Get, Post, Body, type RouteContext } from "nextjs-nestapi";
import { Create${className}Dto } from "./dto";

@Controller("/${kebabName}")
export class ${className}Controller {
  @Get("")
  list() {
    return { message: "${kebabName} list" };
  }

  @Get("/:id")
  getOne(context: RouteContext) {
    return { id: context.params.id };
  }

  @Post("")
  create(@Body(Create${className}Dto) dto: Create${className}Dto) {
    return { created: dto };
  }
}
`;
}

export function dtoTemplate(className: string): string {
  return `import { IsString } from "class-validator";

export class Create${className}Dto {
  @IsString()
  name!: string;
}
`;
}
