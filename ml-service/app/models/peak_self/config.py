from pydantic import BaseModel

class PeakSelfTrainingConfig(BaseModel):
    architectureVersion: str = "v1"
    datasetVersion: str = "v1"
    featureVersion: str = "v1"
    targetVersion: str = "v1"
    learningRate: float = 0.001
    batchSize: int = 32
    epochs: int = 25
    optimizer: str = "AdamW"
    weightDecay: float = 1e-4
    dropout: float = 0.2
    scheduler: str = "ReduceLROnPlateau"
    loss: str = "CrossEntropy"  # Could be SoftCrossEntropy
    earlyStoppingPatience: int = 5
    randomSeed: int = 42
    
    # Feature dimensions
    position_dim: int = 15
    candidate_dim: int = 12 # 11 original + 1 for Current Self Probability
    hidden_dim: int = 128
