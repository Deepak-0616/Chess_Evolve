import express from "express";
import { StockfishService } from "../services/stockfish/StockfishService.js";

const router = express.Router();

// GET /api/v1/stockfish/test
router.get("/test", async (req, res) => {
  try {
    const fen = req.query.fen || "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    const result = await StockfishService.evaluatePosition(fen, 10);
    return res.json({ success: true, data: result });
  } catch (err) {
    console.error("Stockfish test error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
