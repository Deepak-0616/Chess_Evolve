import { Router } from "express";
import { authenticateSupabaseUser } from "../middleware/auth.js";
import { prisma } from "../utils/prisma.js";

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
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        chessProfile: true,
        currentDna: true,
        arenaProfile: true,
      },
    });

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
