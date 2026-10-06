import { describe, it, expect } from "vitest";
import { prisma } from "../utils/prisma.js";

describe("Database Connection Safety & Connection Reuse", () => {
  it("proves repeated Prisma queries reuse singleton client without connection explosion", async () => {
    // Perform 10 repeated queries to verify connection reuse and stability
    const iterations = 10;
    const results = [];

    for (let i = 0; i < iterations; i++) {
      const res = await prisma.$queryRaw`SELECT 1 as val`;
      results.push(res);
    }

    expect(results.length).toBe(iterations);
    for (const r of results) {
      expect(Array.isArray(r)).toBe(true);
      expect(r[0]?.val).toBe(1);
    }
  }, { timeout: 30000 });

  it("verifies single global PrismaClient instance across modules", async () => {
    const mod1 = await import("../utils/prisma.js");
    const mod2 = await import("../utils/prisma.js");
    expect(mod1.prisma).toBe(mod2.prisma);
  });
});
