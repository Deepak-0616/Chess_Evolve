import os
import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np

class CurrentSelfNetwork(nn.Module):
    """
    PyTorch Candidate-Move Ranking Network for Current Self.
    Predicts relative preference score for each candidate move based on position, candidate features, and player DNA.
    """
    def __init__(self, input_dim: int = 16, hidden_dim: int = 64):
        super(CurrentSelfNetwork, self).__init__()
        self.fc1 = nn.Linear(input_dim, hidden_dim)
        self.bn1 = nn.BatchNorm1d(hidden_dim)
        self.fc2 = nn.Linear(hidden_dim, hidden_dim // 2)
        self.fc3 = nn.Linear(hidden_dim // 2, 1)
        self.dropout = nn.Dropout(0.2)

    def forward(self, x):
        h = F.relu(self.fc1(x))
        if x.size(0) > 1:
            h = self.bn1(h)
        h = self.dropout(h)
        h = F.relu(self.fc2(h))
        scores = self.fc3(h)
        return scores

class CurrentSelfModel:
    def __init__(self, input_dim: int = 16):
        self.net = CurrentSelfNetwork(input_dim=input_dim)
        self.net.eval()

    def score_candidates(self, feature_matrix: np.ndarray) -> np.ndarray:
        if len(feature_matrix) == 0:
            return np.array([])
        x_tensor = torch.tensor(feature_matrix, dtype=torch.float32)
        with torch.no_grad():
            raw_scores = self.net(x_tensor).squeeze(-1)
            probabilities = F.softmax(raw_scores, dim=0).numpy()
        return probabilities

    def save(self, filepath: str):
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        torch.save(self.net.state_dict(), filepath)

    def load(self, filepath: str):
        if os.path.exists(filepath):
            self.net.load_state_dict(torch.load(filepath, map_location=torch.device('cpu')))
            self.net.eval()
