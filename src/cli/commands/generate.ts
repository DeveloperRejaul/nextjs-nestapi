import fs from "node:fs";
import path from "node:path";
import { detectProjectLayout, toKebabCase, toPascalCase, writeFileSafe } from "../fs-utils";
import { controllerTemplate, dtoTemplate } from "../templates";

export interface GenerateControllerOptions {
  force?: boolean;
}

function tryRegisterController(
  appTsPath: string,
  className: string,
  importPath: string
): "registered" | "already-registered" | "not-found" | "unrecognized-shape" {
  if (!fs.existsSync(appTsPath)) {
    return "not-found";
  }

  let content = fs.readFileSync(appTsPath, "utf8");

  if (content.includes(`${className}Controller`)) {
    return "already-registered";
  }

  const controllersMatch = content.match(/controllers\s*:\s*\[([^\]]*)\]/);
  if (!controllersMatch) {
    return "unrecognized-shape";
  }

  const importLine = `import { ${className}Controller } from "${importPath}";\n`;
  content = importLine + content;

  content = content.replace(/controllers\s*:\s*\[([^\]]*)\]/, (_match, inner: string) => {
    const trimmed = inner.trim();
    const nextInner = trimmed.length === 0 ? `${className}Controller` : `${trimmed}, ${className}Controller`;
    return `controllers: [${nextInner}]`;
  });

  fs.writeFileSync(appTsPath, content);
  return "registered";
}

export function runGenerateController(cwd: string, name: string, options: GenerateControllerOptions = {}) {
  const layout = detectProjectLayout(cwd);
  const className = toPascalCase(name);
  const kebabName = toKebabCase(name);

  const featureDir = path.join(layout.root, layout.srcPrefix, "features", kebabName);
  const controllerPath = path.join(featureDir, "controller.ts");
  const dtoPath = path.join(featureDir, "dto.ts");
  const appTsPath = path.join(layout.root, layout.srcPrefix, "app.ts");

  const results: { file: string; status: string }[] = [];

  const controllerStatus = writeFileSafe(controllerPath, controllerTemplate(className, kebabName), options.force);
  results.push({ file: path.relative(cwd, controllerPath), status: controllerStatus });

  const dtoStatus = writeFileSafe(dtoPath, dtoTemplate(className), options.force);
  results.push({ file: path.relative(cwd, dtoPath), status: dtoStatus });

  let importPath = path.relative(path.dirname(appTsPath), controllerPath.replace(/\.ts$/, "")).replace(/\\/g, "/");
  if (!importPath.startsWith(".")) importPath = `./${importPath}`;

  const registerStatus = tryRegisterController(appTsPath, className, importPath);

  return { results, registerStatus, className, appTsPath: path.relative(cwd, appTsPath) };
}
