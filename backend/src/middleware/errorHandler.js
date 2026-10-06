export function errorHandler(err, req, res, _next) {
  const requestId = req.requestId || "req_unknown";
  const statusCode = err.status || err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === "production";

  // Classify standard error codes
  let code = err.code || "INTERNAL_SERVER_ERROR";
  if (statusCode === 400) code = "BAD_REQUEST";
  if (statusCode === 401) code = "UNAUTHORIZED";
  if (statusCode === 403) code = "FORBIDDEN";
  if (statusCode === 404) code = "NOT_FOUND";
  if (statusCode === 429) code = "RATE_LIMIT_EXCEEDED";

  res.locals = res.locals || {};
  res.locals.errorCode = code;

  // Log error details server-side
  if (process.env.NODE_ENV !== "test") {
    console.error(`[Error] RequestId=${requestId} [${code}]:`, err.message);
    if (!isProduction && err.stack) {
      console.error(err.stack);
    }
  }

  // Safe error response payload
  const errorResponse = {
    error: {
      code,
      message:
        isProduction && statusCode === 500
          ? "An unexpected error occurred. Please contact support if the issue persists."
          : err.message || "An error occurred.",
      requestId,
    },
  };

  // Only attach details in non-production
  if (!isProduction && err.details) {
    errorResponse.error.details = err.details;
  }

  return res.status(statusCode).json(errorResponse);
}
