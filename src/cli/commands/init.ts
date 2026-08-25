import path from "node:path";
import {
  detectProjectLayout,
  patchTsconfigDecorators,
  writeFileSafe,
} from "../fs-utils";
import {
  appTemplate,
  catchAllRouteTemplate,
  openApiRouteTemplate,
  swaggerUiRouteTemplate,
} from "../templates";

export interface InitOptions {
  swagger?: boolean;
  force?: boolean;
}

function relativeImport(fromFile: string, toFileNoExt: string): string {
  // Diff directory-to-directory, then reattach the target's basename —
  // diffing the stripped file path directly confuses e.g. "src/app.ts"
  // (a file) with "src/app/" (the App Router directory it sits next to).
  const toDir = path.dirname(toFileNoExt);
  const toBase = path.basename(toFileNoExt);
  const relDir = path.relative(path.dirname(fromFile), toDir).replace(/\\/g, "/");
  let rel = relDir === "" ? toBase : `${relDir}/${toBase}`;
  if (!rel.startsWith(".")) rel = `./${rel}`;
  return rel;
}

export function runInit(cwd: string, options: InitOptions = {}) {
  const layout = detectProjectLayout(cwd);
  const appTsPath = path.join(layout.root, layout.srcPrefix, "app.ts");
  const catchAllPath = path.join(layout.appDir, "api", "[[...route]]", "route.ts");

  const results: { file: string; status: string }[] = [];

  const appStatus = writeFileSafe(appTsPath, appTemplate(), options.force);
  results.push({ file: path.relative(cwd, appTsPath), status: appStatus });

  const catchAllStatus = writeFileSafe(
    catchAllPath,
    catchAllRouteTemplate(relativeImport(catchAllPath, appTsPath.replace(/\.ts$/, ""))),
    options.force
  );
  results.push({ file: path.relative(cwd, catchAllPath), status: catchAllStatus });

  if (options.swagger) {
    const openApiPath = path.join(layout.appDir, "api", "openapi.json", "route.ts");
    const swaggerUiPath = path.join(layout.appDir, "api-docs", "[[...file]]", "route.ts");

    const openApiStatus = writeFileSafe(
      openApiPath,
      openApiRouteTemplate(relativeImport(openApiPath, appTsPath.replace(/\.ts$/, ""))),
      options.force
    );
    results.push({ file: path.relative(cwd, openApiPath), status: openApiStatus });

    const swaggerUiStatus = writeFileSafe(swaggerUiPath, swaggerUiRouteTemplate(), options.force);
    results.push({ file: path.relative(cwd, swaggerUiPath), status: swaggerUiStatus });
  }

  const tsconfigStatus = patchTsconfigDecorators(layout.root);

  return { results, tsconfigStatus, layout };
}
