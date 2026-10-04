from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict
import torch
import os

from app.features.extractor import FeatureExtractor
from app.models.current_self import CurrentSelfModel
from app.models.peak_self import PeakSelfModel
from app.training.trainer import ModelTrainer

app = FastAPI(
    title="Chess Evolve ML Service",
    version="1.0.0",
    description="PyTorch Candidate Move Ranker & Peak Self Style Optimizer Inference Engine",
)

class TrainRequest(BaseModel):
    user_id: str
    model_type: str
    games_count: int
    positions_count: int

class PredictRequest(BaseModel):
    user_id: str
    model_type: str
    fen: str
    legal_moves: List[str]

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "Chess Evolve ML PyTorch Engine", "pytorch_version": torch.__version__}

@app.post("/api/v1/train")
def train_model(req: TrainRequest):
    try:
        res = ModelTrainer.train_user_model(
            user_id=req.user_id,
            model_type=req.model_type,
            games_count=req.games_count,
            positions_count=req.positions_count
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/predict")
def predict_move(req: PredictRequest):
    if not req.legal_moves:
        raise HTTPException(status_code=400, detail="legal_moves list cannot be empty")

    features = FeatureExtractor.fen_to_features(req.fen)
    tensor_input = torch.tensor(features, dtype=torch.float32)

    # Load model weights if exists, or instantiate fresh
    artifact_path = f"artifacts/{req.user_id}_{req.model_type.lower()}_v1.pt"
    if req.model_type == "CURRENT_SELF":
        model = CurrentSelfModel()
    else:
        model = PeakSelfModel()

    if os.path.exists(artifact_path):
        try:
            model.load_state_dict(torch.load(artifact_path))
        except Exception:
            pass

    model.eval()
    with torch.no_grad():
        probs = model(tensor_input)[0].numpy()

    # Map output probability logits to candidate legal moves
    move_probs: Dict[str, float] = {}
    for idx, move in enumerate(req.legal_moves):
        score = float(probs[idx % len(probs)])
        move_probs[move] = score

    # Select move with highest probability
    best_move = max(move_probs, key=move_probs.get)

    return {
        "recommendedMove": best_move,
        "confidence": round(float(move_probs[best_move]), 4),
        "moveProbabilities": move_probs,
        "modelType": req.model_type,
        "modelVersion": 1
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
