import crypto from "crypto";

export function requestLogger(req, res, next) {
  const startTime = Date.now();
  
  // Assign or extract request ID
  const requestId = req.headers["x-request-id"] || crypto.randomUUID();
  req.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);

  // Hook into response completion
  res.on("finish", () => {
    const durationMs = Date.now() - startTime;
    const statusCode = res.statusCode;

    // Structured JSON log entry
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "info",
      service: "chess-evolve-backend",
      environment: process.env.NODE_ENV || "development",
      requestId,
      method: req.method,
      route: req.originalUrl || req.url,
      statusCode,
      durationMs,
      userId: req.user?.id || null,
      ip: req.ip || req.socket?.remoteAddress,
    };

    if (res.locals?.errorCode) {
      logEntry.errorCode = res.locals.errorCode;
    }

    // Never log in test environment to keep test output clean
    if (process.env.NODE_ENV !== "test") {
      console.log(JSON.stringify(logEntry));
    }
  });

  next();
}
