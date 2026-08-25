import fs from "node:fs";
import path from "node:path";

export interface ProjectLayout {
  root: string;
  /** "src" or "" */
  srcPrefix: string;
  /** absolute path to the app/ directory (App Router root) */
  appDir: string;
}

export function detectProjectLayout(root: string): ProjectLayout {
  const withSrc = path.join(root, "src", "app");
  const withoutSrc = path.join(root, "app");

  if (fs.existsSync(withSrc)) {
    return { root, srcPrefix: "src", appDir: withSrc };
  }

  if (fs.existsSync(withoutSrc)) {
    return { root, srcPrefix: "", appDir: withoutSrc };
  }

  throw new Error(
    "Couldn't find an app/ directory (checked ./app and ./src/app). Run this inside a Next.js App Router project."
  );
}

export function writeFileSafe(filePath: string, content: string, force = false): "written" | "skipped" {
  if (fs.existsSync(filePath) && !force) {
    return "skipped";
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
  return "written";
}

export function patchTsconfigDecorators(root: string): "patched" | "already-set" | "not-found" {
  const tsconfigPath = path.join(root, "tsconfig.json");

  if (!fs.existsSync(tsconfigPath)) {
    return "not-found";
  }

  const original = fs.readFileSync(tsconfigPath, "utf8");

  if (original.includes("experimentalDecorators")) {
    return "already-set";
  }

  const patched = original.replace(
    /"compilerOptions"\s*:\s*\{/,
    (match) => `${match}\n    "experimentalDecorators": true,\n    "emitDecoratorMetadata": true,`
  );

  if (patched === original) {
    return "not-found";
  }

  fs.writeFileSync(tsconfigPath, patched);
  return "patched";
}

export type PackageManager = "npm" | "yarn" | "pnpm" | "bun";

export function detectPackageManager(root: string): PackageManager {
  if (fs.existsSync(path.join(root, "pnpm-lock.yaml"))) return "pnpm";
  if (fs.existsSync(path.join(root, "yarn.lock"))) return "yarn";
  if (fs.existsSync(path.join(root, "bun.lockb"))) return "bun";
  return "npm";
}

export function installCommand(pm: PackageManager, packages: string[], dev = false): string {
  const list = packages.join(" ");
  switch (pm) {
    case "yarn":
      return `yarn add ${dev ? "-D " : ""}${list}`;
    case "pnpm":
      return `pnpm add ${dev ? "-D " : ""}${list}`;
    case "bun":
      return `bun add ${dev ? "-d " : ""}${list}`;
    default:
      return `npm install ${dev ? "-D " : ""}${list}`;
  }
}

export function toPascalCase(name: string): string {
  return name
    .split(/[-_\s/]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join("");
}

export function toKebabCase(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[_\s/]+/g, "-")
    .toLowerCase();
}
