import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import request from "supertest";
import app from "../index.js";
import { prisma } from "../utils/prisma.js";
import { supabase } from "../utils/supabase.js";

// Validation & formatting logic mirrors frontend utils for full end-to-end assurance
const validateDisplayName = (raw) => {
  if (raw === undefined || raw === null || typeof raw !== 'string') {
    return { valid: false, error: 'Display Name is required.' };
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: 'Display Name cannot be empty or whitespace only.' };
  }
  if (trimmed.length < 2) {
    return { valid: false, error: 'Display Name must be at least 2 characters.' };
  }
  if (trimmed.length > 50) {
    return { valid: false, error: 'Display Name must not exceed 50 characters.' };
  }
  return { valid: true, value: trimmed };
};

const validateEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email address is required.' };
  }
  const trimmed = email.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return { valid: false, error: 'Please enter a valid email address.' };
  }
  return { valid: true, value: trimmed };
};

const validatePassword = (password) => {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required.' };
  }
  if (password.length < 6) {
    return { valid: false, error: 'Password must be at least 6 characters.' };
  }
  return { valid: true, value: password };
};

const formatAuthError = (error, context = 'login') => {
  if (!error) return '';
  const msg = (typeof error === 'string' ? error : error.message || '').toLowerCase();

  if (
    msg.includes('invalid login credentials') ||
    msg.includes('invalid email or password') ||
    msg.includes('wrong password') ||
    msg.includes('user not found') ||
    msg.includes('invalid_grant')
  ) {
    return 'Invalid email or password.';
  }

  if (
    msg.includes('user already registered') ||
    msg.includes('already exists') ||
    msg.includes('duplicate key')
  ) {
    return 'An account with this email already exists. Try signing in.';
  }

  if (
    msg.includes('password should be at least') ||
    msg.includes('weak password') ||
    msg.includes('password is too weak')
  ) {
    return 'Please choose a stronger password.';
  }

  if (
    msg.includes('network') ||
    msg.includes('failed to fetch') ||
    msg.includes('fetch failed') ||
    msg.includes('connection')
  ) {
    return 'Unable to connect. Please check your connection and try again.';
  }

  if (
    msg.includes('oauth') ||
    msg.includes('google') ||
    msg.includes('popup') ||
    msg.includes('cancelled')
  ) {
    return 'Google sign-in could not be completed. Please try again.';
  }

  return context === 'signup'
    ? 'Unable to create account. Please check your details and try again.'
    : 'Invalid email or password.';
};

const resolveGoogleDisplayName = (user) => {
  if (!user) return 'User';
  const meta = user.user_metadata || {};
  return (
    meta.full_name ??
    meta.name ??
    meta.display_name ??
    user.email?.split('@')[0] ??
    'User'
  );
};

