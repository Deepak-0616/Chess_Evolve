import torch
import torch.nn.functional as F
import os
import threading
from .model import CurrentSelfModel
from .config import CurrentSelfTrainingConfig

class ModelCache:
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(ModelCache, cls).__new__(cls)
                cls._instance.cache = {}
        return cls._instance
        
    def get(self, user_id: str, model_version: int):
        return self.cache.get((user_id, model_version))
        
    def set(self, user_id: str, model_version: int, model: torch.nn.Module, config: dict):
        self.cache[(user_id, model_version)] = {"model": model, "config": config}
        
    def invalidate(self, user_id: str):
        keys_to_delete = [k for k in self.cache.keys() if k[0] == user_id]
        for k in keys_to_delete:
            del self.cache[k]


class CurrentSelfInferenceEngine:
    def __init__(self):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.cache = ModelCache()
        
    def load_model(self, user_id: str, model_version: int, artifact_path: str, db_config: dict):
        cached = self.cache.get(user_id, model_version)
        if cached:
            return cached["model"], cached["config"]
            
        if not os.path.exists(artifact_path):
            raise FileNotFoundError(f"Model artifact not found at {artifact_path}")
            
        config = CurrentSelfTrainingConfig()
        model = CurrentSelfModel(config).to(self.device)
        
        checkpoint = torch.load(artifact_path, map_location=self.device)
        model.load_state_dict(checkpoint["model_state_dict"])
        model.eval()
        
        self.cache.set(user_id, model_version, model, db_config)
        return model, db_config

    def predict(self, user_id: str, model_version: int, artifact_path: str, db_config: dict, position_features: list, candidate_features: list, candidate_moves: list):
        """
        position_features: [dim]
        candidate_features: [[dim], [dim], ...]
        candidate_moves: ["e4", "d4", ...]
        """
        if len(candidate_moves) == 0:
            raise ValueError("No candidates provided.")
            
        model, config = self.load_model(user_id, model_version, artifact_path, db_config)
        
        # Verify feature version
        if config.get("featureVersion") != "v1":
            raise ValueError(f"Feature version mismatch. Model expects {config.get('featureVersion')}, got v1")
            
        pos_tensor = torch.tensor([position_features], dtype=torch.float32).to(self.device)
        cand_tensor = torch.tensor([candidate_features], dtype=torch.float32).to(self.device)
        mask = torch.ones(1, len(candidate_moves), dtype=torch.bool).to(self.device)
        
        with torch.no_grad():
            scores = model(pos_tensor, cand_tensor, mask)
            probs = F.softmax(scores, dim=1).squeeze(0).cpu().numpy().tolist()
            raw_scores = scores.squeeze(0).cpu().numpy().tolist()
            
        # rank them
        scored_candidates = []
        for i, move in enumerate(candidate_moves):
            scored_candidates.append({
                "move": move,
                "score": raw_scores[i],
                "probability": probs[i],
            })
            
        scored_candidates.sort(key=lambda x: x["score"], reverse=True)
        
        for i, cand in enumerate(scored_candidates):
            cand["rank"] = i + 1
            
        move_probs = {c["move"]: c["probability"] for c in scored_candidates}
        return {
            "modelType": "CURRENT_SELF",
            "modelVersion": model_version,
            "predictedMove": scored_candidates[0]["move"],
            "recommendedMove": scored_candidates[0]["move"],
            "confidence": scored_candidates[0]["probability"],
            "moveProbabilities": move_probs,
            "probabilities": move_probs,
            "candidates": scored_candidates
        }
