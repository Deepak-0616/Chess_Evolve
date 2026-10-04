import torch
import torch.nn as nn
import torch.nn.functional as F

class CurrentSelfModel(nn.Module):
    """
    Current Self Model:
    Learns how a specific player actually makes move decisions in game positions.
    Predicts candidate move probabilities matching the player's personal decision habits.
    """

    def __init__(self, input_dim: int = 16, hidden_dim: int = 64):
        super(CurrentSelfModel, self).__init__()
        self.fc1 = nn.Linear(input_dim, hidden_dim)
        self.bn1 = nn.BatchNorm1d(hidden_dim)
        self.fc2 = nn.Linear(hidden_dim, hidden_dim)
        self.dropout = nn.Dropout(0.2)
        self.fc3 = nn.Linear(hidden_dim, 10) # Top 10 candidate move logit outputs

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        if x.dim() == 1:
            x = x.unsqueeze(0)
        h = F.relu(self.fc1(x))
        if h.size(0) > 1:
            h = self.bn1(h)
        h = F.relu(self.fc2(h))
        h = self.dropout(h)
        logits = self.fc3(h)
        return F.softmax(logits, dim=-1)
