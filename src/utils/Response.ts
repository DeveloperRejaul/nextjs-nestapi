import { NextResponse } from "next/server";
import type { RouteContext } from "./types";

/*
 * Response.XXX() bodies carry their intended HTTP status as a visible
 * `statusCode` field (NestJS's own exception bodies do the same). This
 * keeps the object plain and JSON-serializable either way it's used:
 * returned from an API route (the dispatcher in register.ts /
 * createApplication.ts reads `statusCode` to set the real HTTP status)
 * or returned from a Next.js Server Action (no HTTP status exists there,
 * so the field is just informational — the caller checks `success`).
 */
export class Response {
  static Ok<T = any>(data?: T, message = "success") {
    return {
      success: true,
      statusCode: 200,
      message,
      data,
    };
  }

  static Created<T = any>(data?: T, message = "Created") {
    return {
      success: true,
      statusCode: 201,
      message,
      data,
    };
  }

  static NoContent(message = "No Content") {
    return {
      success: true,
      statusCode: 204,
      message,
    };
  }

  static BadRequest(message = "Bad Request") {
    return {
      success: false,
      statusCode: 400,
      message,
    };
  }

  static Unauthorized(message = "Unauthorized") {
    return {
      success: false,
      statusCode: 401,
      message,
    };
  }

  static Forbidden(message = "Forbidden") {
    return {
      success: false,
      statusCode: 403,
      message,
    };
  }

  static NotFound(message = "Not Found") {
    return {
      success: false,
      statusCode: 404,
      message,
    };
  }

  static Conflict(message = "Conflict") {
    return {
      success: false,
      statusCode: 409,
      message,
    };
  }

  static ValidationFailed(errors: { field: string; message: string }[], message = "Validation failed") {
    return {
      success: false,
      statusCode: 400,
      message,
      errors,
    };
  }

  static TooManyRequests(message = "Too Many Requests") {
    return {
      success: false,
      statusCode: 429,
      message,
    };
  }

  static InternalServerError(message = "Internal Server Error") {
    return {
      success: false,
      statusCode: 500,
      message,
    };
  }

  static BadPage<T = any>(message: string) {
    return {
      success: false,
      statusCode: 400,
      message,
      total_page: 0,
      active_page: 0,
      prev_page: 0,
      next_page: 0,
      data: [] as T[],
    };
  }

  static EmptyPage() {
    return {
      success: true,
      statusCode: 200,
      message: "success",
      data: [],
      total_page: 0,
      active_page: 0,
      prev_page: null,
      next_page: null,
    };
  }
}

/*
 * Reads a Response.XXX() body's `statusCode` (if present) into a
 * ResponseInit, so the route dispatcher can apply the real HTTP status
 * without every handler having to call context.json(body, {status}) by hand.
 */
function toResponseInit(result: unknown): ResponseInit | undefined {
  if (
    result &&
    typeof result === "object" &&
    "statusCode" in result &&
    typeof (result as { statusCode: unknown }).statusCode === "number"
  ) {
    return { status: (result as { statusCode: number }).statusCode };
  }

  return undefined;
}

/*
 * The Fetch spec forbids a body on these statuses — NextResponse.json()
 * (built on the same Response constructor) throws "Invalid response
 * status code" if you try, e.g. Response.NoContent() serialized the
 * normal way. buildRouteResponse() is the single place that knows this,
 * so every dispatch site gets it for free instead of each handling it.
 */
const NO_BODY_STATUSES = new Set([204, 205, 304]);

export function buildRouteResponse(context: RouteContext, result: unknown): NextResponse {
  const init = toResponseInit(result);

  if (init?.status !== undefined && NO_BODY_STATUSES.has(init.status)) {
    return new NextResponse(null, init);
  }

  return context.json(result, init);
}
