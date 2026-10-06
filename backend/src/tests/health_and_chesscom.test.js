import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../index.js";
import { ChessComClient } from "../services/chesscom/client.js";

describe("Health Readiness & Chess.com Client Safety", () => {
  it("GET /health returns HTTP 200 with service name and uptime", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.service).toBe("chess-evolve-backend");
    expect(typeof res.body.uptimeSeconds).toBe("number");
  });

  it("GET /ready returns structured dependency readiness status", async () => {
    const res = await request(app).get("/ready");
    expect([200, 503]).toContain(res.status);
    expect(res.body.checks).toBeDefined();
    expect(res.body.checks.database).toBeDefined();
  }, { timeout: 15000 });

  it("ChessComClient rejects invalid username before making external calls", async () => {
    await expect(ChessComClient.getProfile("")).rejects.toThrow("Invalid username");
    await expect(ChessComClient.getProfile(null)).rejects.toThrow("Invalid username");
  });

  it("ChessComClient normalizes base URL correctly", () => {
    const original = process.env.CHESS_API_BASE_URL;
    process.env.CHESS_API_BASE_URL = "https://api.chess.com/pub/player/";
    expect(ChessComClient.getBaseUrl()).toBe("https://api.chess.com/pub");
    process.env.CHESS_API_BASE_URL = original;
  });
});
