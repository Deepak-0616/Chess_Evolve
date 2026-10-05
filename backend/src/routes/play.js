import { Router } from "express";
import { authenticateSupabaseUser } from "../middleware/auth.js";
import { prisma } from "../utils/prisma.js";
import { Chess } from "chess.js";
import { MLServiceBridge } from "../services/ml/mlService.js";
import { StockfishService } from "../services/stockfish/StockfishService.js";

const router = Router();

// POST /api/v1/play/sessions
router.post("/sessions", authenticateSupabaseUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const { opponentModelType = "CURRENT_SELF", userColor = "WHITE" } =
      req.body;

    // Check if model is READY
    const model = await prisma.mLModelVersion.findFirst({
      where: {
        userId,
        modelType: opponentModelType,
        status: "READY",
      },
      orderBy: { version: "desc" },
    });

    if (!model) {
      return res.status(400).json({
        error: `Your ${opponentModelType} model is not trained yet. Connect Chess.com and run synchronization first.`,
      });
    }

    const initialFen =
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

    const session = await prisma.playSession.create({
      data: {
        userId,
        opponentModelType,
        opponentModelVersionId: model.id,
        dependentModelVersionId: model.dependentModelVersionId || null,
        userColor: userColor.toUpperCase() === "BLACK" ? "BLACK" : "WHITE",
        fen: initialFen,
        pgn: "",
        moveHistory: [],
        status: "IN_PROGRESS",
      },
    });

    // If user selected BLACK, AI model makes the first move (White)
    if (session.userColor === "BLACK") {
      const chess = new Chess(initialFen);
      
      const candidates = await StockfishService.getCandidates(initialFen, 10, 5);

      const prediction = await MLServiceBridge.getModelPrediction({
        userId,
        modelType: opponentModelType,
        modelVersionId: session.opponentModelVersionId,
        fen: initialFen,
        candidates,
        moveNumber: 1
      });

      const aiMove = prediction.recommendedMove || "e4";
      chess.move(aiMove);

      const updatedSession = await prisma.playSession.update({
        where: { id: session.id },
        data: {
          fen: chess.fen(),
          pgn: chess.pgn(),
          moveHistory: [
            { move: aiMove, by: opponentModelType, fenAfter: chess.fen() },
          ],
        },
      });
      return res.json({ session: updatedSession, aiMove });
    }

    return res.json({ session });
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Failed to create play session", details: err.message });
  }
});

// GET /api/v1/play/sessions/:sessionId
router.get(
  "/sessions/:sessionId",
  authenticateSupabaseUser,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { sessionId } = req.params;

      const session = await prisma.playSession.findUnique({
        where: { id: sessionId },
      });

      if (!session || session.userId !== userId) {
        return res
          .status(403)
          .json({ error: "Unauthorized or session not found" });
      }

      return res.json({ session });
    } catch (err) {
      return res
        .status(500)
        .json({ error: "Failed to fetch session", details: err.message });
    }
  },
);

// POST /api/v1/play/sessions/:sessionId/moves
router.post(
  "/sessions/:sessionId/moves",
  authenticateSupabaseUser,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { sessionId } = req.params;
      const { move } = req.body;

      const session = await prisma.playSession.findUnique({
        where: { id: sessionId },
      });

      if (!session || session.userId !== userId) {
        return res
          .status(403)
          .json({ error: "Unauthorized or session not found" });
      }

      if (session.status !== "IN_PROGRESS") {
        return res
          .status(400)
          .json({ error: "Play session is already completed" });
      }

      const chess = new Chess(session.fen);

      // Apply user move
      let userMoveObj;
      try {
        userMoveObj = chess.move(move);
      } catch {
        return res.status(400).json({ error: `Illegal move: ${move}` });
      }

      const currentHistory = session.moveHistory || [];
      currentHistory.push({
        move: userMoveObj.san,
        by: "USER",
        fenAfter: chess.fen(),
      });

      // Check game over after user move
      if (chess.isGameOver()) {
        let status = "DRAW";
        if (chess.isCheckmate()) status = "USER_WON";

        const updated = await prisma.playSession.update({
          where: { id: session.id },
          data: {
            fen: chess.fen(),
            pgn: chess.pgn(),
            moveHistory: currentHistory,
            status,
          },
        });
        return res.json({ session: updated, isGameOver: true, status });
      }

      // AI model counter-move
      const candidates = await StockfishService.getCandidates(chess.fen(), 10, 5);
      
      const prediction = await MLServiceBridge.getModelPrediction({
        userId,
        modelType: session.opponentModelType,
        modelVersionId: session.opponentModelVersionId,
        fen: chess.fen(),
        candidates,
        moveNumber: Math.floor(chess.moveNumber())
      });

      const aiMoveSan = prediction.recommendedMove || (candidates.length > 0 ? candidates[0].move : chess.moves()[0]);
      let aiMoveObj;
      try {
        aiMoveObj = chess.move(aiMoveSan);
      } catch (e) {
        // Fallback to first legal move if AI chose an invalid move due to some error
        aiMoveObj = chess.move(chess.moves()[0]);
      }

      currentHistory.push({
        move: aiMoveObj.san,
        by: session.opponentModelType,
        fenAfter: chess.fen(),
        prediction: prediction
      });

      let finalStatus = "IN_PROGRESS";
      if (chess.isGameOver()) {
        if (chess.isCheckmate()) finalStatus = "MODEL_WON";
        else finalStatus = "DRAW";
      }

      const finalSession = await prisma.playSession.update({
        where: { id: session.id },
        data: {
          fen: chess.fen(),
          pgn: chess.pgn(),
          moveHistory: currentHistory,
          status: finalStatus,
        },
      });

      return res.json({
        session: finalSession,
        aiMove: aiMoveObj.san,
        prediction,
        isGameOver: finalStatus !== "IN_PROGRESS",
        status: finalStatus,
      });
    } catch (err) {
      return res
        .status(500)
        .json({ error: "Failed to process move", details: err.message });
    }
  },
);

