import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../index.js";
import { supabase } from "../utils/supabase.js";

describe("Cross-User Isolation & Security Invariants (IDOR Prevention)", () => {
  const userA_id = "user_a_00000000-0000-0000-0000-000000000001";
  const userB_id = "user_b_00000000-0000-0000-0000-000000000002";

  it("blocks unauthenticated requests with HTTP 401", async () => {
    const endpoints = [
      "/api/v1/chess/profile",
      "/api/v1/games",
      "/api/v1/models",
      "/api/v1/training/overview",
      "/api/v1/coach/conversations",
      "/api/v1/evolution",
      "/api/v1/models/retrain/status",
    ];

    for (const ep of endpoints) {
      const res = await request(app).get(ep);
      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
    }
  });

  it("blocks malformed or invalid Bearer tokens with HTTP 401", async () => {
    const res = await request(app)
      .get("/api/v1/chess/profile")
      .set("Authorization", "Bearer invalid.token.payload");
    expect(res.status).toBe(401);
  });

  describe("Authenticated Cross-User Access Controls", () => {
    beforeEach(() => {
      // Mock Supabase getUser to simulate valid tokens for User A and User B
      vi.spyOn(supabase.auth, "getUser").mockImplementation(async (token) => {
        if (token === "token_user_a") {
          return {
            data: { user: { id: userA_id, email: "userA@test.local" } },
            error: null,
          };
        }
        if (token === "token_user_b") {
          return {
            data: { user: { id: userB_id, email: "userB@test.local" } },
            error: null,
          };
        }
        return { data: { user: null }, error: new Error("Invalid token") };
      });
    });

    it("enforces user isolation: User A cannot rollback User B's models", async () => {
      const res = await request(app)
        .post("/api/v1/models/rollback")
        .set("Authorization", "Bearer token_user_a")
        .send({
          targetCurrentModelId: "foreign-model-id-of-user-b",
        });

      // Must return 403 or 404, never 200
      expect([400, 403, 404]).toContain(res.status);
      expect(res.body.error).toBeDefined();
    }, { timeout: 30000 });

    it("enforces user isolation: User A cannot submit moves for an Arena match they do not participate in", async () => {
      const res = await request(app)
        .post("/api/v1/arena/matches/foreign-match-id-12345/moves")
        .set("Authorization", "Bearer token_user_a")
        .send({ move: "e4" });

      expect([403, 404]).toContain(res.status);
    }, { timeout: 30000 });

    it("enforces user isolation: User A cannot resign an Arena match they do not participate in", async () => {
      const res = await request(app)
        .post("/api/v1/arena/matches/foreign-match-id-12345/resign")
        .set("Authorization", "Bearer token_user_a");

      expect([403, 404]).toContain(res.status);
    }, { timeout: 30000 });

    it("enforces user isolation: User A cannot fetch private Coach conversations of User B", async () => {
      const res = await request(app)
        .get("/api/v1/coach/conversations/foreign-conv-id-999")
        .set("Authorization", "Bearer token_user_a");

      expect([403, 404]).toContain(res.status);
    }, { timeout: 30000 });
  });
});
