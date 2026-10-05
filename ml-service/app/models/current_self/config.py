from pydantic import BaseModel
from typing import Optional

class CurrentSelfTrainingConfig(BaseModel):
    modelType: str = "CURRENT_SELF"
    architectureVersion: str = "v1"
    datasetVersion: str = "v1"
    featureVersion: str = "v1"
    
    # Training Parameters
    epochs: int = 30
    batchSize: int = 32
    learningRate: float = 1e-4
    weightDecay: float = 1e-5
    dropout: float = 0.2
    optimizer: str = "AdamW"
    scheduler: str = "ReduceLROnPlateau"
    loss: str = "candidate_cross_entropy"
    earlyStoppingPatience: int = 5
    
    # Architecture
    position_feature_dim: int = 15
    candidate_feature_dim: int = 11
    player_feature_dim: int = 0
    history_feature_dim: int = 0
    
    hidden_dim: int = 128
    embedding_dim: int = 64
    num_layers: int = 2
    activation: str = "GELU"
    
    # Data Requirements
    minimumGames: int = 10
    minimumPositions: int = 100
    minimumPositiveExamples: int = 100
