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

import chess

def extract_position_features(fen: str, move_number: int, game_phase: str) -> PositionFeatures:
    try:
        board = chess.Board(fen)
    except Exception:
        board = chess.Board()
    turn = 1 if board.turn == chess.WHITE else 0

    piece_vals = {
        chess.PAWN: 1.0,
        chess.KNIGHT: 3.0,
        chess.BISHOP: 3.0,
        chess.ROOK: 5.0,
        chess.QUEEN: 9.0
    }

    w_mat = sum(len(board.pieces(pt, chess.WHITE)) * val for pt, val in piece_vals.items())
    b_mat = sum(len(board.pieces(pt, chess.BLACK)) * val for pt, val in piece_vals.items())
    mat_bal = w_mat - b_mat

    w_pieces = sum(len(board.pieces(pt, chess.WHITE)) for pt in piece_vals.keys())
    b_pieces = sum(len(board.pieces(pt, chess.BLACK)) for pt in piece_vals.keys())
    w_pawns = len(board.pieces(chess.PAWN, chess.WHITE))
    b_pawns = len(board.pieces(chess.PAWN, chess.BLACK))

    legal_moves_count = board.legal_moves.count()
    w_legal = legal_moves_count if board.turn == chess.WHITE else 20
    b_legal = legal_moves_count if board.turn == chess.BLACK else 20
    mobility_diff = float(w_legal - b_legal)

    center_squares = [chess.E4, chess.D4, chess.E5, chess.D5]
    center_control = sum(len(board.attackers(chess.WHITE, sq)) - len(board.attackers(chess.BLACK, sq)) for sq in center_squares) * 10.0 + 50.0
    center_control = max(0.0, min(100.0, center_control))

    return PositionFeatures(
        material_balance=float(mat_bal),
        white_material=float(w_mat),
        black_material=float(b_mat),
        white_piece_count=w_pieces,
        black_piece_count=b_pieces,
        white_pawn_count=w_pawns,
        black_pawn_count=b_pawns,
        white_legal_moves=float(w_legal),
        black_legal_moves=float(b_legal),
        mobility_difference=mobility_diff,
        game_phase=game_phase,
        move_number=move_number,
        side_to_move=turn,
        king_safety=100.0,
        center_control=center_control
    )

def extract_candidate_features(cand: Dict[str, Any]) -> CandidateFeatures:
    # cand is a parsed dictionary of the candidate move from Stockfish / engine
    cp_loss = cand.get("cp_loss", cand.get("centipawn_loss", 0.0))
    return CandidateFeatures(
        engine_rank=cand.get("rank", 1),
        engine_score=cand.get("score", 0.0),
        centipawn_loss=float(cp_loss),
        is_capture=bool(cand.get("is_capture", False)),
        is_check=bool(cand.get("is_check", False)),
        is_castle=bool(cand.get("is_castle", False)),
        is_promotion=bool(cand.get("is_promotion", False)),
        is_sacrifice=bool(cand.get("is_sacrifice", False)),
        material_change=float(cand.get("material_change", 0.0)),
        tactical_score=float(cand.get("tactical_score", 50.0)),
        positional_score=float(cand.get("positional_score", 50.0))
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
