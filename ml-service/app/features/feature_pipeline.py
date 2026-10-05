from typing import List, Dict, Any
from .feature_schema import (
    FeatureRecordSchema,
    PositionFeatures,
    CandidateFeatures,
    PlayerFeatures,
    HistoricalFeatures,
    WeaknessFeatures
)

# For now, we implement a simple placeholder logic for feature extraction that fulfills the structural requirement.
# As instructed, we keep it deterministic and structured.

def extract_position_features(fen: str, move_number: int, game_phase: str) -> PositionFeatures:
    parts = fen.split(" ")
    turn = 1 if parts[1] == "w" else 0
    return PositionFeatures(
        material_balance=0.0,
        white_material=0.0,
        black_material=0.0,
        white_piece_count=16,
        black_piece_count=16,
        white_pawn_count=8,
        black_pawn_count=8,
        white_legal_moves=20,
        black_legal_moves=20,
        mobility_difference=0.0,
        game_phase=game_phase,
        move_number=move_number,
        side_to_move=turn,
        king_safety=100.0,
        center_control=50.0
    )

def extract_candidate_features(cand: Dict[str, Any]) -> CandidateFeatures:
    # cand would be a parsed JSON dictionary of the candidate move from Stockfish
    return CandidateFeatures(
        engine_rank=cand.get("rank", 1),
        engine_score=cand.get("score", 0.0),
        centipawn_loss=cand.get("cp_loss", 0.0),
        is_capture=False,
        is_check=False,
        is_castle=False,
        is_promotion=False,
        is_sacrifice=False,
        material_change=0.0,
        tactical_score=50.0,
        positional_score=50.0
    )

def extract_features_for_batch(batch: List[Dict[str, Any]], feature_version: str = "v1") -> List[Dict[str, Any]]:
    records = []
    
    for item in batch:
        # Each item is conceptually a PositionAnalysis row combined with necessary context
        user_id = item.get("userId")
        game_id = item.get("gameId")
        position_id = item.get("positionId")
        move_number = item.get("moveNumber", 1)
        fen = item.get("fen", "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1")
        game_phase = item.get("gamePhase", "OPENING")
        
        actual_move = item.get("actualMove")
        candidates_raw = item.get("candidates", []) # list of dicts
        
        # Base features that are the same for all candidates in this position
        pos_feat = extract_position_features(fen, move_number, game_phase)
        player_feat = PlayerFeatures()
        hist_feat = HistoricalFeatures()
        weak_feat = WeaknessFeatures()
        
        for cand in candidates_raw:
            cand_move = cand.get("move")
            is_actual = (cand_move == actual_move)
            cand_feat = extract_candidate_features(cand)
            
            record = FeatureRecordSchema(
                userId=user_id,
                gameId=game_id,
                positionId=position_id,
                moveNumber=move_number,
                candidateMove=cand_move,
                isActualMove=is_actual,
                featureVersion=feature_version,
                position=pos_feat,
                candidate=cand_feat,
                player=player_feat,
                history=hist_feat,
                weakness=weak_feat,
                dna=None
            )
            records.append(record.model_dump())
            
    return records
