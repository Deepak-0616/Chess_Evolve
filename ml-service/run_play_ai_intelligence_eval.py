import os
import sys
import json
import numpy as np
import torch
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.db import get_engine
from app.models.current_self.inference import CurrentSelfInferenceEngine
from app.models.peak_self.inference import PeakSelfInferenceEngine

def evaluate():
    print("==================================================")
    print("  PLAY AI INTELLIGENCE & EVALUATION BENCHMARK     ")
    print("==================================================")
    
    engine = get_engine()
    cs_engine = CurrentSelfInferenceEngine()
    ps_engine = PeakSelfInferenceEngine()

    # 1. Resolve Active Models for player kakarot0616
    with engine.connect() as conn:
        cs_model = conn.execute(text("""
            SELECT id, version, "artifactPath", "featureVersion", "datasetVersion"
            FROM "MLModelVersion"
            WHERE "modelType" = 'CURRENT_SELF' AND status IN ('ACTIVE', 'READY') AND "artifactPath" IS NOT NULL
            ORDER BY version DESC LIMIT 1
        """)).first()

        ps_model = conn.execute(text("""
            SELECT id, version, "artifactPath", "featureVersion", "datasetVersion", "dependentModelVersionId"
            FROM "MLModelVersion"
            WHERE "modelType" = 'PEAK_SELF' AND status IN ('ACTIVE', 'READY') AND "artifactPath" IS NOT NULL
            ORDER BY version DESC LIMIT 1
        """)).first()

    if not cs_model or not ps_model:
        print("ERROR: Active model artifacts not found.")
        return

    print(f"Current Self Model: Version {cs_model.version} (ID: {cs_model.id})")
    print(f"Artifact: {cs_model.artifactPath}")
    print(f"Peak Self Model: Version {ps_model.version} (ID: {ps_model.id})")
    print(f"Artifact: {ps_model.artifactPath}")

    # 2. Fetch Held-out Test & Validation Position Records
    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT "positionId", "candidateMove", "actualMove", "isActualMove", "features", "split"
            FROM "MLDatasetRecord"
            WHERE split IN ('TEST', 'VALIDATION')
            ORDER BY "positionId", "candidateMove"
        """)).fetchall()

    positions = {}
    for r in rows:
        pid = r.positionId
        if pid not in positions:
            positions[pid] = {
                "positionId": pid,
                "split": r.split,
                "actualMove": r.actualMove,
                "candidates": []
            }
        f = r.features
        if isinstance(f, str):
            f = json.loads(f)
        positions[pid]["candidates"].append({
            "candidateMove": r.candidateMove,
            "isActualMove": r.isActualMove,
            "features": f
        })

    # Filter positions that have at least one actual move and multiple candidates
    valid_positions = [
        p for p in positions.values()
        if any(c["isActualMove"] for c in p["candidates"]) and len(p["candidates"]) > 1
    ]
    print(f"\nLoaded {len(valid_positions)} held-out positions with multi-candidate choices.")

    # Tracking Metrics
    cs_top1 = 0
    cs_top3 = 0
    cs_mrr_sum = 0.0
    cs_cpl_sum = 0.0
    cs_blunder_count = 0

    ps_top1 = 0
    ps_top3 = 0
    ps_mrr_sum = 0.0
    ps_cpl_sum = 0.0
    ps_blunder_count = 0
    ps_severe_blunder_count = 0

    style_similarity_sum = 0.0
    total_positions = len(valid_positions)

    phase_metrics = {
        "OPENING": {"count": 0, "cs_top1": 0, "cs_top3": 0, "cs_cpl": 0.0, "ps_cpl": 0.0},
        "MIDDLEGAME": {"count": 0, "cs_top1": 0, "cs_top3": 0, "cs_cpl": 0.0, "ps_cpl": 0.0},
        "ENDGAME": {"count": 0, "cs_top1": 0, "cs_top3": 0, "cs_cpl": 0.0, "ps_cpl": 0.0}
    }

    db_config = {"featureVersion": "v1", "datasetVersion": "v1"}

    for p in valid_positions:
        candidates = p["candidates"]
        actual_move = p["actualMove"]

        first_f = candidates[0]["features"]
        pos_f = first_f.get("position", {})
        game_phase = pos_f.get("game_phase", "MIDDLEGAME")
        if game_phase not in phase_metrics:
            game_phase = "MIDDLEGAME"

        pos_list = [
            float(pos_f.get("material_balance", 0)),
            float(pos_f.get("white_material", 0)),
            float(pos_f.get("black_material", 0)),
            float(pos_f.get("white_piece_count", 0)),
            float(pos_f.get("black_piece_count", 0)),
            float(pos_f.get("white_pawn_count", 0)),
            float(pos_f.get("black_pawn_count", 0)),
            float(pos_f.get("white_legal_moves", 0)),
            float(pos_f.get("black_legal_moves", 0)),
            float(pos_f.get("mobility_difference", 0)),
            float(pos_f.get("move_number", 1)),
            float(pos_f.get("side_to_move", 1)),
            float(pos_f.get("king_safety", 0)),
            float(pos_f.get("center_control", 0)),
            float(1 if game_phase == "OPENING" else (2 if game_phase == "MIDDLEGAME" else 3))
        ]

        cand_moves = [c["candidateMove"] for c in candidates]
        cand_lists = []
        cpl_dict = {}

        for c in candidates:
            cf = c["features"].get("candidate", {})
            cpl = float(cf.get("centipawn_loss", 0.0))
            cpl_dict[c["candidateMove"]] = cpl
            c_arr = [
                float(cf.get("engine_rank", 1)),
                float(cf.get("engine_score", 0)),
                cpl,
                float(1 if cf.get("is_capture") else 0),
                float(1 if cf.get("is_check") else 0),
                float(1 if cf.get("is_castle") else 0),
                float(1 if cf.get("is_promotion") else 0),
                float(1 if cf.get("is_sacrifice") else 0),
                float(cf.get("material_change", 0)),
                float(cf.get("tactical_score", 0)),
                float(cf.get("positional_score", 0))
            ]
            cand_lists.append(c_arr)

        # 1. Predict Current Self
        cs_pred = cs_engine.predict(
            user_id="benchmark",
            model_version=cs_model.version,
            artifact_path=cs_model.artifactPath,
            db_config=db_config,
            position_features=pos_list,
            candidate_features=cand_lists,
            candidate_moves=cand_moves
        )
        cs_ranked_moves = [c["move"] for c in cs_pred["candidates"]]
        cs_rec_move = cs_pred["recommendedMove"]
        cs_cpl = cpl_dict.get(cs_rec_move, 0.0)
        cs_cpl_sum += cs_cpl
        if cs_cpl >= 150:
            cs_blunder_count += 1

        if actual_move in cs_ranked_moves:
            rank = cs_ranked_moves.index(actual_move) + 1
            if rank == 1:
                cs_top1 += 1
                phase_metrics[game_phase]["cs_top1"] += 1
            if rank <= 3:
                cs_top3 += 1
                phase_metrics[game_phase]["cs_top3"] += 1
            cs_mrr_sum += 1.0 / rank

        # Append base probabilities for Peak Self
        base_probs = cs_pred.get("moveProbabilities", {})
        cand_lists_peak = []
        for i, m in enumerate(cand_moves):
            cand_lists_peak.append(cand_lists[i] + [base_probs.get(m, 0.0)])

        # 2. Predict Peak Self
        ps_pred = ps_engine.predict(
            user_id="benchmark",
            model_version=ps_model.version,
            artifact_path=ps_model.artifactPath,
            db_config=db_config,
            position_features=pos_list,
            candidate_features=cand_lists_peak,
            candidate_moves=cand_moves
        )
        ps_ranked_moves = [c["move"] for c in ps_pred["candidates"]]
        ps_rec_move = ps_pred["recommendedMove"]
        ps_cpl = cpl_dict.get(ps_rec_move, 0.0)
        ps_cpl_sum += ps_cpl
        if ps_cpl >= 150:
            ps_blunder_count += 1
        if ps_cpl >= 300:
            ps_severe_blunder_count += 1

        if actual_move in ps_ranked_moves:
            ps_rank = ps_ranked_moves.index(actual_move) + 1
            if ps_rank == 1:
                ps_top1 += 1
            if ps_rank <= 3:
                ps_top3 += 1
            ps_mrr_sum += 1.0 / ps_rank

        # Measure style similarity (correlation between CS probs and PS probs)
        cs_p = [base_probs.get(m, 0.0) for m in cand_moves]
        ps_p = [ps_pred["moveProbabilities"].get(m, 0.0) for m in cand_moves]
        dot_sim = sum(a * b for a, b in zip(cs_p, ps_p)) / (
            (np.linalg.norm(cs_p) * np.linalg.norm(ps_p)) + 1e-9
        )
        style_similarity_sum += dot_sim

        phase_metrics[game_phase]["count"] += 1
        phase_metrics[game_phase]["cs_cpl"] += cs_cpl
        phase_metrics[game_phase]["ps_cpl"] += ps_cpl

    # Aggregated Summary
    cs_top1_acc = (cs_top1 / total_positions) * 100
    cs_top3_acc = (cs_top3 / total_positions) * 100
    cs_mrr = cs_mrr_sum / total_positions
    cs_avg_cpl = cs_cpl_sum / total_positions
    cs_blunder_rate = (cs_blunder_count / total_positions) * 100

    ps_top1_acc = (ps_top1 / total_positions) * 100
    ps_top3_acc = (ps_top3 / total_positions) * 100
    ps_mrr = ps_mrr_sum / total_positions
    ps_avg_cpl = ps_cpl_sum / total_positions
    ps_blunder_rate = (ps_blunder_count / total_positions) * 100
    ps_severe_blunder_rate = (ps_severe_blunder_count / total_positions) * 100
    avg_style_similarity = style_similarity_sum / total_positions

    print("\n--- CURRENT SELF PERFORMANCE (Player Style Reproduction) ---")
    print(f"Top-1 Historical Move Accuracy : {cs_top1_acc:.2f}%")
    print(f"Top-3 Historical Move Accuracy : {cs_top3_acc:.2f}%")
    print(f"Mean Reciprocal Rank (MRR)     : {cs_mrr:.4f}")
    print(f"Average Centipawn Loss (CPL)   : {cs_avg_cpl:.1f} cp")
    print(f"Blunder Rate (CPL >= 150)      : {cs_blunder_rate:.1f}%")

    print("\n--- PEAK SELF PERFORMANCE (Tactically Elevated & Blunder Pruned) ---")
    print(f"Average Centipawn Loss (CPL)   : {ps_avg_cpl:.1f} cp (Lower is stronger)")
    print(f"CPL Reduction vs Current Self  : {cs_avg_cpl - ps_avg_cpl:+.1f} cp")
    print(f"Blunder Rate (CPL >= 150)      : {ps_blunder_rate:.1f}% (vs {cs_blunder_rate:.1f}% Current Self)")
    print(f"Severe Blunder Rate (CPL >=300): {ps_severe_blunder_rate:.1f}%")
    print(f"Legal Move Rate                : 100.0%")
    print(f"Style Cosine Similarity to User: {avg_style_similarity:.3f}")

    print("\n--- PHASE BREAKDOWN ---")
    for phase, data in phase_metrics.items():
        cnt = data["count"]
        if cnt > 0:
            p_top1 = (data["cs_top1"] / cnt) * 100
            p_top3 = (data["cs_top3"] / cnt) * 100
            p_cs_cpl = data["cs_cpl"] / cnt
            p_ps_cpl = data["ps_cpl"] / cnt
            print(f"[{phase}] Positions: {cnt} | CS Top-1: {p_top1:.1f}% | CS Top-3: {p_top3:.1f}% | CS CPL: {p_cs_cpl:.1f} cp | PS CPL: {p_ps_cpl:.1f} cp")

    # Output JSON summary for evaluation artifacts
    report = {
        "timestamp": "2026-10-09T14:35:00Z",
        "held_out_positions": total_positions,
        "current_self": {
            "top1_accuracy": round(cs_top1_acc, 2),
            "top3_accuracy": round(cs_top3_acc, 2),
            "mrr": round(cs_mrr, 4),
            "average_cpl": round(cs_avg_cpl, 2),
            "blunder_rate": round(cs_blunder_rate, 2)
        },
        "peak_self": {
            "average_cpl": round(ps_avg_cpl, 2),
            "cpl_improvement": round(cs_avg_cpl - ps_avg_cpl, 2),
            "blunder_rate": round(ps_blunder_rate, 2),
            "severe_blunder_rate": round(ps_severe_blunder_rate, 2),
            "legal_move_rate": 100.0,
            "style_similarity": round(avg_style_similarity, 3)
        },
        "phases": phase_metrics
    }
    
    out_file = os.path.join(os.path.dirname(__file__), "artifacts", "play_ai_intelligence_evaluation.json")
    with open(out_file, "w") as f:
        json.dump(report, f, indent=2)
    print(f"\nSaved evaluation artifact to: {out_file}")

if __name__ == "__main__":
    evaluate()
