import { execSync } from "node:child_process";
import path from "node:path";
import { detectPackageManager, installCommand } from "../fs-utils";
import { runInit } from "./init";

export interface NewProjectOptions {
  swagger?: boolean;
}

export function runNewProject(cwd: string, projectName: string, options: NewProjectOptions = {}) {
  const targetDir = path.join(cwd, projectName);

  execSync(
    `npx create-next-app@latest ${projectName} --typescript --app --eslint --no-tailwind --src-dir --import-alias "@/*" --yes`,
    { cwd, stdio: "inherit" }
  );

  const { results, tsconfigStatus } = runInit(targetDir, { swagger: options.swagger });

  const pm = detectPackageManager(targetDir);
  const packages = ["nextjs-nestapi", "class-validator", "class-transformer"];
  if (options.swagger) {
    packages.push("class-validator-jsonschema", "swagger-ui-dist");
  }

  execSync(installCommand(pm, packages), { cwd: targetDir, stdio: "inherit" });

  return { targetDir, results, tsconfigStatus, pm };
}
