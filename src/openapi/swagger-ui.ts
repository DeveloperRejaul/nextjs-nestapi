import fs from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";

/*
 * Serves the Swagger UI single-page app straight out of the
 * swagger-ui-dist package installed in the consuming project — no
 * vendored copies in this library, no CDN. Requires `swagger-ui-dist`
 * to be installed as a dependency of the app (it's an optional peer
 * dependency of this package).
 *
 * Mount behind a catch-all route so both the HTML shell and its
 * static assets (swagger-ui-bundle.js, swagger-ui.css, ...) are
 * served from the same handler:
 *
 *   // app/api-docs/[[...file]]/route.ts
 *   export const GET = createSwaggerUiHandler({ openApiUrl: "/api/openapi.json" });
 */

export interface SwaggerUiOptions {
  /** URL the UI fetches the OpenAPI document from. Default: "/api/openapi.json". */
  openApiUrl?: string;
  /** Page <title>. Default: "API Docs". */
  title?: string;
}

const ASSET_CONTENT_TYPES: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".png": "image/png",
  ".map": "application/json; charset=utf-8",
};

const ALLOWED_ASSETS = new Set([
  "swagger-ui.css",
  "swagger-ui-bundle.js",
  "swagger-ui-standalone-preset.js",
  "favicon-16x16.png",
  "favicon-32x32.png",
]);

async function resolveSwaggerUiDistPath(): Promise<string> {
  try {
    // A dynamic import() (rather than require()) so bundlers that don't
    // support Node's dynamic `require` in server route handlers (e.g.
    // Turbopack) can still resolve this — pair with `serverExternalPackages:
    // ['swagger-ui-dist']` in next.config.ts so it isn't bundled at all.
    const swaggerUiDist: any = await import("swagger-ui-dist");
    const mod = swaggerUiDist.default ?? swaggerUiDist;
    return mod.absolutePath();
  } catch {
    throw new Error(
      "createSwaggerUiHandler() requires the 'swagger-ui-dist' package. Install it with: npm install swagger-ui-dist. " +
        "Also add it to serverExternalPackages in next.config.ts: { serverExternalPackages: ['swagger-ui-dist'] }"
    );
  }
}

function renderHtml(openApiUrl: string, title: string, basePath: string) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>${title}</title>
    <base href="${basePath}/" />
    <link rel="stylesheet" type="text/css" href="./swagger-ui.css" />
    <link rel="icon" type="image/png" href="./favicon-32x32.png" sizes="32x32" />
    <link rel="icon" type="image/png" href="./favicon-16x16.png" sizes="16x16" />
    <style>
      html, body { margin: 0; padding: 0; height: 100%; background: #fafafa; }
      #swagger-ui { max-width: 1460px; margin: 0 auto; }
      .swagger-ui .topbar { display: none; }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="./swagger-ui-bundle.js" charset="UTF-8"></script>
    <script src="./swagger-ui-standalone-preset.js" charset="UTF-8"></script>
    <script>
      window.onload = () => {
        window.ui = SwaggerUIBundle({
          url: ${JSON.stringify(openApiUrl)},
          dom_id: '#swagger-ui',
          presets: [
            SwaggerUIBundle.presets.apis,
            SwaggerUIStandalonePreset,
          ],
          layout: 'StandaloneLayout',
          deepLinking: true,
          docExpansion: 'list',
          filter: true,
          persistAuthorization: true,
        });
      };
    </script>
  </body>
</html>`;
}

export function createSwaggerUiHandler(options: SwaggerUiOptions = {}) {
  const openApiUrl = options.openApiUrl ?? "/api/openapi.json";
  const title = options.title ?? "API Docs";

  return async function GET(
    request: NextRequest,
    context: { params: Promise<{ file?: string[] }> }
  ) {
    const { file } = await context.params;
    const segments = file ?? [];

    if (segments.length === 0) {
      // A <base> tag anchored to the actual request path — the UI can be
      // mounted at any path (e.g. "/api-docs"), and without a trailing
      // slash in the URL, "./swagger-ui.css" would otherwise resolve
      // against the parent path instead of this one.
      const basePath = request.nextUrl.pathname.replace(/\/$/, "");
      return new NextResponse(renderHtml(openApiUrl, title, basePath), {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    const requested = segments.join("/");

    if (!ALLOWED_ASSETS.has(requested)) {
      return NextResponse.json({ message: "Not Found" }, { status: 404 });
    }

    const distPath = await resolveSwaggerUiDistPath();
    const filePath = path.join(distPath, requested);
    const body = fs.readFileSync(filePath);
    const ext = path.extname(requested);

    return new NextResponse(new Uint8Array(body), {
      headers: {
        "content-type": ASSET_CONTENT_TYPES[ext] ?? "application/octet-stream",
      },
    });
  };
}
