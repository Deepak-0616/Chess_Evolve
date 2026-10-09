import { supabase } from "../utils/supabase.js";
import { prisma } from "../utils/prisma.js";
import jwt from "jsonwebtoken";

// In-memory token verification cache to bypass Supabase network calls and DB lookup (60s TTL)
const userAuthCache = new Map();

// Pluggable auth client for testing dependency injection (defaults to singleton supabase client)
let authClient = supabase;

export const setAuthClient = (client) => {
  authClient = client || supabase;
};

export const getAuthClient = () => authClient;

export const clearAuthCache = () => {
  userAuthCache.clear();
};

export const authenticateSupabaseUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ error: "Missing or malformed Authorization header" });
    }

    const token = authHeader.split(" ")[1];
    if (!token || token.trim().length === 0) {
      return res
        .status(401)
        .json({ error: "Missing or malformed Authorization header" });
    }

    // Fast-path: Check verified token cache outside test mode (<0.05ms)
    if (process.env.NODE_ENV !== "test") {
      const cachedAuth = userAuthCache.get(token);
      if (cachedAuth && Date.now() < cachedAuth.expiresAt) {
        req.user = cachedAuth.user;
        return next();
      }
    }

    let userId = null;
    let email = undefined;
    let displayName = undefined;

    // 1. Primary: Verify token via Supabase Auth client (or test-injected client)
    let timeoutId;
    try {
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error("Supabase auth timeout")), 5000);
      });

      const { data, error } = await Promise.race([
        authClient.auth.getUser(token),
        timeoutPromise,
      ]);
      clearTimeout(timeoutId);

      if (!error && data?.user?.id) {
        userId = data.user.id;
        email = data.user.email;
        displayName =
          data.user.user_metadata?.full_name ||
          data.user.user_metadata?.name ||
          data.user.user_metadata?.display_name ||
          data.user.email?.split("@")[0] ||
          "User";
      }
    } catch {
      clearTimeout(timeoutId);
      // Supabase verification failed, rejected, timed out, or network error
    }

    // 2. Secondary: Cryptographically verify signed JWT if JWT_SECRET is configured
    if (!userId && process.env.JWT_SECRET) {
      try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        if (verified && (verified.sub || verified.id)) {
          userId = verified.sub || verified.id;
          email = verified.email;
          displayName =
            verified.user_metadata?.full_name ||
            verified.user_metadata?.name ||
            verified.user_metadata?.display_name ||
            verified.name ||
            verified.display_name ||
            verified.email?.split("@")[0] ||
            "User";
        }
      } catch {
        // Not a valid signed JWT
      }
    }

    // Reject any token that cannot be verified by Supabase Auth or signed JWT
    if (!userId) {
      return res
        .status(401)
        .json({ error: "Invalid or expired Supabase authentication token" });
    }

    // Upsert User record in database to ensure Supabase Auth user is synced with DB
    let userRecord = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!userRecord) {
      userRecord = await prisma.user.create({
        data: {
          id: userId,
          email: email || `${userId}@user.local`,
          displayName: displayName || "User",
        },
      });
    } else if (!userRecord.displayName && displayName) {
      // Only initialize display name if missing/empty. Do NOT overwrite existing manually edited name!
      userRecord = await prisma.user.update({
        where: { id: userId },
        data: { displayName },
      });
    }

    req.user = {
      id: userRecord.id,
      email: userRecord.email || undefined,
      displayName: userRecord.displayName || undefined,
      avatarUrl: userRecord.avatarUrl || undefined,
    };

    if (process.env.NODE_ENV !== "test") {
      userAuthCache.set(token, {
        user: req.user,
        expiresAt: Date.now() + 60000,
      });
    }

    next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    return res
      .status(500)
      .json({ error: "Authentication internal error", details: err.message });
  }
};
