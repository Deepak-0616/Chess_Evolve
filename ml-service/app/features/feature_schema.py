from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class PositionFeatures(BaseModel):
    material_balance: float
    white_material: float
    black_material: float
    white_piece_count: int
    black_piece_count: int
    white_pawn_count: int
    black_pawn_count: int
    white_legal_moves: int
    black_legal_moves: int
    mobility_difference: float
    game_phase: str
    move_number: int
    side_to_move: int # 1 for White, 0 for Black
    king_safety: float
    center_control: float
    
class CandidateFeatures(BaseModel):
    engine_rank: int
    engine_score: float
    centipawn_loss: float
    is_capture: bool
    is_check: bool
    is_castle: bool
    is_promotion: bool
    is_sacrifice: bool
    material_change: float
    tactical_score: float
    positional_score: float

class PlayerFeatures(BaseModel):
    aggression: float = 0.5
    risk_tolerance: float = 0.5
    tactical_preference: float = 0.5
    positional_preference: float = 0.5
    sacrifice_tendency: float = 0.5
    trading_tendency: float = 0.5

class HistoricalFeatures(BaseModel):
    recent_aggression: float = 0.5
    recent_risk: float = 0.5
    recent_tactical_frequency: float = 0.5

class WeaknessFeatures(BaseModel):
    tactical_weakness: float = 0.0
    positional_weakness: float = 0.0
    defensive_weakness: float = 0.0
    opening_weakness: float = 0.0
    endgame_weakness: float = 0.0

class FeatureRecordSchema(BaseModel):
    userId: str
    gameId: str
    positionId: str
    moveNumber: int
    candidateMove: str
    isActualMove: bool
    featureVersion: str
    
    position: PositionFeatures
    candidate: CandidateFeatures
    player: PlayerFeatures
    history: HistoricalFeatures
    weakness: WeaknessFeatures
    dna: Optional[Dict[str, Any]] = None
