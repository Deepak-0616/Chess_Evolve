import torch
import torch.nn as nn
import torch.nn.functional as F

class PeakSelfModel(nn.Module):
    """
    Peak Self Model:
    Learns how the same player would make stronger, higher-accuracy decisions
    while preserving their unique tactical/positional playing identity.
    NOT pure Stockfish — balances player style signature with evaluation gains.
    """

    def __init__(self, input_dim: int = 16, hidden_dim: int = 64):
        super(PeakSelfModel, self).__init__()
        self.fc1 = nn.Linear(input_dim, hidden_dim)
        self.fc2 = nn.Linear(hidden_dim, hidden_dim)
        self.quality_head = nn.Linear(hidden_dim, 10)
        self.style_head = nn.Linear(hidden_dim, 10)

    def forward(self, x: torch.Tensor, alpha: float = 0.6) -> torch.Tensor:
        if x.dim() == 1:
            x = x.unsqueeze(0)
        h = F.relu(self.fc1(x))
        h = F.relu(self.fc2(h))

        quality_probs = F.softmax(self.quality_head(h), dim=-1)
        style_probs = F.softmax(self.style_head(h), dim=-1)

        # Weighted combination: alpha * quality + (1 - alpha) * style
        blended = alpha * quality_probs + (1.0 - alpha) * style_probs
        return blended / blended.sum(dim=-1, keepdim=True)
