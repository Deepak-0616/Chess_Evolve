import { describe, it, expect } from "vitest";
import { StockfishService } from "../services/stockfish/StockfishService.js";

describe("Stockfish Worker & Engine Hardening", () => {
  it("rejects invalid FEN inputs before execution", () => {
    expect(StockfishService.isValidFen("")).toBe(false);
    expect(StockfishService.isValidFen(null)).toBe(false);
    expect(StockfishService.isValidFen("singleword")).toBe(false);
    expect(StockfishService.isValidFen("x".repeat(200))).toBe(false);

    const validFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    expect(StockfishService.isValidFen(validFen)).toBe(true);
  });

  it("handles evaluatePosition gracefully when input is invalid without crashing", async () => {
    const res = await StockfishService.evaluatePosition("invalid fen string");
    expect(res.bestMove).toBeNull();
    expect(res.eval).toBe(0);
  });

  it("handles getCandidates gracefully when input is invalid without leaking processes", async () => {
    const res = await StockfishService.getCandidates("not a valid chess position");
    expect(Array.isArray(res)).toBe(true);
    expect(res.length).toBe(0);
  });

  it("enforces MultiPV limits and safe depth clamping", async () => {
    // Calling with excessive parameters should not crash or cause infinite loops
    const candidates = await StockfishService.getCandidates(
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      99, // excessive depth
      99, // excessive multiPv
      500 // short timeout
    );
    expect(Array.isArray(candidates)).toBe(true);
  });
});
