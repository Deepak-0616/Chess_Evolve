# Chess Evolve Accuracy Evaluation

## Purpose
This folder contains the actual evaluation results of the trained Current Self and Peak Self models. 
The objective is to evaluate model prediction metrics against real player move decisions and compare the differences.

## Models
- **Current Self**: Predicts how the player historically tends to play.
- **Peak Self**: Predicts a stronger version of the player's style while attempting to preserve behavioral identity.

## Data Source
- **Database**: Active Supabase Postgres DB
- **Current Self Version**: 1
- **Peak Self Version**: 1

## Results
Please refer to `accuracy_report.csv` and `accuracy_report.json` for detailed metrics.
