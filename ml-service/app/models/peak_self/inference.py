import torch
import os
import json
from .model import PeakSelfNetwork
from .config import PeakSelfTrainingConfig

class PeakSelfInferenceEngine:
    def __init__(self):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.models = {}

    def load_model(self, model_version: str, artifact_path: str):
        if model_version in self.models:
            return self.models[model_version]
            
        config = PeakSelfTrainingConfig()
        model = PeakSelfNetwork(
            position_dim=config.position_dim,
            candidate_dim=config.candidate_dim,
            hidden_dim=config.hidden_dim
        )
        
        weights_path = os.path.join(artifact_path, "checkpoint_best.pt")
        if not os.path.exists(weights_path):
            raise FileNotFoundError(f"Model weights not found at {weights_path}")
            
        model.load_state_dict(torch.load(weights_path, map_location=self.device))
        model.to(self.device)
        model.eval()
        
        self.models[model_version] = model
        return model

    def predict(self, user_id: str, model_version: str, artifact_path: str, db_config: dict, 
                position_features: list, candidate_features: list, candidate_moves: list) -> dict:
                
        model = self.load_model(model_version, artifact_path)
        
        pos_tensor = torch.tensor(position_features, dtype=torch.float32).unsqueeze(0).to(self.device)
        cand_tensor = torch.tensor(candidate_features, dtype=torch.float32).unsqueeze(0).to(self.device)
        
        # In inference, mask is all True
        batch_size, max_cand, _ = cand_tensor.size()
        mask = torch.ones((batch_size, max_cand), dtype=torch.bool).to(self.device)
        
        with torch.no_grad():
            scores = model(pos_tensor, cand_tensor, mask).squeeze(0) # (max_cand,)
            
        probs = torch.softmax(scores, dim=-1)
        probs_list = probs.cpu().tolist()
        
        best_idx = torch.argmax(scores).item()
        recommended_move = candidate_moves[best_idx]
        confidence = probs_list[best_idx]
        
        move_probs = {move: p for move, p in zip(candidate_moves, probs_list)}
        
        return {
            "recommendedMove": recommended_move,
            "predictedMove": recommended_move,
            "confidence": confidence,
            "moveProbabilities": move_probs,
            "probabilities": move_probs,
            "modelType": "PEAK_SELF",
            "modelVersion": model_version
        }
