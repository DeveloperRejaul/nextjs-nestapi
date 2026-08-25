# nextjs-nestapi

**Write Next.js App Router API routes in NestJS style** — decorator-based controllers,
DTO validation, middleware, and auto-generated OpenAPI/Swagger docs, all dispatched through
a single catch-all `route.ts`. Ships with a CLI to scaffold new projects and features.

[![License: ISC](https://img.shields.io/badge/license-ISC-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-App%20Router-000000?logo=next.js&logoColor=white)](https://nextjs.org/)

---

## Table of contents

- [Why nextjs-nestapi](#why-nextjs-nestapi)
- [Features](#features)
- [Installation](#installation)
- [Quick start](#quick-start)
- [CLI](#cli)
- [Core concepts](#core-concepts)
  - [Controllers & routing](#controllers--routing)
  - [Route parameters](#route-parameters)
  - [DTO validation](#dto-validation)
  - [Middleware](#middleware)
  - [Application configuration](#application-configuration)
  - [Handler return values](#handler-return-values)
- [OpenAPI / Swagger docs](#openapi--swagger-docs)
- [API reference](#api-reference)
- [Project structure](#project-structure)
- [Requirements](#requirements)
- [Limitations](#limitations)
- [Example project](#example-project)
- [Contributing](#contributing)
- [License](#license)

---

## Why nextjs-nestapi

Next.js App Router API routes are fast but low-level: every endpoint is its own file,
request parsing and validation are manual, and there's no shared structure for larger
APIs. NestJS solves this with controllers, decorators, and DTOs — but pulling in a full
Nest runtime (modules, a DI container, its own HTTP adapter) inside a Next.js app is a lot
of machinery for what is usually just "organize my API routes."

`nextjs-nestapi` is the middle ground: NestJS-style ergonomics, implemented as a thin layer
over Next.js's own `NextRequest`/`NextResponse`, with no DI container and no second
framework running alongside Next.js. One catch-all route dispatches to plain
`@Controller` classes.

## Features

- **Decorator-based routing** — `@Controller`, `@Get`/`@Post`/`@Put`/`@Patch`/`@Delete`/`@Head`/`@Options`/`@All`, with Express-style `:param` path segments.
- **DTO validation** — `@Body(DtoClass)` parses and validates the JSON request body with `class-validator`/`class-transformer`, and returns a structured validation-error response automatically on failure.
- **Middleware** — global (`app.use`) and per-route (`@Use`), composed around the handler in order.
- **One catch-all route** — a single `app/api/[[...route]]/route.ts` dispatches to every controller; no per-endpoint route files to maintain.
- **OpenAPI / Swagger docs** — `@ApiTags`/`@ApiOperation`/`@ApiResponse` plus `generateOpenApiDocument()` build a spec straight from your decorators and DTOs; `createSwaggerUiHandler()` serves the Swagger UI from your own `node_modules` — no vendored assets, no CDN.
- **CLI scaffolding** — `nextjs-nestapi new`, `init`, and `generate controller` bootstrap a project or add a feature without hand-writing boilerplate.
- **Plain Web `Response`/`NextResponse` support** — return a plain value (auto-serialized to JSON) or a `Response` instance for full control over status codes and headers.
- **Zero DI container** — controllers are plain classes you construct however you like; nothing to register beyond `createApplication({ controllers: [...] })`.
- **Written in TypeScript** — full type definitions ship with the package, no `@types` package needed.

## Installation

```bash
npm install nextjs-nestapi class-validator class-transformer
```

`class-validator` and `class-transformer` are peer dependencies — `@Body()` uses them for
DTO validation, so they must be installed in your project alongside this package.

`tsconfig.json` needs decorator support enabled:

```jsonc
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

## Quick start

**1. Define a DTO and a controller.**

```ts
// src/features/hello/dto.ts
import { IsInt, IsString, Min } from "class-validator";

export class CreateHelloDto {
  @IsString()
  name!: string;

  @IsInt()
  @Min(0)
  age!: number;
}
```

```ts
// src/features/hello/controller.ts
import { Controller, Get, Post, Body, type RouteContext } from "nextjs-nestapi";
import { CreateHelloDto } from "./dto";

@Controller("/hello")
export class HelloController {
  @Get("")
  list() {
    return { message: "hello world" };
  }

  @Get("/:id")
  getOne(context: RouteContext) {
    return { id: context.params.id };
  }

  @Post("")
  create(@Body(CreateHelloDto) dto: CreateHelloDto) {
    return { created: dto };
  }
}
```

**2. Register the controller.**

```ts
// src/app.ts
import { createApplication } from "nextjs-nestapi";
import { HelloController } from "./features/hello/controller";

export const app = createApplication({
  controllers: [HelloController],
  basePath: "/api", // default
});
```

**3. Mount it behind a single catch-all route.**

```ts
// src/app/api/[[...route]]/route.ts
import { NextRequest } from "next/server";
import { app } from "@/app";

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
```

`@Controller("/hello")` + `@Get("/:id")` resolves against `${basePath}/hello/:id` — here,
`GET /api/hello/:id`. Steps 2–3 are exactly what `npx nextjs-nestapi init` generates for you.

## CLI

```bash
# Brand new Next.js app, already wired with nextjs-nestapi
npx nextjs-nestapi new my-app
npx nextjs-nestapi new my-app --swagger   # also wires /api/openapi.json + /api-docs

# Wire an existing Next.js App Router project instead
npx nextjs-nestapi init
npx nextjs-nestapi init --swagger

# Scaffold a feature controller + DTO, auto-registered in app.ts
npx nextjs-nestapi generate controller student
npx nextjs-nestapi g controller student   # alias
```

| Command | What it does |
| --- | --- |
| `new <name> [--swagger]` | Runs `create-next-app`, then wires `app.ts` + the catch-all route, patches `tsconfig.json`, and installs dependencies. |
| `init [--swagger] [--force]` | Wires `app.ts` + the catch-all route into the **current** App Router project (`app/` or `src/app/`) and patches `tsconfig.json`. |
| `generate controller <name>` / `g controller <name>` | Scaffolds `src/features/<name>/{controller.ts,dto.ts}` and registers the controller in `app.ts`. |

`init`/`new`/`generate` never overwrite an existing file unless you pass `--force`. Add
`--swagger` to also scaffold `/api/openapi.json` and `/api-docs`.

## Core concepts

### Controllers & routing

`@Controller(prefix)` registers a class and wires up its parameter decorators. Every
method decorated with an HTTP-verb decorator becomes a route:

```ts
import { Controller, Get, Post, Put, Patch, Delete, Head, Options, All } from "nextjs-nestapi";

@Controller("/posts")
export class PostController {
  @Get("")       list() { /* GET /api/posts */ }
  @Get("/:id")   getOne() { /* GET /api/posts/:id */ }
  @Post("")      create() { /* POST /api/posts */ }
  @Put("/:id")   replace() { /* PUT /api/posts/:id */ }
  @Patch("/:id") update() { /* PATCH /api/posts/:id */ }
  @Delete("/:id") remove() { /* DELETE /api/posts/:id */ }
}
```

`@Head`, `@Options`, and `@All` (matches every HTTP method) are available for the less
common cases. Path segments prefixed with `:` (e.g. `/:id`) are captured into
`context.params`.

### Route parameters

A route method receives a single `RouteContext` argument (unless you're using `@Body`,
see below):

```ts
export interface RouteContext {
  request: NextRequest;
  params: Record<string, string>;
  query: URLSearchParams;
  json: (body: any, init?: ResponseInit) => NextResponse;
}
```

```ts
@Get("/:id")
getOne(context: RouteContext) {
  const { id } = context.params;
  const sort = context.query.get("sort");
  return { id, sort };
}
```

### DTO validation

`@Body(DtoClass)` parses the JSON request body, runs it through `class-validator`, and
injects the validated + transformed instance as the argument:

```ts
import { Body } from "nextjs-nestapi";
import { CreateHelloDto } from "./dto";

@Post("")
create(@Body(CreateHelloDto) dto: CreateHelloDto) {
  return { created: dto };
}
```

On validation failure, the route short-circuits and returns a structured error payload
without your handler running:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [{ "field": "age", "message": "age must not be less than 0" }]
}
```

File/`FileList` fields on the parsed body are preserved as-is (not passed through
`class-transformer`'s type coercion), so file-upload DTOs work without extra config.

### Middleware

Global middleware runs for every route, in registration order:

```ts
app.use(async (context, next) => {
  console.log(context.request.method, context.request.url);
  return next();
});
```

Per-route middleware via `@Use`, composed around that single route's handler:

```ts
import { Use } from "nextjs-nestapi";

@Controller("/hello")
export class HelloController {
  @Use(async (context, next) => {
    if (!context.request.headers.get("authorization")) {
      return context.json({ message: "Unauthorized" }, { status: 401 });
    }
    return next();
  })
  @Get("")
  list() {
    return { message: "hello world" };
  }
}
```

### Application configuration

```ts
createApplication({
  controllers: [HelloController, PostController],
  basePath: "/api", // default; routes are matched relative to this prefix
});
```

### Handler return values

A controller method can return:

- A plain value — serialized with `NextResponse.json(value)`.
- A `Response`/`NextResponse` instance — returned as-is. Use
  `context.json(value, { status: 201 })` for a custom status code or headers.

## OpenAPI / Swagger docs

Add `class-validator-jsonschema` (turns your DTOs into JSON Schema) and `swagger-ui-dist`
(the Swagger UI assets, served from your own `node_modules` — nothing vendored in this
package, nothing fetched from a CDN):

```bash
npm install class-validator-jsonschema swagger-ui-dist
```

Annotate controllers (optional — routes are documented either way):

```ts
import { Controller, Get, Post, Body, ApiTags, ApiOperation, ApiResponse } from "nextjs-nestapi";

@ApiTags("Hello")
@Controller("/hello")
export class HelloController {
  @ApiOperation({ summary: "Create a hello" })
  @ApiResponse({ status: 200, description: "Created" })
  @Post("")
  create(@Body(CreateHelloDto) dto: CreateHelloDto) {
    return { created: dto };
  }
}
```

Expose the generated OpenAPI document. This route must import your `app.ts` (or your
controllers directly) so the decorator registries are populated before the document is
built:

```ts
// app/api/openapi.json/route.ts
import { NextResponse } from "next/server";
import { generateOpenApiDocument } from "nextjs-nestapi";
import "@/app";

export async function GET() {
  return NextResponse.json(
    generateOpenApiDocument({ title: "My API", version: "1.0.0" })
  );
}
```

Serve the Swagger UI itself behind a catch-all route:

```ts
// app/api-docs/[[...file]]/route.ts
import { createSwaggerUiHandler } from "nextjs-nestapi";

export const GET = createSwaggerUiHandler({ openApiUrl: "/api/openapi.json" });
```

**Required:** tell Next.js not to bundle `swagger-ui-dist` — it's resolved with a dynamic
`import()` at request time, which Turbopack and webpack both refuse to follow unless the
package is marked external:

```ts
// next.config.ts
const nextConfig: NextConfig = {
  serverExternalPackages: ["swagger-ui-dist"],
};
```

Visit `/api-docs` for the UI, `/api/openapi.json` for the raw document.

## API reference

### Decorators

| Decorator | Kind | Description |
| --- | --- | --- |
| `@Controller(prefix?)` | class | Registers the controller and its route prefix. |
| `@Get`/`@Post`/`@Put`/`@Patch`/`@Delete`/`@Head`/`@Options`(path?) | method | Bind a method to an HTTP verb + path. |
| `@All(path?)` | method | Bind a method to every HTTP verb. |
| `@Use(middleware)` | method | Attach middleware to a single route. |
| `@Body(DtoClass)` | parameter | Parse + validate the JSON body, inject the DTO instance. |
| `@ApiTags(...tags)` | class | Group a controller's routes under a tag in the OpenAPI doc. |
| `@ApiOperation({ summary?, description? })` | method | Human-readable summary/description for a route. |
| `@ApiResponse({ status, description, type?, isArray? })` | method | Document a possible response (repeatable). |

### Functions

| Export | Signature | Description |
| --- | --- | --- |
| `createApplication` | `(options: ApplicationOptions) => NextJsApp` | Builds the router that dispatches to your registered controllers. |
| `generateOpenApiDocument` | `(options?: GenerateOpenApiDocumentOptions) => object` | Builds an OpenAPI 3.0 document from your decorator metadata. |
| `createSwaggerUiHandler` | `(options?: SwaggerUiOptions) => RouteHandler` | Returns a `GET` handler that serves the Swagger UI + its static assets. |
| `registerController` | `(app: NextJsApp, ControllerClass) => void` | Lower-level primitive `createApplication` uses internally. |

### Types

`RouteContext`, `NextJsApp`, `Middleware`, `RouteHandler`, `ApplicationOptions`,
`RouteDefinition`, `RouteMiddleware`, `ApiOperationMeta`, `ApiResponseMeta`,
`GenerateOpenApiDocumentOptions`, `SwaggerUiOptions` are all exported for consumers who
want to type their own helpers around them.

### `Response` helper

A small set of response-shape helpers used internally by `@Body()` validation failures,
also available for your own handlers:

```ts
import { Response } from "nextjs-nestapi";

Response.NotFound();               // { success: false, message: "Not Found" }
Response.Unauthorized();           // { success: false, message: "Unauthorized" }
Response.Forbidden();              // { success: false, message: "Forbidden" }
Response.ValidationFailed(errors); // { success: false, message: "Validation failed", errors }
Response.EmptyPage();              // paginated-list shape with an empty data array
Response.BadPage(message);         // paginated-list shape signalling an invalid page
```

## Project structure

```
src/
├── index.ts                 # public entry point (barrel export)
├── cli.ts                   # CLI entry point (bin: nextjs-nestapi)
├── cli/
│   ├── commands/             # init, generate, new
│   ├── fs-utils.ts           # project-layout detection, file writers
│   └── templates.ts          # scaffolded file contents
├── decorators/                # @Controller, @Get/@Post/…, @Body, @Use, @Api*
├── openapi/                   # generateOpenApiDocument, createSwaggerUiHandler
└── utils/                     # createApplication, registerController, RouteContext, Response
```

## Requirements

| Package | Role |
| --- | --- |
| `next` | Peer dependency — App Router only. |
| `react` | Peer dependency (matches Next.js's own requirement). |
| `class-validator`, `class-transformer` | Required for `@Body()` DTO validation. |
| `class-validator-jsonschema` | Required only if you use `generateOpenApiDocument()`. |
| `swagger-ui-dist` | Required only if you use `createSwaggerUiHandler()`. |

## Limitations

- **App Router only.** The Pages Router (`pages/api/*`) is not supported.
- **No dependency-injection container.** Controllers are plain classes; construct their
  dependencies yourself (constructor defaults, a service locator, whatever your app
  already uses).
- **No modules/guards/pipes/interceptors.** The decorator surface intentionally covers
  routing, DTO validation, and middleware — not the full NestJS feature set.

## Example project

A complete, runnable example (routing, DTO validation, middleware, and the OpenAPI/Swagger
setup) lives in [`example/`](example) — a real `create-next-app` project with
`nextjs-nestapi` wired in.

```bash
cd example
npm run dev
```

Then open `http://localhost:3000` for links to the API routes and `/api-docs` for the
Swagger UI.

## Contributing

Issues and pull requests are welcome at
[github.com/DeveloperRejaul/nextjs-nestapi](https://github.com/DeveloperRejaul/nextjs-nestapi).

```bash
npm run build   # tsup — builds dist/index.{js,mjs,d.ts} and dist/cli.js
```

## License

[ISC](LICENSE) © Rejaul Karim