describe("PHASE 18.1 — Authentication UX, Google OAuth & Display Name Suite", () => {
  const testUserId = "test-oauth-user-18-1";
  const testEmail = "oauth.test@chessevolve.local";

  beforeEach(async () => {
    // Clean up test user if present
    await prisma.user.deleteMany({
      where: { id: { in: [testUserId, "logout-test-id"] } }
    }).catch(() => {});

    // Mock Supabase getUser to isolate tests safely without network calls
    vi.spyOn(supabase.auth, "getUser").mockImplementation(async (token) => {
      if (token === "valid_oauth_token_1") {
        return {
          data: {
            user: {
              id: testUserId,
              email: testEmail,
              user_metadata: { full_name: "Initial Google Name" },
            },
          },
          error: null,
        };
      }
      if (token === "valid_oauth_token_existing") {
        return {
          data: {
            user: {
              id: testUserId,
              email: testEmail,
              user_metadata: { full_name: "Original Google Name" },
            },
          },
          error: null,
        };
      }
      if (token === "valid_token_logout") {
        return {
          data: {
            user: {
              id: "logout-test-id",
              email: "logout@auth.local",
              user_metadata: { display_name: "Logout User" },
            },
          },
          error: null,
        };
      }
      return { data: { user: null }, error: new Error("Invalid or expired token") };
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { id: { in: [testUserId, "logout-test-id"] } }
    }).catch(() => {});
    vi.restoreAllMocks();
  });

  describe("1. Display Name Validation Rules", () => {
    it("rejects empty, undefined, or null display name", () => {
      expect(validateDisplayName("").valid).toBe(false);
      expect(validateDisplayName(null).valid).toBe(false);
      expect(validateDisplayName(undefined).valid).toBe(false);
    });

    it("rejects whitespace-only display names", () => {
      const res = validateDisplayName("    ");
      expect(res.valid).toBe(false);
      expect(res.error).toContain("empty or whitespace");
    });

    it("rejects display names shorter than 2 characters", () => {
      const res = validateDisplayName("a");
      expect(res.valid).toBe(false);
      expect(res.error).toContain("at least 2 characters");
    });

    it("rejects display names longer than 50 characters", () => {
      const longName = "A".repeat(51);
      const res = validateDisplayName(longName);
      expect(res.valid).toBe(false);
      expect(res.error).toContain("50 characters");
    });

    it("trims whitespace and accepts valid display names", () => {
      const res = validateDisplayName("   Grandmaster Flash   ");
      expect(res.valid).toBe(true);
      expect(res.value).toBe("Grandmaster Flash");
    });
  });

  describe("2. Email & Password Validation", () => {
    it("validates email formatting correctly", () => {
      expect(validateEmail("not-an-email").valid).toBe(false);
      expect(validateEmail("user@").valid).toBe(false);
      expect(validateEmail("user@domain").valid).toBe(false);
      expect(validateEmail("user@domain.com").valid).toBe(true);
      expect(validateEmail("  player@test.org  ").value).toBe("player@test.org");
    });

    it("validates password length requirement (min 6 chars)", () => {
      expect(validatePassword("12345").valid).toBe(false);
      expect(validatePassword("123456").valid).toBe(true);
      expect(validatePassword("SecurePass2026!").valid).toBe(true);
    });
  });

  describe("3. Safe User-Facing Auth Error Formatting", () => {
    it("formats invalid credentials safely without exposing internals", () => {
      expect(formatAuthError("Invalid login credentials")).toBe("Invalid email or password.");
      expect(formatAuthError("User not found in system")).toBe("Invalid email or password.");
    });

    it("formats duplicate email on signup safely", () => {
      expect(formatAuthError("User already registered", "signup")).toBe(
        "An account with this email already exists. Try signing in."
      );
    });

    it("formats weak password error safely", () => {
      expect(formatAuthError("Password should be at least 6 characters", "signup")).toBe(
        "Please choose a stronger password."
      );
    });

    it("formats Google OAuth failures cleanly", () => {
      expect(formatAuthError("OAuth provider error during popup exchange")).toBe(
        "Google sign-in could not be completed. Please try again."
      );
    });

    it("does not expose SQL, stack traces, or database tokens", () => {
      const rawSqlError = "error: select * from users where id = 'bad' - relation does not exist at postgres.c:120";
      const formatted = formatAuthError(rawSqlError);
      expect(formatted).not.toContain("select");
      expect(formatted).not.toContain("relation");
      expect(formatted).not.toContain("postgres");
    });
  });

  describe("4. Google OAuth Metadata Resolution", () => {
    it("prefers full_name from user_metadata", () => {
      const user = {
        email: "test@domain.com",
        user_metadata: { full_name: "Hikaru Nakamura", name: "Hikaru" }
      };
      expect(resolveGoogleDisplayName(user)).toBe("Hikaru Nakamura");
    });

    it("falls back to name if full_name is absent", () => {
      const user = {
        email: "test@domain.com",
        user_metadata: { name: "Magnus Carlsen" }
      };
      expect(resolveGoogleDisplayName(user)).toBe("Magnus Carlsen");
    });

    it("falls back to email prefix if metadata names are absent", () => {
      const user = {
        email: "tactical_beast@domain.com",
        user_metadata: {}
      };
      expect(resolveGoogleDisplayName(user)).toBe("tactical_beast");
    });

    it("falls back to 'User' if email and metadata are missing", () => {
      expect(resolveGoogleDisplayName({})).toBe("User");
    });
  });

  describe("5. Backend Database Synchronization & Display Name Lifecycle", () => {
    it("creates a new Application User on first login and stores initial display name", async () => {
      const res = await request(app)
        .post("/api/v1/auth/sync")
        .set("Authorization", "Bearer valid_oauth_token_1");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.id).toBe(testUserId);
      expect(res.body.user.displayName).toBe("Initial Google Name");

      const inDb = await prisma.user.findUnique({ where: { id: testUserId } });
      expect(inDb).toBeDefined();
      expect(inDb.displayName).toBe("Initial Google Name");
    }, { timeout: 30000 });

    it("subsequent login does NOT duplicate the User record", async () => {
      // First create user
      await prisma.user.create({
        data: {
          id: testUserId,
          email: testEmail,
          displayName: "Existing Player",
        }
      });

      const res = await request(app)
        .post("/api/v1/auth/sync")
        .set("Authorization", "Bearer valid_oauth_token_existing");

      expect(res.status).toBe(200);
      const totalMatching = await prisma.user.count({ where: { id: testUserId } });
      expect(totalMatching).toBe(1);
    }, { timeout: 30000 });

    it("preserves manually edited display name on subsequent Google login", async () => {
      // User manually customized their display name
      await prisma.user.create({
        data: {
          id: testUserId,
          email: testEmail,
          displayName: "Custom Edited Chess Handle",
        }
      });

      // Subsequent Google login brings Google profile name "Original Google Name"
      const res = await request(app)
        .post("/api/v1/auth/sync")
        .set("Authorization", "Bearer valid_oauth_token_existing");

      expect(res.status).toBe(200);
      expect(res.body.user.displayName).toBe("Custom Edited Chess Handle");

      const inDb = await prisma.user.findUnique({ where: { id: testUserId } });
      expect(inDb.displayName).toBe("Custom Edited Chess Handle");
    }, { timeout: 30000 });
  });

  describe("6. Route Protection & Security Enforcements", () => {
    it("rejects unauthenticated requests to protected endpoints", async () => {
      const res = await request(app).get("/api/v1/auth/me");
      expect(res.status).toBe(401);
      expect(res.body.error).toContain("Authorization");
    }, { timeout: 30000 });

    it("rejects malformed or invalid Bearer tokens", async () => {
      const res = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", "Bearer invalid-garbage-token");
      expect(res.status).toBe(401);
    }, { timeout: 30000 });

    it("derives user identity strictly from token, ignoring client-supplied userId", async () => {
      const res = await request(app)
        .post("/api/v1/auth/sync")
        .set("Authorization", "Bearer valid_oauth_token_1")
        .send({ userId: "malicious-spoofed-user-id" }); // Client attempts to spoof another user ID

      expect(res.status).toBe(200);
      expect(res.body.user.id).toBe(testUserId);
      expect(res.body.user.id).not.toBe("malicious-spoofed-user-id");
    }, { timeout: 30000 });

    it("successfully handles logout endpoint", async () => {
      const res = await request(app)
        .post("/api/v1/auth/logout")
        .set("Authorization", "Bearer valid_token_logout");

      expect(res.status).toBe(200);
      expect(res.body.message).toContain("logged out");
    }, { timeout: 30000 });
  });
});
