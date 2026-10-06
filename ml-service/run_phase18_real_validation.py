import os
import sys
import requests
import json
from app.db import get_engine
from sqlalchemy import text

def main():
    print("--- Phase 18 ML Service Real Validation ---")
    engine = get_engine()
    with engine.connect() as conn:
        users = conn.execute(text('SELECT id, email FROM "User" LIMIT 5')).fetchall()
        print("Users found:", len(users))
        for u in users:
            print(f"  User: id={u[0]} email={u[1]}")

        active_models = conn.execute(text(
            'SELECT id, "userId", "modelType", version, "isActive", status, "artifactPath", "artifactChecksum" '
            'FROM "MLModelVersion" WHERE "isActive" = true'
        )).fetchall()
        print(f"Active Models found: {len(active_models)}")
        for m in active_models:
            print(f"  Model: id={m[0]} user_id={m[1]} type={m[2]} v{m[3]} status={m[5]} artifact={m[6]} checksum={m[7]}")

    # Check health and ready
    health_res = requests.get("http://localhost:8000/health")
    ready_res = requests.get("http://localhost:8000/ready")
    print(f"Health Response ({health_res.status_code}):", health_res.json())
    print(f"Ready Response ({ready_res.status_code}):", ready_res.json())
    assert health_res.status_code == 200, "Health check failed"
    assert ready_res.status_code == 200, "Ready check failed"

    # For each active model, perform inference test
    fen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1"
    candidates = [
        {"move": "e7e5", "score": 15, "centipawn_loss": 0, "engine_rank": 1, "is_capture": False, "is_check": False, "is_castle": False},
        {"move": "c7c5", "score": 10, "centipawn_loss": 5, "engine_rank": 2, "is_capture": False, "is_check": False, "is_castle": False},
        {"move": "e7e6", "score": -5, "centipawn_loss": 20, "engine_rank": 3, "is_capture": False, "is_check": False, "is_castle": False},
        {"move": "c7c6", "score": -10, "centipawn_loss": 25, "engine_rank": 4, "is_capture": False, "is_check": False, "is_castle": False},
    ]

    for m in active_models:
        model_id, user_id, model_type, version = m[0], m[1], m[2], m[3]
        print(f"\nTesting Inference for User={user_id} Model={model_type} v{version} (ModelId={model_id})...")
        payload = {
            "user_id": user_id,
            "model_type": model_type,
            "model_version_id": model_id,
            "fen": fen,
            "candidates": candidates,
            "move_number": 1,
            "game_phase": "OPENING"
        }
        res = requests.post("http://localhost:8000/api/v1/ml/predict", json=payload)
        print(f"  Status: {res.status_code}")
        assert res.status_code == 200, f"Inference failed: {res.text}"
        data = res.json()
        print(f"  Returned move: {data.get('recommendedMove')} (confidence: {data.get('confidence')})")
        print(f"  Probabilities: {data.get('moveProbabilities')}")
        probs = data.get("moveProbabilities", {})
        prob_sum = sum(probs.values())
        print(f"  Sum of probabilities: {prob_sum:.4f}")
        assert abs(prob_sum - 1.0) < 0.05, f"Probabilities do not sum to 1.0 (got {prob_sum})"
        candidate_moves = [c["move"] for c in candidates]
        assert data.get("recommendedMove") in candidate_moves, f"Move {data.get('recommendedMove')} is not in candidates"
        print("  --> PASS: Move is legal and probabilities sum to 1.0.")

if __name__ == "__main__":
    main()
