/**
 * Chess Evolve Startup Environment Validator
 *
 * Validates required environment variables on startup with clear error messages.
 * Fails closed in production if required security configuration is absent or malformed.
 */

export function validateEnv() {
  const isProduction = process.env.NODE_ENV === "production";
  const isTest = process.env.NODE_ENV === "test";
  const errors = [];

  // 1. Database Configuration
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    errors.push("DATABASE_URL is required but was not provided in the environment.");
  } else if (!dbUrl.startsWith("postgres://") && !dbUrl.startsWith("postgresql://")) {
    errors.push("DATABASE_URL must be a valid PostgreSQL connection string starting with 'postgres://' or 'postgresql://'.");
  }

  // 2. Production Security Hardening
  if (isProduction) {
    const directDbUrl = process.env.DIRECT_DATABASE_URL;
    if (!directDbUrl) {
      errors.push("DIRECT_DATABASE_URL is required in production for database migrations.");
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    if (!supabaseUrl || supabaseUrl === "https://placeholder.supabase.co") {
      errors.push("SUPABASE_URL must be set to a valid production Supabase gateway URL (cannot be placeholder in production).");
    }

    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    if (!supabaseAnonKey || supabaseAnonKey === "placeholder-anon-key") {
      errors.push("SUPABASE_ANON_KEY must be set to a valid Supabase key (cannot be placeholder in production).");
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret || jwtSecret.length < 32 || jwtSecret.includes("placeholder")) {
      errors.push("JWT_SECRET is required in production and must be at least 32 characters long.");
    }
  }

  // 3. Fail closed if any validation errors exist
  if (errors.length > 0) {
    const errorMessage = [
      "==================================================",
      "FATAL CONFIGURATION ERROR: Invalid Environment Variables",
      "==================================================",
      ...errors.map((e) => `  - ${e}`),
      "==================================================",
    ].join("\n");

    console.error(errorMessage);
    if (!isTest) {
      process.exit(1);
    }
    throw new Error(errors.join("; "));
  }

  return true;
}
