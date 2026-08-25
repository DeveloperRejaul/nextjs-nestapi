#!/usr/bin/env node
import { runInit } from "./cli/commands/init";
import { runGenerateController } from "./cli/commands/generate";
import { runNewProject } from "./cli/commands/new";

const HELP = `nextjs-nestapi — NestJS-style controllers for Next.js App Router

Usage:
  nextjs-nestapi init [--swagger] [--force]
      Wire app.ts + the catch-all API route into the current project.
      --swagger   also add /api/openapi.json and /api-docs routes
      --force     overwrite files that already exist

  nextjs-nestapi generate controller <name> [--force]
  nextjs-nestapi g controller <name> [--force]
      Scaffold src/features/<name>/{controller.ts,dto.ts} and register
      the controller in app.ts.

  nextjs-nestapi new <project-name> [--swagger]
      Create a brand new Next.js app (via create-next-app) already wired
      with nextjs-nestapi.

  nextjs-nestapi --help
`;

function hasFlag(args: string[], flag: string): boolean {
  return args.includes(flag);
}

function printResults(results: { file: string; status: string }[]) {
  for (const r of results) {
    const marker = r.status === "written" ? "created" : r.status === "registered" ? "updated" : r.status;
    console.log(`  ${marker === "skipped" ? "skip  " : "create"} ${r.file}${marker === "skipped" ? " (already exists)" : ""}`);
  }
}

function main() {
  const [, , command, ...rest] = process.argv;
  const cwd = process.cwd();

  if (!command || command === "--help" || command === "-h") {
    console.log(HELP);
    return;
  }

  if (command === "init") {
    const { results, tsconfigStatus } = runInit(cwd, {
      swagger: hasFlag(rest, "--swagger"),
      force: hasFlag(rest, "--force"),
    });
    printResults(results);
    if (tsconfigStatus === "patched") {
      console.log("  update tsconfig.json (added experimentalDecorators/emitDecoratorMetadata)");
    } else if (tsconfigStatus === "not-found") {
      console.log(
        "  warn   couldn't patch tsconfig.json automatically — add \"experimentalDecorators\": true and \"emitDecoratorMetadata\": true to compilerOptions yourself"
      );
    }
    console.log("\nNext: npm install nextjs-nestapi class-validator class-transformer");
    return;
  }

  if (command === "generate" || command === "g") {
    const [type, name] = rest;
    if (type !== "controller" || !name) {
      console.error("Usage: nextjs-nestapi generate controller <name>");
      process.exitCode = 1;
      return;
    }
    const { results, registerStatus, className, appTsPath } = runGenerateController(cwd, name, {
      force: hasFlag(rest, "--force"),
    });
    printResults(results);
    if (registerStatus === "registered") {
      console.log(`  update ${appTsPath} (registered ${className}Controller)`);
    } else if (registerStatus === "already-registered") {
      console.log(`  skip   ${appTsPath} (${className}Controller already registered)`);
    } else if (registerStatus === "not-found") {
      console.log(`  warn   ${appTsPath} not found — run "nextjs-nestapi init" first, or register ${className}Controller manually`);
    } else if (registerStatus === "unrecognized-shape") {
      console.log(`  warn   couldn't auto-register — add ${className}Controller to the controllers array in ${appTsPath} yourself`);
    }
    return;
  }

  if (command === "new") {
    const [projectName] = rest;
    if (!projectName) {
      console.error("Usage: nextjs-nestapi new <project-name>");
      process.exitCode = 1;
      return;
    }
    const { targetDir, results, pm } = runNewProject(cwd, projectName, {
      swagger: hasFlag(rest, "--swagger"),
    });
    printResults(results);
    console.log(`\nDone. Next:\n  cd ${projectName}\n  ${pm === "npm" ? "npm run" : pm} dev`);
    void targetDir;
    return;
  }

  console.error(`Unknown command: ${command}\n`);
  console.log(HELP);
  process.exitCode = 1;
}

try {
  main();
} catch (err: any) {
  console.error(`\nError: ${err?.message ?? err}`);
  process.exitCode = 1;
}
