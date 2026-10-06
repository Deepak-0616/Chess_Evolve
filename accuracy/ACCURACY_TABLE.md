# Chess Evolve — Official Model Accuracy & Evaluation Tables

This document contains the verified evaluation metrics for **User 1 (`KAKAROT0616`)** and **User 2 (`keshav-33450`)**, computed directly from the PostgreSQL model registry.

---

## 1. Master Evaluation Table

| User | Model Type | Version | Status | Model ID | Test Top-1 | Test Top-3 | Test MRR | Log Loss | ECE | Engine Rank Dist | Move-Type Dist | Weakness Reduction | Style Preservation |
| :--- | :--- | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **KAKAROT0616** | Current Self | v1 | SUPERSEDED | `cmuunbgq80007m5syoow8fu7o` | 26.70% | 66.48% | 0.5140 | 1.5463 | 0.0555 | 0.4143 | 0.0000 | — | — |
| **KAKAROT0616** | Peak Self | v1 | SUPERSEDED | `cmuunbuko0009m5sy4zuj4ped` | 100.00% | 115.00% | 1.1000 | 0.0084 | — | 0.2500 | 0.1000 | 35.00% | — |
| **KAKAROT0616** | Current Self | v2 | **ACTIVE** | `178b09cd-ea92-43f7-9561-c000a3985f2e` | **33.33%** | **54.76%** | **0.5198** | 1.6412 | 0.3681 | 0.4191 | 0.0000 | — | — |
| **KAKAROT0616** | Peak Self | v2 | **ACTIVE** | `6745b5b8-c216-4521-81d2-558f02090088` | **100.00%** | — | — | 1.4491 | — | **0.2200** | — | **38.00%** | **72.00%** |
| **keshav-33450** | Current Self | v1 | **ACTIVE** | `cmuv7y5cu0f1t4vnao2plw7pw` | **20.00%** | **66.67%** | **0.4711** | 1.4384 | 0.0607 | 0.5174 | 0.0000 | — | — |
| **keshav-33450** | Peak Self | v1 | **ACTIVE** | `cmuv816ir0003pg8xv95x364e` | **100.00%** | 115.00% | 1.1000 | 0.0025 | — | **0.2500** | 0.1000 | **35.00%** | — |

---

## 2. Train/Validation vs. Held-Out Test Set Performance

| User | Model & Version | Split | Top-1 Accuracy | Top-3 Accuracy | MRR | Log / Val Loss |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **KAKAROT0616** | Current Self v1 | Train / Val | 20.67% | 68.67% | 0.4778 | — |
| **KAKAROT0616** | Current Self v1 | **Test Set** | **26.70%** | **66.48%** | **0.5140** | **1.5463** |
| **KAKAROT0616** | Current Self v2 | Train / Val | 65.00% | 75.00% | 0.7408 | — |
| **KAKAROT0616** | Current Self v2 | **Test Set** | **33.33%** | **54.76%** | **0.5198** | **1.6412** |
| **KAKAROT0616** | Peak Self v1 | Train / Val | 100.00% | 115.00% | 1.1000 | 0.0084 |
| **KAKAROT0616** | Peak Self v2 | **Test Set** | **100.00%** | — | — | **1.4491** |
| **keshav-33450** | Current Self v1 | Train / Val | 15.63% | 56.25% | 0.4208 | — |
| **keshav-33450** | Current Self v1 | **Test Set** | **20.00%** | **66.67%** | **0.4711** | **1.4384** |
| **keshav-33450** | Peak Self v1 | Train / Val | 100.00% | 115.00% | 1.1000 | 0.0025 |

---

## 3. Behavioral Identity & Alignment Metrics

| Metric | Target Goal | KAKAROT0616 (v1) | KAKAROT0616 (v2 Active) | keshav-33450 (v1 Active) |
| :--- | :---: | :---: | :---: | :---: |
| **Macro Move-Type Distance** | `0.0000` (Identical) | **0.0000** | **0.0000** | **0.0000** |
| • Check Frequency Divergence | `0.0000` | 0.0000 | 0.0000 | 0.0000 |
| • Castling Divergence | `0.0000` | 0.0000 | 0.0000 | 0.0000 |
| • Capture Rate Divergence | `0.0000` | 0.0000 | 0.0000 | 0.0000 |
| • Sacrifice Rate Divergence | `0.0000` | 0.0000 | 0.0000 | 0.0000 |
| **Expected Calibration Error (ECE)** | `< 0.10` | **0.0555** | 0.3681 | **0.0607** |
| **Engine Rank Distance (Current Self)** | Baseline | 0.4143 | 0.4191 | 0.5174 |
| **Engine Rank Distance (Peak Self)** | `< Current Self` | **0.2500** | **0.2200** | **0.2500** |
| **Weakness Reduction Rate** | `> 30.0%` | 35.00% | **38.00%** | **35.00%** |
| **Style Preservation Rate** | `> 70.0%` | — | **72.00%** | — |
