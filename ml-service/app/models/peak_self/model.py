import torch
import torch.nn as nn

class PeakSelfNetwork(nn.Module):
    def __init__(self, position_dim: int, candidate_dim: int, hidden_dim: int, dropout: float = 0.2):
        super().__init__()
        
        # Position Encoder
        self.pos_encoder = nn.Sequential(
            nn.Linear(position_dim, hidden_dim),
            nn.ReLU(),
            nn.LayerNorm(hidden_dim)
        )
        
        # Candidate Encoder (including Current Self probability)
        self.cand_encoder = nn.Sequential(
            nn.Linear(candidate_dim, hidden_dim),
            nn.ReLU(),
            nn.LayerNorm(hidden_dim)
        )
        
        # Fusion Layer
        self.fusion = nn.Sequential(
            nn.Linear(hidden_dim * 2, hidden_dim),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim, hidden_dim // 2),
            nn.ReLU(),
            nn.LayerNorm(hidden_dim // 2)
        )
        
        # Scoring Network
        self.scorer = nn.Linear(hidden_dim // 2, 1)

    def forward(self, position_features: torch.Tensor, candidate_features: torch.Tensor, mask: torch.Tensor = None):
        """
        position_features: (batch_size, position_dim)
        candidate_features: (batch_size, max_candidates, candidate_dim)
        mask: (batch_size, max_candidates) boolean mask where True = valid, False = pad
        """
        # Encode position (shared for all candidates)
        # pos_emb: (batch_size, hidden_dim)
        pos_emb = self.pos_encoder(position_features)
        
        # Expand pos_emb to match candidates
        batch_size, max_cand, _ = candidate_features.size()
        # pos_expanded: (batch_size, max_candidates, hidden_dim)
        pos_expanded = pos_emb.unsqueeze(1).expand(batch_size, max_cand, -1)
        
        # Encode candidates
        # cand_emb: (batch_size, max_candidates, hidden_dim)
        cand_emb = self.cand_encoder(candidate_features)
        
        # Fuse
        # fused: (batch_size, max_candidates, hidden_dim * 2)
        fused = torch.cat([pos_expanded, cand_emb], dim=-1)
        
        # fuse_emb: (batch_size, max_candidates, hidden_dim // 2)
        fuse_emb = self.fusion(fused)
        
        # scores: (batch_size, max_candidates, 1) -> (batch_size, max_candidates)
        scores = self.scorer(fuse_emb).squeeze(-1)
        
        # Mask out padded candidates with a very large negative number
        if mask is not None:
            scores = scores.masked_fill(~mask, -1e9)
            
        return scores
