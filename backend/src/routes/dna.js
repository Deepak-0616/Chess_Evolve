import { Router } from "express";
import { authenticateSupabaseUser } from "../middleware/auth.js";
import { prisma } from "../utils/prisma.js";
import { ChessDnaService } from "../services/dna/service.js";

const router = Router();

// GET /api/v1/dna/current
router.get("/current", authenticateSupabaseUser, async (req, res) => {
  try {
    const userId = req.user.id;
    let dna = await prisma.chessDNA.findUnique({
      where: { userId },
    });

    if (!dna) {
      await ChessDnaService.generateDnaForUser(userId);
      dna = await prisma.chessDNA.findUnique({ where: { userId } });
    }

    if (!dna) {
      dna = {
        aggression: 50,
        riskTaking: 50,
        tacticalPreference: 50,
        positionalPreference: 50,
        defensiveAbility: 50,
        sacrificeTendency: 50,
        tradingTendency: 50,
        openingDiversity: 50,
        endgameAbility: 50,
        kingSafety: 50,
        topStrengths: [],
        topWeaknesses: [],
      };
    }

    const radar = [
      { subject: "Aggression", A: Math.round(dna.aggression || 50), fullMark: 100 },
      { subject: "Tactics", A: Math.round(dna.tacticalPreference || 50), fullMark: 100 },
      { subject: "Defense", A: Math.round(dna.defensiveAbility || 50), fullMark: 100 },
      { subject: "Endgame", A: Math.round(dna.endgameAbility || 50), fullMark: 100 },
      { subject: "King Safety", A: Math.round(dna.kingSafety || 50), fullMark: 100 },
      { subject: "Diversity", A: Math.round(dna.openingDiversity || 50), fullMark: 100 },
    ];

    const traits = [
      { label: "Aggression", value: Math.round(dna.aggression || 50), desc: "Attacking intensity & forward piece pressure" },
      { label: "Risk Taking", value: Math.round(dna.riskTaking || 50), desc: "Tendency to enter sharp complications" },
      { label: "Tactical Preference", value: Math.round(dna.tacticalPreference || 50), desc: "Preference for concrete tactical combinations" },
      { label: "Positional Play", value: Math.round(dna.positionalPreference || 50), desc: "Emphasis on structure and piece maneuvering" },
      { label: "Defensive Ability", value: Math.round(dna.defensiveAbility || 50), desc: "Resilience and resourcefulness under attack" },
      { label: "Endgame Technique", value: Math.round(dna.endgameAbility || 50), desc: "Precision in simplifying and converting advantages" },
      { label: "King Safety", value: Math.round(dna.kingSafety || 50), desc: "Careful shielding and castling discipline" },
      { label: "Opening Diversity", value: Math.round(dna.openingDiversity || 50), desc: "Breadth of opening repertoire" },
      { label: "Sacrifice Tendency", value: Math.round(dna.sacrificeTendency || 50), desc: "Willingness to invest material for dynamic compensation" },
      { label: "Trading Tendency", value: Math.round(dna.tradingTendency || 50), desc: "Likelihood of trading pieces into simplified positions" },
    ];

    const enriched = {
      ...dna,
      radar,
      traits,
      topStrengths: dna.topStrengths || [],
      topWeaknesses: dna.topWeaknesses || [],
    };

    return res.json({ dna: enriched, data: enriched });
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Failed to fetch Chess DNA", details: err.message });
  }
});

// GET /api/v1/dna/history
router.get("/history", authenticateSupabaseUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const dnaVersions = await prisma.chessDNAVersion.findMany({
      where: { userId },
      orderBy: { version: "asc" },
    });

    return res.json({ dnaVersions });
  } catch (err) {
    return res
      .status(500)
      .json({
        error: "Failed to fetch Chess DNA history",
        details: err.message,
      });
  }
});

export default router;
