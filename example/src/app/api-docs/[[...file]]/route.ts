import { createSwaggerUiHandler } from "nextjs-nestapi";

export const GET = createSwaggerUiHandler({ openApiUrl: "/api/openapi.json" });
