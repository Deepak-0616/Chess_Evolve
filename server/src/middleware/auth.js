import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { sendError } from "../utils/apiResponse.js";
import { verifyToken } from "../utils/jwt.js";

const prisma = new PrismaClient();

export async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return sendError(res, "AUTH_UNAUTHORIZED", "Missing or invalid authorization header.", 401);
  }

  const token = authHeader.split(" ")[1];
  try {
    let payload;
    try {
      const decoded = jwt.decode(token);
      if (decoded && (decoded.iss?.includes("supabase") || decoded.sub)) {
        payload = decoded;
      } else {
        payload = verifyToken(token);
      }
    } catch {
      payload = verifyToken(token);
    }

    if (!payload || (!payload.id && !payload.sub && !payload.email)) {
      return sendError(res, "AUTH_UNAUTHORIZED", "Invalid token payload.", 401);
    }

    const email = payload.email || `${payload.sub || payload.id}@chessevolve.app`;
    const supabaseId = payload.sub || payload.id;
    const userId = payload.id || supabaseId;

    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { id: userId },
          { supabaseId: supabaseId },
          { email: email }
        ]
      },
      include: {
        chessProfile: true
      }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          id: userId,
          supabaseId: supabaseId,
          email: email,
          displayName: payload.user_metadata?.full_name || payload.displayName || email.split("@")[0],
          avatarUrl: payload.user_metadata?.avatar_url || null
        },
        include: {
          chessProfile: true
        }
      });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error("Auth verification error:", err);
    return sendError(res, "AUTH_UNAUTHORIZED", "Invalid or expired token.", 401);
  }
}
