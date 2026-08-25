export class Response {
  static BadPage<T = any>(message: string) {
    return {
      success: false,
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
      message: "success",
      data: [],
      total_page: 0,
      active_page: 0,
      prev_page: null,
      next_page: null,
    };
  }

  static Unauthorized(message = "Unauthorized") {
    return {
      success: false,
      message,
    };
  }
  static NotFound(message = "Not Found") {
    return {
      success: false,
      message,
    };
  }

  static Forbidden(message = "Forbidden") {
    return {
      success: false,
      message,
    };
  }

  static ValidationFailed(errors: { field: string; message: string }[], message = "Validation failed") {
    return {
      success: false,
      message,
      errors,
    };
  }
}
