import { Router } from "express";
import { authenticateSupabaseUser } from "../middleware/auth.js";
import { prisma } from "../utils/prisma.js";
import { AccountSyncManager } from "../services/jobs/syncJob.js";

const router = Router();

// GET /api/v1/auth/me
router.get("/me", authenticateSupabaseUser, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        chessProfile: true,
        currentDna: true,
        arenaProfile: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User record not found" });
    }

    if (!user.chessProfile && req.user.email) {
      const emailUser = await prisma.user.findFirst({
        where: { email: req.user.email, chessProfile: { isNot: null } },
        include: { chessProfile: true },
      });
      if (emailUser?.chessProfile) {
        user.chessProfile = emailUser.chessProfile;
      }
    }

    return res.json({ user });
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Failed to fetch user auth state", details: err.message });
  }
});

// POST /api/v1/auth/sync
router.post("/sync", authenticateSupabaseUser, async (req, res) => {
  try {
    let user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        chessProfile: true,
        currentDna: true,
        arenaProfile: true,
      },
    });

    if (!user) {
      user = await prisma.user.upsert({
        where: { id: req.user.id },
        update: {},
        create: {
          id: req.user.id,
          email: req.user.email,
          displayName: req.user.displayName || req.user.email?.split("@")[0] || "Player",
          avatarUrl: req.user.avatarUrl || null,
        },
        include: {
          chessProfile: true,
          currentDna: true,
          arenaProfile: true,
        },
      });
    }

    if (user?.chessProfile?.chessUsername) {
      // Trigger background sync non-blocking so login/auth callback responds instantaneously
      AccountSyncManager.syncLatestGames(user.id, user.chessProfile.chessUsername).catch((syncErr) => {
        console.warn("[auth/sync] Quick sync on login warning:", syncErr.message);
      });
    }

    return res.json({
      success: true,
      user,
      hasChessProfile: !!user?.chessProfile,
    });
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Failed to synchronize user auth state", details: err.message });
  }
});

// POST /api/v1/auth/logout
router.post("/logout", authenticateSupabaseUser, async (_req, res) => {
  return res.json({ message: "Successfully logged out" });
});

export default router;
