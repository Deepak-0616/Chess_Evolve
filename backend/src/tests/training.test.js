import { describe, it, expect } from "vitest";
import { Chess } from "chess.js";
import { TrainingExplainer } from "../services/training/trainingExplainer.js";
import { PositionSelector } from "../services/training/positionSelector.js";

describe("Training System Unit & Security Tests", () => {
  describe("Move Validation with chess.js", () => {
    it("accepts legal UCI and SAN moves from authoritative FEN", () => {
      const fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
      const chess = new Chess(fen);
      
      const move = chess.move("e4");
      expect(move).not.toBeNull();
      expect(move.lan).toBe("e2e4");
    });

    it("rejects illegal moves and maintains board integrity", () => {
      const fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
      const chess = new Chess(fen);
      
      let errorThrown = false;
      try {
        chess.move("e5"); // Illegal for White on move 1
      } catch (e) {
        errorThrown = true;
      }
      expect(errorThrown).toBe(true);
      expect(chess.fen()).toBe(fen);
    });

    it("correctly handles pawn promotions with promotion flag", () => {
      // White pawn on e7, black king on a8
      const fen = "k7/4P3/8/8/8/8/8/4K3 w - - 0 1";
      const chess = new Chess(fen);
      
      const promoMove = chess.move({ from: "e7", to: "e8", promotion: "q" });
      expect(promoMove).not.toBeNull();
      expect(promoMove.promotion).toBe("q");
      expect(chess.get("e8").type).toBe("q");
    });

    it("enforces castling legality when crossing attacked squares (through check)", () => {
      // White king on e1, rook on h1. Black rook on f8 attacks f1 square!
      const fen = "r3kr2/8/8/8/8/8/8/R3K2R w KQq - 0 1";
      const chess = new Chess(fen);
      
      // Kingside castling crosses f1 which is controlled by black rook on f8
      let castlingAllowed = true;
      try {
        const move = chess.move("O-O");
        if (!move) castlingAllowed = false;
      } catch (e) {
        castlingAllowed = false;
      }
      expect(castlingAllowed).toBe(false);
    });
  });

  describe("Move Quality & Deterministic Explanations", () => {
    it("evaluates move qualities correctly according to CPL and engine rank", () => {
      expect(TrainingExplainer.determineMoveQuality(1, 0)).toBe("BEST");
      expect(TrainingExplainer.determineMoveQuality(2, 25)).toBe("EXCELLENT");
      expect(TrainingExplainer.determineMoveQuality(3, 75)).toBe("GOOD");
      expect(TrainingExplainer.determineMoveQuality(4, 120)).toBe("INACCURACY");
      expect(TrainingExplainer.determineMoveQuality(5, 200)).toBe("MISTAKE");
      expect(TrainingExplainer.determineMoveQuality(6, 450)).toBe("BLUNDER");
    });

    it("generates honest contrast between player historical, current self, peak self, and engine", () => {
      const explanation = TrainingExplainer.generateExplanation({
        submittedMove: "d4",
        targetMove: "d4",
        quality: "BEST",
        engineRank: 1,
        cpLoss: 0,
        playerHistoricalMove: "Nxe5",
        playerHistoricalClass: "BLUNDER",
        currentSelfMove: "Nxe5",
        currentSelfConfidence: 0.88,
        peakSelfMove: "d4",
        peakSelfConfidence: 0.94,
        category: "TACTICAL",
        fen: "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 4 5",
      });

      expect(explanation).toContain("Outstanding move");
      expect(explanation).toContain("Nxe5");
      expect(explanation).toContain("Current Self");
      expect(explanation).toContain("Peak Self");
      expect(explanation).toContain("Focus: In sharp tactical middlegames");
    });
  });

  describe("Position Quality Categorization & Priority Scoring", () => {
    it("categorizes tactical, defensive, and endgame positions accurately", () => {
      expect(PositionSelector.categorizePosition({
        gamePhase: "ENDGAME",
        tacticalScore: 0.1,
        kingSafetyScore: 0.1,
        classification: "MISTAKE",
        cpLoss: 100,
      })).toBe("ENDGAME");

      expect(PositionSelector.categorizePosition({
        gamePhase: "MIDDLEGAME",
        tacticalScore: 0.1,
        kingSafetyScore: -0.4,
        classification: "BLUNDER",
        cpLoss: 250,
      })).toBe("DEFENSIVE");

      expect(PositionSelector.categorizePosition({
        gamePhase: "MIDDLEGAME",
        tacticalScore: 0.6,
        kingSafetyScore: 0.0,
        classification: "MISTAKE",
        cpLoss: 100,
      })).toBe("TACTICAL");
    });

    it("assigns appropriate difficulty levels", () => {
      expect(PositionSelector.determineDifficulty(350)).toBe("EASY");
      expect(PositionSelector.determineDifficulty(160)).toBe("MEDIUM");
      expect(PositionSelector.determineDifficulty(80)).toBe("HARD");
      expect(PositionSelector.determineDifficulty(30)).toBe("EXPERT");
    });

    it("prioritizes severe recurring blunders over isolated small inaccuracies", () => {
      const now = new Date();
      const monthAgo = new Date(Date.now() - 30 * 86400000);

      const severeRecurringScore = PositionSelector.calculatePriority({
        cpLoss: 350,
        recurrenceCount: 6,
        playedAt: now,
        maxDate: now,
        minDate: monthAgo,
        candidateCount: 4,
        priorAttempts: 0,
      });

      const isolatedInaccuracyScore = PositionSelector.calculatePriority({
        cpLoss: 25,
        recurrenceCount: 1,
        playedAt: monthAgo,
        maxDate: now,
        minDate: monthAgo,
        candidateCount: 2,
        priorAttempts: 3,
      });

      expect(severeRecurringScore).toBeGreaterThan(isolatedInaccuracyScore);
    });
  });
});
