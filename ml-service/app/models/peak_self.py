import os
import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np

class PeakSelfNetwork(nn.Module):
    """
    PyTorch Model for Peak Self.
    Combines engine move evaluation quality with player style compatibility and weakness correction penalty.
    """
    def __init__(self, input_dim: int = 16, hidden_dim: int = 64):
        super(PeakSelfNetwork, self).__init__()
        self.fc1 = nn.Linear(input_dim, hidden_dim)
        self.bn1 = nn.BatchNorm1d(hidden_dim)
        self.fc2 = nn.Linear(hidden_dim, hidden_dim // 2)
        self.fc3 = nn.Linear(hidden_dim // 2, 1)

    def forward(self, x):
        h = F.relu(self.fc1(x))
        if x.size(0) > 1:
            h = self.bn1(h)
        h = F.relu(self.fc2(h))
        scores = self.fc3(h)
        return scores

class PeakSelfModel:
    def __init__(self, input_dim: int = 16):
        self.net = PeakSelfNetwork(input_dim=input_dim)
        self.net.eval()

    def score_candidates(self, feature_matrix: np.ndarray, candidates: list, current_probs: np.ndarray = None) -> list:
        """
        Calculates PeakSelf score:
        PeakScore = EngineQuality (0.45) + StyleCompatibility (0.35) + WeaknessCorrection (0.20)
        """
        if len(candidates) == 0:
            return []
            
        results = []
        for i, cand in enumerate(candidates):
            eval_score = float(cand.get("eval", 0.0))
            cpl = float(cand.get("centipawnLoss", 0.0))
            rank = int(cand.get("rank", 1))
            
            # Engine quality (normalized higher is better)
            engine_quality = max(0.0, 1.0 - (cpl / 300.0))
            if rank == 1:
                engine_quality += 0.2
                
            # Current style probability
            style_prob = float(current_probs[i]) if (current_probs is not None and i < len(current_probs)) else 0.5
            
            # Weakness correction penalty (penalize moves with high cpl even if stylish)
            weakness_correction = 1.0 if cpl < 50.0 else (0.5 if cpl < 150.0 else 0.1)
            
            total_score = (0.45 * engine_quality) + (0.35 * style_prob) + (0.20 * weakness_correction)
            
            item = dict(cand)
            item["peakScore"] = round(total_score, 4)
            item["styleProbability"] = round(style_prob, 4)
            item["engineQuality"] = round(engine_quality, 4)
            results.append(item)
            
        # Sort by peakScore descending
        results.sort(key=lambda x: x["peakScore"], reverse=True)
        return results

    def save(self, filepath: str):
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        torch.save(self.net.state_dict(), filepath)

    def load(self, filepath: str):
        if os.path.exists(filepath):
            self.net.load_state_dict(torch.load(filepath, map_location=torch.device('cpu')))
            self.net.eval()
