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
        
        weights_path = artifact_path
        if os.path.isdir(weights_path):
            candidate = os.path.join(weights_path, "checkpoint_best.pt")
            if os.path.exists(candidate):
                weights_path = candidate

        if not os.path.exists(weights_path):
            raise FileNotFoundError(f"Model weights not found at {weights_path}")

        checkpoint = torch.load(weights_path, map_location=self.device)
        state_dict = checkpoint.get("model_state_dict", checkpoint) if isinstance(checkpoint, dict) else checkpoint
        model.load_state_dict(state_dict)
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
            raw_scores = model(pos_tensor, cand_tensor, mask).squeeze(0) # (max_cand,)

        scores_list = raw_scores.cpu().tolist()
        if not isinstance(scores_list, list):
            scores_list = [scores_list]

        # Peak Self Decision Objective:
        # Preserve learned player style preferences from the network while strongly
        # penalizing moves that produce avoidable tactical losses and blunders.
        # Candidate features: index 2 is centipawn loss, index 11 is Current Self probability.
        adjusted_scores = []
        for i, s in enumerate(scores_list):
            c_feat = candidate_features[i]
            cp_loss = float(c_feat[2]) if len(c_feat) > 2 else 0.0

            # Non-linear tactical penalty function:
            if cp_loss <= 30.0:
                penalty = 0.0
            elif cp_loss <= 100.0:
                penalty = 0.01 * (cp_loss - 30.0)
            elif cp_loss <= 200.0:
                penalty = 0.70 + 0.03 * (cp_loss - 100.0)
            else:
                # Severe blunder (e.g. piece sacrifice / loss)
                penalty = 3.70 + 0.05 * (cp_loss - 200.0)

            adjusted_scores.append(s - penalty)

        adj_tensor = torch.tensor(adjusted_scores, dtype=torch.float32)
        probs = torch.softmax(adj_tensor, dim=-1).cpu().tolist()
        if not isinstance(probs, list):
            probs = [probs]

        best_idx = int(torch.argmax(adj_tensor).item())
        recommended_move = candidate_moves[best_idx]
        confidence = float(probs[best_idx])

        move_probs = {move: float(p) for move, p in zip(candidate_moves, probs)}

        scored_candidates = []
        for i, move in enumerate(candidate_moves):
            scored_candidates.append({
                "move": move,
                "score": float(adjusted_scores[i]),
                "rawScore": float(scores_list[i]),
                "probability": float(probs[i]),
                "centipawnLoss": float(candidate_features[i][2]) if len(candidate_features[i]) > 2 else 0.0
            })
        scored_candidates.sort(key=lambda x: x["score"], reverse=True)
        for i, cand in enumerate(scored_candidates):
            cand["rank"] = i + 1

        return {
            "recommendedMove": recommended_move,
            "predictedMove": recommended_move,
            "confidence": confidence,
            "moveProbabilities": move_probs,
            "probabilities": move_probs,
            "candidates": scored_candidates,
            "modelType": "PEAK_SELF",
            "modelVersion": model_version
        }
