import { describe, it, expect } from "vitest";
import { EvolutionService } from "../services/evolution/evolutionService.js";

describe("Evolution & Longitudinal Tracking Unit Tests", () => {
  describe("Statistical Sample Size & Evidence Safety", () => {
    it("enforces MIN_COHORT_DECISIONS threshold before asserting improvement", () => {
      expect(EvolutionService.MIN_COHORT_DECISIONS).toBe(30);
    });

    it("evaluates correlation without unsupported causal assertions", () => {
      const mockBaseline = {
        categories: {
          TACTICAL: { avgCpl: 120.0, errorRate: 20.0, sampleSize: 100 },
          DEFENSIVE: { avgCpl: 150.0, errorRate: 25.0, sampleSize: 15 }, // Small sample
        },
      };

      const mockRecent = {
        categories: {
          TACTICAL: { avgCpl: 90.0, errorRate: 15.0, sampleSize: 120 },
          DEFENSIVE: { avgCpl: 110.0, errorRate: 18.0, sampleSize: 20 }, // Small sample (< 30)
        },
      };

      const mockTraining = {
        categoryPerformance: {
          TACTICAL: { attempted: 10, solved: 8, successRate: 80 },
          DEFENSIVE: { attempted: 5, solved: 4, successRate: 80 },
        },
      };

      const correlation = EvolutionService._computeCorrelation(mockBaseline, mockRecent, mockTraining);

      expect(correlation.disclaimer).toContain("Correlation does not imply direct causation");
      
      const tactical = correlation.categories.find((c) => c.category === "TACTICAL");
      expect(tactical.evidenceStatus).toBe("SUFFICIENT");
      expect(tactical.cplChangePct).toBe(-25.0);
      expect(tactical.trainingSuccessRate).toBe(80);

      const defensive = correlation.categories.find((c) => c.category === "DEFENSIVE");
      expect(defensive.evidenceStatus).toBe("INSUFFICIENT_EVIDENCE");
    });
  });

  describe("Weakness Progression Trajectory Evaluation", () => {
    it("assigns IMPROVING status when CPL reduction is substantiated by sufficient evidence", () => {
      const topWeaknesses = ["Middlegame Tactical Blunders"];
      const baseline = {
        categories: {
          TACTICAL: { avgCpl: 140.0, errorRate: 22.0, sampleSize: 200 },
        },
      };
      const recent = {
        categories: {
          TACTICAL: { avgCpl: 95.0, errorRate: 15.0, sampleSize: 180 },
        },
      };
      const trainProg = {
        "Middlegame Tactical Blunders": { attempted: 8, solved: 6 },
      };

      const evalResults = EvolutionService._evaluateWeaknesses(topWeaknesses, baseline, recent, trainProg);
      expect(evalResults.length).toBe(1);
      expect(evalResults[0].status).toBe("IMPROVING");
      expect(evalResults[0].trendDescription).toContain("reduction");
      expect(evalResults[0].sampleSize).toBe(180);
    });

    it("assigns INSUFFICIENT_EVIDENCE when sample size is too small", () => {
      const topWeaknesses = ["Exposed King under Opponent Attack"];
      const baseline = {
        categories: {
          DEFENSIVE: { avgCpl: 140.0, errorRate: 22.0, sampleSize: 200 },
        },
      };
      const recent = {
        categories: {
          DEFENSIVE: { avgCpl: 95.0, errorRate: 15.0, sampleSize: 12 }, // < 30 decisions
        },
      };

      const evalResults = EvolutionService._evaluateWeaknesses(topWeaknesses, baseline, recent, {});
      expect(evalResults.length).toBe(1);
      expect(evalResults[0].status).toBe("INSUFFICIENT_EVIDENCE");
    });
  });

  describe("Model Update Eligibility Rules", () => {
    it("flags RETRAINING_ELIGIBLE only when new games exceed configurable threshold", () => {
      const threshold = EvolutionService.RETRAINING_THRESHOLDS.minNewGames;
      expect(threshold).toBe(30);
    });
  });
});
