from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
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

@app.get("/ready")
def readiness_check():
    from app.db import get_engine
    from sqlalchemy import text
    checks = {
        "database": "unknown",
        "pytorch": "healthy" if torch.__version__ else "unhealthy",
        "storage": "healthy" if os.path.exists("./artifacts") or os.access(".", os.W_OK) else "degraded",
    }
    all_healthy = True

    try:
        engine = get_engine()
        with engine.connect() as conn:
            conn.execute(text("SELECT 1")).fetchone()
            checks["database"] = "healthy"
    except Exception as e:
        checks["database"] = f"unhealthy: {str(e)}"
        all_healthy = False

    if not all_healthy:
        raise HTTPException(status_code=503, detail={"status": "unhealthy", "checks": checks})

    return {"status": "ready", "checks": checks}

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

from app.features.feature_pipeline import extract_features_for_batch

class FeatureGenerateRequest(BaseModel):
    batch: List[Dict[str, Any]]
    feature_version: str = "v1"

@app.post("/api/v1/ml/features/generate")
def generate_features(req: FeatureGenerateRequest):
    try:
        records = extract_features_for_batch(req.batch, feature_version=req.feature_version)
        return {"success": True, "records": records, "count": len(records)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from app.datasets.dataset_pipeline import build_datasets_from_batch
from app.datasets.schemas import DatasetGenerationRequest

@app.post("/api/v1/ml/datasets/generate")
def generate_datasets(req: DatasetGenerationRequest):
    try:
        records = build_datasets_from_batch(req)
        return {"success": True, "records": records, "count": len(records)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from app.train_api import router as train_router
from app.inference_api import router as inference_router
from app.retraining.router import router as retraining_router
app.include_router(train_router)
app.include_router(inference_router)
app.include_router(retraining_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
