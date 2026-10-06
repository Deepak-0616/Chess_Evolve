import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../index.js";
import { schemas, validate } from "../middleware/validate.js";
import { createRateLimiter } from "../middleware/rateLimiter.js";
import express from "express";

describe("Input Validation & Rate Limiting Hardening", () => {
  describe("Zod Validation Schemas", () => {
    it("rejects malformed FEN strings", () => {
      expect(() => schemas.fen.parse("")).toThrow();
      expect(() => schemas.fen.parse("invalid")).toThrow();
      expect(() =>
        schemas.fen.parse("a".repeat(200))
      ).toThrow();
    });

    it("accepts valid FEN strings", () => {
      const validFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
      expect(schemas.fen.parse(validFen)).toBe(validFen);
    });

    it("rejects malicious or invalid Chess.com usernames", () => {
      expect(() => schemas.chessUsername.parse("")).toThrow();
      expect(() => schemas.chessUsername.parse("ab")).toThrow(); // min 3 chars
      expect(() => schemas.chessUsername.parse("user;DROP TABLE User;--")).toThrow(); // invalid chars
      expect(() => schemas.chessUsername.parse("<script>alert(1)</script>")).toThrow();
    });

    it("accepts legitimate Chess.com usernames", () => {
      expect(schemas.chessUsername.parse("MagnusCarlsen")).toBe("MagnusCarlsen");
      expect(schemas.chessUsername.parse("Hikaru-Nakamura")).toBe("Hikaru-Nakamura");
    });

    it("rejects invalid moves and payloads", () => {
      expect(() => schemas.attempt.parse({})).toThrow();
      expect(() => schemas.attempt.parse({ positionId: "", move: "" })).toThrow();
    });

    it("enforces schema middleware returning 400 on malformed payloads", async () => {
      const testApp = express();
      testApp.use(express.json());
      testApp.post(
        "/test-validate",
        validate(schemas.attempt, "body"),
        (_req, res) => res.json({ ok: true })
      );

      const res = await request(testApp)
        .post("/test-validate")
        .send({ positionId: "", move: "" });

      expect(res.status).toBe(400);
      expect(res.body.error?.code).toBe("VALIDATION_ERROR");
      expect(res.body.error?.details).toBeDefined();
    });
  });

  describe("Rate Limiting Enforcement", () => {
    it("returns HTTP 429 when request threshold is exceeded", async () => {
      const testApp = express();
      const testLimiter = createRateLimiter({
        windowMs: 10000,
        max: 3,
        keyPrefix: "rl_test",
        message: "Test limit exceeded",
      });

      testApp.use(testLimiter);
      testApp.get("/test-rate", (_req, res) => res.json({ ok: true }));

      // Make 3 allowed requests
      for (let i = 0; i < 3; i++) {
        const res = await request(testApp)
          .get("/test-rate")
          .set("x-test-rate-limit", "true");
        expect(res.status).toBe(200);
      }

      // 4th request must be blocked with 429
      const blockedRes = await request(testApp)
        .get("/test-rate")
        .set("x-test-rate-limit", "true");

      expect(blockedRes.status).toBe(429);
      expect(blockedRes.body.error?.code).toBe("RATE_LIMIT_EXCEEDED");
      expect(blockedRes.headers["retry-after"]).toBeDefined();
    });
  });
});