// POST /api/v1/play/sessions/:sessionId/resign
router.post(
  "/sessions/:sessionId/resign",
  authenticateSupabaseUser,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { sessionId } = req.params;

      const session = await prisma.playSession.findUnique({
        where: { id: sessionId },
      });

      if (!session || session.userId !== userId) {
        return res
          .status(403)
          .json({ error: "Unauthorized or session not found" });
      }

      const updated = await prisma.playSession.update({
        where: { id: sessionId },
        data: { status: "RESIGNED" },
      });

      return res.json({ session: updated, message: "Game resigned" });
    } catch (err) {
      return res
        .status(500)
        .json({ error: "Failed to resign session", details: err.message });
    }
  },
);

// GET /api/v1/play/sessions/:sessionId/analysis
router.get(
  "/sessions/:sessionId/analysis",
  authenticateSupabaseUser,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { sessionId } = req.params;

      const session = await prisma.playSession.findUnique({
        where: { id: sessionId },
        include: { opponentModelVersion: true }
      });

      if (!session || session.userId !== userId) {
        return res.status(403).json({ error: "Unauthorized or session not found" });
      }

      if (session.status === "IN_PROGRESS") {
        return res.status(400).json({ error: "Game is still in progress" });
      }

      const history = session.moveHistory || [];
      const aiMoves = history.filter(m => m.by === session.opponentModelType);
      const userMoves = history.filter(m => m.by === "USER");
      
      let totalProb = 0;
      let totalRank = 0;
      let topSelections = 0;
      
      aiMoves.forEach(m => {
        const pred = m.prediction || {};
        totalProb += pred.confidence || 0;
        const rank = pred.chosenEngineRank || 1;
        totalRank += rank;
        if (rank === 1) topSelections++;
      });

      const currentSelf = {
        moves: aiMoves.length,
        topCandidateSelections: topSelections,
        averagePredictedProbability: aiMoves.length > 0 ? (totalProb / aiMoves.length) : 0,
        averageEngineRank: aiMoves.length > 0 ? (totalRank / aiMoves.length) : 0,
      };

      const baselineBehaviors = session.opponentModelVersion?.behavioralMetrics || {};

      const report = {
        modelVersion: session.opponentModelVersion?.version || 1,
        result: session.result || session.status,
        terminationReason: session.terminationReason || "N/A",
        moves: history.length,
        currentSelf,
        behaviorComparison: {
          engineRankSimilarity: baselineBehaviors.engineRankDistance ? Math.max(0, 1 - baselineBehaviors.engineRankDistance) : 0.85,
          moveTypeSimilarity: baselineBehaviors.moveTypeDistance ? Math.max(0, 1 - baselineBehaviors.moveTypeDistance) : 0.90,
          dnaSimilarity: 0.91 // Placeholder for DNA similarity
        }
      };

      return res.json({ analysis: report });
    } catch (err) {
      return res.status(500).json({ error: "Failed to analyze game", details: err.message });
    }
  }
);

export default router;
