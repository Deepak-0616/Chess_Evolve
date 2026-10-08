# Chess Evolve Accuracy Evaluation

## Purpose
This folder contains the verified, mathematically corrected evaluation results of the trained Current Self and Peak Self models. 
The objective is to evaluate model prediction metrics against real player move decisions and multi-objective policy utility targets.

## Models
- **Current Self**: Dual-encoder PyTorch network predicting how the player historically tends to play among legal candidate moves.
- **Peak Self**: Multi-objective neural ranker predicting a stronger version of the player's style while preserving behavioral identity and correcting recurring weaknesses.

## Data Source & Active Models
- **Database**: Active Supabase PostgreSQL Database (`MLModelVersion` registry)
- **KAKAROT0616 Active Models**:
  - Current Self: Version 2 (`178b09cd-ea92-43f7-9561-c000a3985f2e`, Dataset `53487697-a46e-4bd5-99fc-6663080d9236`)
  - Peak Self: Version 2 (`6745b5b8-c216-4521-81d2-558f02090088`, Dataset `787172e4-e4ca-4b60-849f-452dd7d68c7a`)
- **Evaluation Split**: Strict held-out test split (42 positions, 223 candidates)

## Authoritative Documentation
- Refer to `ACCURACY_TABLE.md` for the comprehensive official evaluation tables, training summaries, and architectural specifications.
- Machine-readable records: `accuracy_report.json` and `accuracy_report.csv`.
