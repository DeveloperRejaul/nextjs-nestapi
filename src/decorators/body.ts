import { plainToInstance } from "class-transformer";
import { validate, ValidationError } from "class-validator";
import { Response } from "../utils/Response";
import type { RouteContext } from "../utils/types";
import { registerParam } from "./param-registry";
import { registerBodyDto } from "./openapi-registry";

/*
 * A RouteContext (passed by the @Get/@Post auto-registered
 * API routes) is duck-typed here so @Body() works whether the
 * method is called directly (server action: `controller.create(dto)`,
 * raw payload) or through the route registry
 * (`controller[handler](context)`, RouteContext).
 */
function isRouteContext(value: any): value is RouteContext {
  return (
    !!value &&
    typeof value === "object" &&
    "request" in value &&
    "params" in value &&
    "query" in value &&
    typeof value.json === "function"
  );
}

function formatValidationErrors(errors: ValidationError[]) {
  return errors.map((error) => ({
    field: error.property,
    message: Object.values(error.constraints || {})[0] || "Invalid value",
  }));
}

/*
 * class-transformer's plainToInstance can't safely see a raw File/
 * FileList value: with no explicit @Type() on the field, it "guesses"
 * a constructor from the value itself (`value.constructor`) and calls
 * `new File()` with no arguments to build the transformed instance —
 * which throws immediately ("fileBits and fileName arguments must be
 * specified"), before any @Transform() on the field even runs (that
 * only applies to the *result* of the walk, not the walk itself). So
 * File-bearing fields are stripped out before the transform runs and
 * reattached untouched afterward, for every DTO, not just the ones
 * that happen to declare a `files`/`avatar` field.
 */
function isFileLike(value: unknown): boolean {
  if (typeof File !== "undefined" && value instanceof File) return true;
  if (typeof FileList !== "undefined" && value instanceof FileList) return true;
  if (Array.isArray(value) && value.some((item) => typeof File !== "undefined" && item instanceof File)) return true;
  return false;
}

function extractFileFields(raw: Record<string, unknown>) {
  const fileFields: Record<string, unknown> = {};
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(raw)) {
    if (isFileLike(value)) {
      fileFields[key] = value;
    } else {
      sanitized[key] = value;
    }
  }

  return { fileFields, sanitized };
}

export function Body<T extends object>(DtoClass: new () => T): ParameterDecorator {
  return (target: any, propertyKey, parameterIndex) => {
    if (propertyKey === undefined) return;

    registerBodyDto(target, propertyKey, DtoClass);

    registerParam(target, propertyKey, parameterIndex, async (rawInput) => {
      let raw: Record<string, unknown>;

      if (isRouteContext(rawInput)) {
        try {
          raw = await rawInput.request.json();
        } catch {
          raw = {};
        }
      } else {
        raw = rawInput ?? {};
      }

      const { fileFields, sanitized } = extractFileFields(raw);
      const instance = plainToInstance(DtoClass, sanitized);
      Object.assign(instance as object, fileFields);

      const errors = await validate(instance as object, {
        whitelist: true,
        forbidNonWhitelisted: false,
      });

      if (errors.length > 0) {
        return {
          success: false as const,
          response: Response.ValidationFailed(formatValidationErrors(errors)),
        };
      }

      return { success: true as const, value: instance };
    });
  };
}
