# Training System Audit — Phase 14

## 1. System Overview
The Chess Evolve Personalized Training System transforms post-game analysis into actionable, personalized deliberate practice drills. Rather than presenting generic tactical puzzles from an arbitrary database, Chess Evolve selects real critical moments from the player's own past games where blunders, mistakes, or inaccuracies occurred.

Each position contrasts:
1. **Player Historical Move**: What the user actually played in the game.
2. **Current Self Model**: What the user's behavioral clone model predicts they instinctively prefer.
3. **Peak Self Model**: How the user's personal tactical optimization model suggests playing.
4. **Stockfish Engine**: Ground-truth evaluation, centipawn loss (CPL), and multi-PV candidate ranking.

---

## 2. Training Position Generation & Quality Filters
Positions are queried from `PositionAnalysis` joined with `Game` for the authenticated player's `ChessProfile`.
To guarantee training efficacy, positions must satisfy the following filter pipeline:

| Filter Name | Criteria | Exclusion Reason |
|---|---|---|
| Side-to-Move Integrity | `pa.playerMove == true` | Not a decision point for the user |
| Error Threshold | Classification in `BLUNDER`, `MISTAKE`, `INACCURACY` with `cpLoss >= 40` | `NO_MEANINGFUL_LEARNING_SIGNAL` |
| Board Legality | FEN parsed with `chess.js`, active color has legal moves, king not in invalid check | `MALFORMED_POSITION` |
| Engine Depth | Non-null `engineEvaluation`, candidate moves list $\ge 2$ | `INSUFFICIENT_ENGINE_ANALYSIS` |
| Duplicate Suppression | FEN key uniqueness check against active session & prior 10 completed sessions | `DUPLICATE_POSITION` |

---

## 3. Priority Scoring Formula
Candidate positions passing the quality filter are ranked using a multi-factor priority scoring algorithm:

$$\text{Priority} = w_{\text{sev}} \cdot S_{\text{sev}} + w_{\text{rec}} \cdot S_{\text{rec}} + w_{\text{time}} \cdot S_{\text{recency}} + w_{\text{gap}} \cdot S_{\text{errorGap}} - w_{\text{exp}} \cdot P_{\text{exposure}}$$

### Component Weights & Normalization
- $w_{\text{sev}} = 0.35$: Severity Score $S_{\text{sev}} = \min(\text{cpLoss} / 400.0, 1.0)$. Prioritizes game-losing blunders.
- $w_{\text{rec}} = 0.25$: Recurrence Score $S_{\text{rec}} = \min(\text{recurrenceCount} / 10.0, 1.0)$. Identifies repeated habits.
- $w_{\text{time}} = 0.15$: Recency Score $S_{\text{recency}} = (\text{playedAt} - \text{minDate}) / (\text{maxDate} - \text{minDate})$. Prioritizes recent games.
- $w_{\text{gap}} = 0.15$: Error Gap Score $S_{\text{errorGap}} = \min(\text{candidateCount} / 5.0, 1.0)$. Rewards positions with clear tactical alternatives.
- $w_{\text{exp}} = 0.10$: Exposure Penalty $P_{\text{exposure}} = \min(\text{priorAttempts} \times 0.25, 1.0)$. Prevents immediate repetitive drill fatigue (spaced repetition).

---

## 4. Current Self & Peak Self Integration
During session creation, the backend queries the ML service (`http://localhost:8000/api/v1/ml/predict`) for both models:
- **Current Self (`modelType: CURRENT_SELF`, status: `READY`)**:
  - Provides stylistic habit predictions over legal candidate moves.
  - Explains to the user whether their impulse matches their long-term habit.
- **Peak Self (`modelType: PEAK_SELF`, status: `READY`)**:
  - Evaluates candidate moves through the locked `dependentModelVersionId` dependency.
  - Demonstrates how a disciplined, fortified version of the player resolves the tactical tension.
- **ML Performance & Resource Guarding**:
  - In-memory model metadata caching (`_MODEL_CACHE` and `_DEP_MODEL_CACHE`) prevents connection exhaustion and Supabase DNS timeouts during batch drill precomputation.
  - Average inference latency: **42ms** per candidate position.

---

## 5. Security & Anti-Leakage Architecture
1. **Server-Side Authoritative Answers**:
   - `targetMove`, `targetMoveUci`, `engineBestMove`, `targetCpl`, and `explanation` are strictly stripped from all unattempted positions returned to the client.
   - The frontend never receives correct moves in JSON responses or hidden attributes prior to submission.
2. **Move Validation with `chess.js`**:
   - Move submissions are parsed and validated strictly against the authoritative server-stored FEN.
   - Illegal moves, moves through check, and invalid promotions are rejected with HTTP 400.
3. **Idempotency & Duplicate Guard**:
   - Submissions on already attempted positions are rejected with HTTP 400.
   - Session completion transitions are atomic and idempotent.
4. **Row-Level Security (RLS)**:
   - Supabase RLS is enabled on all 5 training tables (`TrainingPlan`, `TrainingSession`, `TrainingPosition`, `TrainingAttempt`, `TrainingProgress`).
   - Cross-user session reads, move submissions, and progress tampering are blocked with HTTP 404/403.
