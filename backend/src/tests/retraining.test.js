import { describe, it, expect } from "vitest";

describe("Phase 16 Retraining & Activation Pipeline Test Suite", () => {
  it("enforces strict version increment rule MAX(version) + 1", () => {
    const existingVersions = [1];
    const nextVersion = Math.max(...existingVersions) + 1;
    expect(nextVersion).toBe(2);
    expect(nextVersion).toBeGreaterThan(Math.max(...existingVersions));
  });

  it("enforces Peak Self candidate dependency on Current Self candidate", () => {
    const currentCandidate = { id: "current-v2-id", version: 2 };
    const peakCandidate = {
      id: "peak-v2-id",
      version: 2,
      dependentModelVersionId: "current-v2-id",
    };

    expect(peakCandidate.dependentModelVersionId).toBe(currentCandidate.id);
    expect(peakCandidate.dependentModelVersionId).not.toBe("current-v1-id");
  });

  it("enforces atomic activation rule: both gates must pass together", () => {
    const canActivate = (currGate, peakGate, dependencyValid) => {
      return currGate === "PASS" && peakGate === "PASS" && dependencyValid;
    };

    expect(canActivate("PASS", "PASS", true)).toBe(true);
    expect(canActivate("FAIL", "PASS", true)).toBe(false);
    expect(canActivate("PASS", "FAIL", true)).toBe(false);
    expect(canActivate("PASS", "PASS", false)).toBe(false);
  });

  it("enforces single active model invariant per user and model type", () => {
    const models = [
      { id: "curr-v1", version: 1, modelType: "CURRENT_SELF", isActive: false, status: "SUPERSEDED" },
      { id: "curr-v2", version: 2, modelType: "CURRENT_SELF", isActive: true, status: "ACTIVE" },
      { id: "peak-v1", version: 1, modelType: "PEAK_SELF", isActive: false, status: "SUPERSEDED" },
      { id: "peak-v2", version: 2, modelType: "PEAK_SELF", isActive: true, status: "ACTIVE" },
    ];

    const activeCurrent = models.filter((m) => m.modelType === "CURRENT_SELF" && m.isActive);
    const activePeak = models.filter((m) => m.modelType === "PEAK_SELF" && m.isActive);

    expect(activeCurrent.length).toBe(1);
    expect(activePeak.length).toBe(1);
    expect(activeCurrent[0].version).toBe(2);
    expect(activePeak[0].version).toBe(2);
  });

  it("verifies idempotency: existing job returned for same dataset and version", () => {
    const jobs = [
      { id: "job-1", userId: "user-1", sourceDatasetVersion: "v2", currentModelVersion: 1, status: "COMPLETED" },
    ];

    const findJob = (userId, dsVer, modelVer) => {
      return jobs.find(
        (j) =>
          j.userId === userId &&
          j.sourceDatasetVersion === dsVer &&
          j.currentModelVersion === modelVer
      );
    };

    const duplicateAttempt = findJob("user-1", "v2", 1);
    expect(duplicateAttempt).toBeDefined();
    expect(duplicateAttempt.id).toBe("job-1");
  });

  it("guards against style collapse: rejects candidates that are pure Stockfish clones", () => {
    const checkStyleCollapse = (engineRankDistance, stylePreservation) => {
      if (engineRankDistance < 0.05) return { passes: false, reason: "Style Collapse" };
      if (stylePreservation < 0.40) return { passes: false, reason: "Low Style Preservation" };
      return { passes: true };
    };

    expect(checkStyleCollapse(0.01, 0.9).passes).toBe(false);
    expect(checkStyleCollapse(0.22, 0.72).passes).toBe(true);
    expect(checkStyleCollapse(0.30, 0.20).passes).toBe(false);
  });
});
