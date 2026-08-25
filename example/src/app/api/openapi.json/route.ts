import { NextResponse } from "next/server";
import { generateOpenApiDocument } from "nextjs-nestapi";
import "@/app";

export async function GET() {
  return NextResponse.json(
    generateOpenApiDocument({
      title: "Example API",
      version: "1.0.0",
      description: "Auto-generated from @Controller/@Get/@Post/@Body decorators.",
    })
  );
}
