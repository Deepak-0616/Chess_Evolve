# Evolution & Longitudinal Tracking Audit — Phase 15

## 1. System Overview
Phase 15 implements an empirical, evidence-backed longitudinal evolution tracking system. The core architectural invariant is the **strict distinction between deliberate training practice and real-game chess performance**:
- **Training Position Success Rate**: Measures user accuracy and tactical pattern acquisition across targeted mistake positions during deliberate practice drills.
- **Gameplay Improvement**: Measured exclusively from newly analyzed, chronologically ordered Chess.com games (quantifying reductions in Centipawn Loss, blunder rates, and tactical mistake frequencies).

---

## 2. Cohort Methodology & Baseline Definition
To evaluate progression objectively without arbitrary thresholds:
1. **Chronological Ordering**: All analyzed games for the authenticated user's `ChessProfile` are ordered strictly by `playedAt ASC`.
2. **Baseline Cohort**: The earliest 50% chronological cohort of analyzed games (e.g. Games 1–392 for User 1).
3. **Recent / Post-Training Cohort**: The latest 50% chronological cohort of analyzed games (e.g. Games 393–785 for User 1).
4. **Statistical Safety**: Any comparative assertion requires a minimum sample size $N \ge 30$ decisions (`MIN_COHORT_DECISIONS`). Sample sizes below this threshold are explicitly flagged as `INSUFFICIENT_EVIDENCE`.

---

## 3. Real Longitudinal Gameplay Progression

### User 1 (`KAKAROT0616`) — 785 Analyzed Games (48,380 Decisions)
| Cohort | Games | Decisions | Avg CPL | Blunder Rate | Best Move Rate |
|---|---|---|---|---|---|
| **Baseline Cohort (Q1–Q2)** | 392 | 22,193 | **169.1 cp** | **18.4%** | **24.2%** |
| **Recent Cohort (Q3–Q4)** | 393 | 26,091 | **107.3 cp** | **10.4%** | **32.0%** |
| **Longitudinal Delta** | +393 | +3,898 | **-36.5% CPL** | **-43.5% Blunders** | **+32.2% Best** |

### Chronological Quartile Progression
- **Cohort Q1 (197 games)**: 193.5 CPL | 21.8% Blunders | 22.9% Best Moves (10,489 decisions)
- **Cohort Q2 (197 games)**: 146.7 CPL | 15.3% Blunders | 25.5% Best Moves (11,810 decisions)
- **Cohort Q3 (197 games)**: 110.9 CPL | 11.0% Blunders | 32.2% Best Moves (13,133 decisions)
- **Cohort Q4 (194 games)**: 103.8 CPL | 9.9% Blunders | 31.8% Best Moves (12,852 decisions)

---

## 4. Training $\rightarrow$ Gameplay Correlation Matrix
Empirical correlation tracks deliberate practice drill volume alongside category-specific gameplay CPL changes.

> **Scientific Principle**: Correlation does not establish direct causality without randomized controlled trials. Statements are reported strictly as empirical observations.

| Category | Drills Attempted | Drill Success | Baseline CPL | Recent CPL | CPL Change | Decisions ($N$) | Evidence Status |
|---|---|---|---|---|---|---|---|
| **OPENING** | 3 | 100% | 171.2 cp | 108.0 cp | **-36.9%** | 17,828 | **SUFFICIENT** |
| **ENDGAME** | 0 | — | 140.1 cp | 97.1 cp | **-30.7%** | 5,080 | **SUFFICIENT** |
| **TACTICAL** | 0 | — | 54.9 cp | 52.5 cp | **-4.4%** | 2,842 | **SUFFICIENT** |
| **DEFENSIVE** | 0 | — | 765.8 cp | 680.7 cp | **-11.1%** | 341 | **SUFFICIENT** |

---

## 5. Model Update Eligibility Gate
To prevent continuous unneeded retraining cycles on single-game additions, Phase 15 implements an explicit candidate eligibility gate:

### Criteria
- `minNewGames`: 30 new games since previous training run.
- `minNewPositions`: 500 new analyzed positions.
- `minDnaDivergencePct`: 15.0% change in personality matrix.

### Active User Status
- **User 1 (`KAKAROT0616`)**:
  - `status`: **`RETRAINING_ELIGIBLE`**
  - New Games Accumulated: **746 games** (Threshold: 30)
  - Eligible for candidate version increment in Phase 16.
- **User 2 (`keshav-33450`)**:
  - `status`: **`NO_UPDATE_NEEDED`**
  - Models synchronized with existing games.
