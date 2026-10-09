import requests
import json
import chess

# Test ML Service predict endpoint directly
ML_URL = "http://localhost:8000/api/v1/ml/predict"
USER_ID = "4f61405c-08e6-4990-9036-3d02a2bc6a27"

def run_tests():
    # Test position 1: Standard opening after 1. e4
    fen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1"
    
    # 5 Candidate moves with simulated centipawn loss and tactical flags
    candidates = [
        {"move": "c7c5", "san": "c5", "rank": 1, "score": -0.2, "cp_loss": 0, "is_capture": False, "is_check": False, "is_castle": False, "is_promotion": False},
        {"move": "e7e5", "san": "e5", "rank": 2, "score": -0.3, "cp_loss": 10, "is_capture": False, "is_check": False, "is_castle": False, "is_promotion": False},
        {"move": "e7e6", "san": "e6", "rank": 3, "score": -0.4, "cp_loss": 20, "is_capture": False, "is_check": False, "is_castle": False, "is_promotion": False},
        {"move": "c7c6", "san": "c6", "rank": 4, "score": -0.45, "cp_loss": 25, "is_capture": False, "is_check": False, "is_castle": False, "is_promotion": False},
        {"move": "g8f6", "san": "Nf6", "rank": 5, "score": -0.55, "cp_loss": 35, "is_capture": False, "is_check": False, "is_castle": False, "is_promotion": False},
    ]

    print("=== Testing CURRENT_SELF Prediction ===")
    req_cs = {
        "user_id": USER_ID,
        "fen": fen,
        "candidates": candidates,
        "move_number": 1,
        "game_phase": "OPENING",
        "model_type": "CURRENT_SELF"
    }
    
    res_cs = requests.post(ML_URL, json=req_cs)
    print("CS Status:", res_cs.status_code)
    if res_cs.status_code == 200:
        cs_data = res_cs.json()
        print("CS Recommended Move:", cs_data.get("recommendedMove"))
        print("CS Confidence:", cs_data.get("confidence"))
        print("CS Probabilities:", cs_data.get("moveProbabilities"))
        assert cs_data.get("recommendedMove") in [c["move"] for c in candidates], "Invalid recommended move"
        assert abs(sum(cs_data.get("moveProbabilities", {}).values()) - 1.0) < 1e-3, "Probabilities do not sum to 1"
        print(">>> CURRENT_SELF PASSED! <<<")
    else:
        print("CS Error:", res_cs.text)

    print("\n=== Testing PEAK_SELF Prediction ===")
    # Include a blunder candidate to verify blunder penalty
    candidates_with_blunder = [
        {"move": "c7c5", "san": "c5", "rank": 1, "score": -0.2, "cp_loss": 0, "is_capture": False, "is_check": False, "is_castle": False, "is_promotion": False},
        {"move": "e7e5", "san": "e5", "rank": 2, "score": -0.3, "cp_loss": 15, "is_capture": False, "is_check": False, "is_castle": False, "is_promotion": False},
        {"move": "f7f5", "san": "f5", "rank": 3, "score": -2.8, "cp_loss": 260, "is_capture": False, "is_check": False, "is_castle": False, "is_promotion": False}, # Blunder
    ]
    
    req_ps = {
        "user_id": USER_ID,
        "fen": fen,
        "candidates": candidates_with_blunder,
        "move_number": 1,
        "game_phase": "OPENING",
        "model_type": "PEAK_SELF"
    }
    
    res_ps = requests.post(ML_URL, json=req_ps)
    print("PS Status:", res_ps.status_code)
    if res_ps.status_code == 200:
        ps_data = res_ps.json()
        print("PS Recommended Move:", ps_data.get("recommendedMove"))
        print("PS Confidence:", ps_data.get("confidence"))
        print("PS Probabilities:", ps_data.get("moveProbabilities"))
        assert ps_data.get("recommendedMove") != "f7f5", "Peak Self should not choose a blunder with cp_loss 260!"
        assert abs(sum(ps_data.get("moveProbabilities", {}).values()) - 1.0) < 1e-3, "Probabilities do not sum to 1"
        print(">>> PEAK_SELF PASSED! Blunder correctly penalized. <<<")
    else:
        print("PS Error:", res_ps.text)

if __name__ == "__main__":
    run_tests()
