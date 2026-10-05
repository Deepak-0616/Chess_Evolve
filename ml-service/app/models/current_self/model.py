import torch
import torch.nn as nn
from .config import CurrentSelfTrainingConfig

class CandidateEncoder(nn.Module):
    def __init__(self, config: CurrentSelfTrainingConfig):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(config.candidate_feature_dim, config.embedding_dim),
            nn.LayerNorm(config.embedding_dim),
            nn.GELU(),
            nn.Dropout(config.dropout),
            nn.Linear(config.embedding_dim, config.embedding_dim),
            nn.GELU()
        )
        
    def forward(self, x):
        # x shape: (batch_size, num_candidates, candidate_feature_dim)
        return self.net(x)

class PositionEncoder(nn.Module):
    def __init__(self, config: CurrentSelfTrainingConfig):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(config.position_feature_dim, config.embedding_dim),
            nn.LayerNorm(config.embedding_dim),
            nn.GELU(),
            nn.Dropout(config.dropout),
            nn.Linear(config.embedding_dim, config.embedding_dim),
            nn.GELU()
        )
        
    def forward(self, x):
        # x shape: (batch_size, position_feature_dim)
        return self.net(x)

class CurrentSelfModel(nn.Module):
    def __init__(self, config: CurrentSelfTrainingConfig):
        super().__init__()
        self.candidate_encoder = CandidateEncoder(config)
        self.position_encoder = PositionEncoder(config)
        
        # Fusion layer takes pos_embed + cand_embed
        fusion_dim = config.embedding_dim * 2
        
        self.fusion = nn.Sequential(
            nn.Linear(fusion_dim, config.hidden_dim),
            nn.LayerNorm(config.hidden_dim),
            nn.GELU(),
            nn.Dropout(config.dropout),
            nn.Linear(config.hidden_dim, config.hidden_dim // 2),
            nn.GELU(),
            nn.Linear(config.hidden_dim // 2, 1) # Output a single score per candidate
        )

    def forward(self, position_features, candidate_features, mask=None):
        """
        position_features: (batch_size, pos_dim)
        candidate_features: (batch_size, num_candidates, cand_dim)
        mask: (batch_size, num_candidates) boolean mask where True means valid candidate
        """
        # (batch_size, embedding_dim)
        pos_embed = self.position_encoder(position_features) 
        
        # (batch_size, num_candidates, embedding_dim)
        cand_embed = self.candidate_encoder(candidate_features)
        
        # We need to broadcast pos_embed to match candidate count
        # pos_embed: (batch_size, 1, embedding_dim)
        pos_embed_expanded = pos_embed.unsqueeze(1).expand(-1, cand_embed.size(1), -1)
        
        # fusion_input: (batch_size, num_candidates, fusion_dim)
        fusion_input = torch.cat([pos_embed_expanded, cand_embed], dim=-1)
        
        # scores: (batch_size, num_candidates, 1) -> (batch_size, num_candidates)
        scores = self.fusion(fusion_input).squeeze(-1)
        
        if mask is not None:
            # Set invalid candidate scores to -inf so they don't affect softmax
            scores = scores.masked_fill(~mask, float('-inf'))
            
        return scores
