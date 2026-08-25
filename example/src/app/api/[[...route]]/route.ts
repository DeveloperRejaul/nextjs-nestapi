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
