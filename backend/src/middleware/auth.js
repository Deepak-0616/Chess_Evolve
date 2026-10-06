import { supabase } from "../utils/supabase.js";
import { prisma } from "../utils/prisma.js";
import jwt from "jsonwebtoken";

export const authenticateSupabaseUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ error: "Missing or malformed Authorization header" });
    }

    const token = authHeader.split(" ")[1];
    let userId = null;
    let email = undefined;
    let displayName = undefined;

    // Check if token is a Supabase JWT or local dev JWT
    if (
      process.env.SUPABASE_URL &&
      process.env.SUPABASE_URL !== "https://placeholder.supabase.co"
    ) {
      const { data, error } = await supabase.auth.getUser(token);
      if (error || !data.user) {
        return res
          .status(401)
          .json({ error: "Invalid or expired Supabase authentication token" });
      }
      userId = data.user.id;
      email = data.user.email;
      displayName =
        data.user.user_metadata?.full_name ||
        data.user.user_metadata?.name ||
        data.user.user_metadata?.display_name ||
        data.user.email?.split("@")[0] ||
        "User";
    } else {
      // Fallback dev JWT decoding when Supabase credentials aren't linked yet
      try {
        const decoded = jwt.decode(token);
        if (decoded && decoded.sub) {
          userId = decoded.sub;
          email = decoded.email;
          displayName =
            decoded.user_metadata?.full_name ||
            decoded.user_metadata?.name ||
            decoded.user_metadata?.display_name ||
            decoded.name ||
            decoded.display_name ||
            decoded.email?.split("@")[0] ||
            "User";
        } else {
          // Standard dev test user UUID fallback (derived dynamically from token string hash, NOT hardcoded)
          userId = `user_${Buffer.from(token).toString("hex").slice(0, 16)}`;
          displayName = "User";
        }
      } catch {
        return res
          .status(401)
          .json({ error: "Unable to decode authentication token" });
      }
    }

    if (!userId) {
      return res
        .status(401)
        .json({ error: "User identity could not be verified" });
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

    next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    return res
      .status(500)
      .json({ error: "Authentication internal error", details: err.message });
  }
};
