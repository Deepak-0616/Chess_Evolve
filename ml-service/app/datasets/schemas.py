from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class PeakTargetConfig(BaseModel):
    version: str = "1.0"
    engineQualityWeight: float = 0.4
    styleCompatibilityWeight: float = 0.25
    weaknessCorrectionWeight: float = 0.2
    preferenceCompatibilityWeight: float = 0.1
    riskPenaltyWeight: float = 0.05
    minimumEngineQuality: float = 0.5
    minimumEvidence: float = 0.6

class DatasetGenerationRequest(BaseModel):
    featureVersion: str = "v1"
    datasetVersion: str = "v1"
    generateCurrentSelf: bool = True
    generatePeakSelf: bool = True
    batch: List[Dict[str, Any]]

class DatasetSplitConfig(BaseModel):
    train_ratio: float = 0.7
    validation_ratio: float = 0.15
    test_ratio: float = 0.15

class MLDatasetRecordSchema(BaseModel):
    userId: str
    gameId: str
    positionId: str
    moveNumber: int
    candidateMove: str
    actualMove: str
    isActualMove: bool
    isPeakTarget: bool
    peakScore: Optional[float]
    features: Dict[str, Any]
    metadata: Dict[str, Any]
    split: str = "TRAIN"
