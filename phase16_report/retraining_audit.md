# Retraining Audit Log — Phase 16

## Audit Overview
- **User Discovered Dynamically**: `KAKAROT0616` (`b2ea5969-f4a9-4fb6-9228-10a3bd42adcf`)
- **Initial State**: 746 new games since initial v1 training, `status = RETRAINING_ELIGIBLE`
- **Job ID**: `b15587dd-dfcb-4e62-91d9-8fd3aa5d0528`
- **Trigger**: `MANUAL` / `ELIGIBILITY`
- **Execution Mode**: Continuous Retraining with Conditional Atomic Activation

---

## Chronological Audit Trail

| Timestamp (UTC) | Pipeline Stage | Action | Result | Details |
|---|---|---|---|---|
| 2026-10-05 17:10:48 | `DATASET_GENERATION` | Query chronological games & generate expanding-window dataset v2 | **PASS** | 100 games (70 Train, 15 Val, 15 Test), 5,813 positions, zero temporal leakage. |
| 2026-10-05 17:10:52 | `TRAINING_CURRENT_SELF` | Train Current Self candidate v2 on Train split (70 games) | **PASS** | AdamW optimizer, lr=1e-4, 6 epochs, best checkpoint saved at `artifacts/current_self/b2ea5969-f4a9-4fb6-9228-10a3bd42adcf/v2/checkpoint_best.pt`. |
| 2026-10-05 17:10:56 | `EVALUATING_CURRENT_SELF` | Evaluate on untouched Test split (15 games) | **PASS** | Top-1: 33.3%, Top-3: 54.8%, MRR: 0.520, Log Loss: 1.641, ECE: 0.368, Engine Rank Dist: 0.419. |
| 2026-10-05 17:10:57 | `QUALITY_GATE_CURRENT_SELF` | Check predictive quality, calibration, behavioral divergence, & regression vs active v1 | **PASS** | Candidate passed all regression tolerances (Top-1 regression tolerance 0.05, MRR tolerance 0.05). Artifact audited: valid tensors, no NaN/Inf, probabilities sum to 1.0. Marked `READY`. |
| 2026-10-05 17:10:58 | `TRAINING_PEAK_SELF` | Train Peak Self candidate v2 with explicit dependency `dependentModelVersionId = Current Self v2 ID` | **PASS** | Softmax cross-entropy on multi-objective Peak targets. Checkpoint saved at `artifacts/peak_self/b68b270d-dfca-4d43-9c16-7d72241459e4`. |
| 2026-10-05 17:11:02 | `EVALUATING_PEAK_SELF` | Evaluate Peak candidate on untouched Test split | **PASS** | Target Top-1: 100%, Stockfish Top-1 rate: 100%, Engine Rank Dist: 0.22, Style Preservation: 72%, Weakness Reduction: 38%. |
| 2026-10-05 17:11:03 | `QUALITY_GATE_PEAK_SELF` | Verify dependency lock, style collapse prevention, & personality preservation | **PASS** | Dependency verified strictly to `178b09cd-ea92-43f7-9561-c000a3985f2e`. Engine rank distance > 0.05 (no collapse), style preservation 72% > 40%. Marked `READY`. |
| 2026-10-05 17:11:07 | `ATOMIC_ACTIVATION` | Atomic PostgreSQL transaction: verify both gates PASS, deactivate v1, activate v2, log evolution milestone | **PASS** | Current Self v1 -> `SUPERSEDED`, Peak Self v1 -> `SUPERSEDED`. Current Self v2 -> `ACTIVE`, Peak Self v2 -> `ACTIVE`. Evolution milestone `80e638d6-3158-4922-9f0d-eb96960d666f` created. `ModelUpdateCandidate.status` -> `ACTIVATED`. |

---

## Invariant Confirmations
1. **Model Preservation**: Version 1 models (`cmuunbgq80007m5syoow8fu7o`, `cmuunbuko0009m5sy4zuj4ped`) were **NEVER deleted or overwritten**. They remain securely stored with status `SUPERSEDED` and `isActive = false`.
2. **Atomic Invariant**: Both Current Self and Peak Self were activated within a single transaction with row-level locks.
3. **Dependency Graph Invariant**: Peak Self v2 strictly references Current Self v2 (`178b09cd-ea92-43f7-9561-c000a3985f2e`).
