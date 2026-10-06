export function securityHeaders(req, res, next) {
  // Prevent MIME type sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");

  // Prevent clickjacking / frame embedding
  res.setHeader("X-Frame-Options", "DENY");

  // Modern referrer policy
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  // Disable browser legacy XSS auditor
  res.setHeader("X-XSS-Protection", "0");

  // Restrict unused browser features
  res.setHeader("Permissions-Policy", "geolocation=(), camera=(), microphone=()");

  // Content Security Policy for API
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; frame-ancestors 'none'; object-src 'none';"
  );

  next();
}

export function configureCors() {
  const allowedOriginsStr = process.env.CORS_ORIGINS || "http://localhost:3000,http://localhost:5173";
  const allowedOrigins = allowedOriginsStr
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  return {
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);

      if (process.env.NODE_ENV !== "production") {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`Origin '${origin}' not allowed by CORS`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
    maxAge: 86400,
  };
}
