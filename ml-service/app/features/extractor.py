import numpy as np

FEATURE_VERSION = "v1.0"

class FeatureExtractor:
    """
    Unified Feature Extractor for Chess Evolve ML Models.
    Ensures identical feature logic during training and inference.
    """

    @staticmethod
    def extract_position_features(fen: str) -> dict:
        """
        Extract board state and position features from FEN string.
        """
        parts = fen.split(" ")
        board_str = parts[0]
        turn = parts[1] if len(parts) > 1 else "w"
        
        piece_values = {'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9, 'k': 0}
        white_mat = 0
        black_mat = 0
        white_pieces = 0
        black_pieces = 0
        
        for char in board_str:
            if char.isalpha():
                val = piece_values.get(char.lower(), 0)
                if char.isupper():
                    white_mat += val
                    white_pieces += 1
                else:
                    black_mat += val
                    black_pieces += 1
                    
        total_pieces = white_pieces + black_pieces
        game_phase = 0.0  # 0: Endgame, 0.5: Middlegame, 1.0: Opening
        if total_pieces > 24:
            game_phase = 1.0
        elif total_pieces > 12:
            game_phase = 0.5
        else:
            game_phase = 0.0
            
        turn_val = 1.0 if turn == 'w' else -1.0
        material_balance = (white_mat - black_mat) * turn_val

        return {
            "white_mat": white_mat,
            "black_mat": black_mat,
            "material_balance": material_balance,
            "total_pieces": total_pieces,
            "game_phase": game_phase,
            "turn": turn_val
        }

    @staticmethod
    def extract_candidate_features(candidate: dict, dna_metrics: dict) -> dict:
        """
        Extract features for a candidate move given player DNA and engine evaluation.
        """
        san = candidate.get("san", "")
        eval_score = float(candidate.get("eval", 0.0))
        eval_rank = int(candidate.get("rank", 1))
        cpl = float(candidate.get("centipawnLoss", 0.0))
        
        is_capture = 1.0 if "x" in san else 0.0
        is_check = 1.0 if "+" in san or "#" in san else 0.0
        is_queen_move = 1.0 if san.startswith("Q") else 0.0
        is_pawn_push = 1.0 if san[0].islower() and not "x" in san else 0.0
        is_castle = 1.0 if "O-O" in san else 0.0

        aggression = float(dna_metrics.get("aggression", 50.0)) / 100.0
        risk_taking = float(dna_metrics.get("riskTaking", 50.0)) / 100.0
        tactical_pref = float(dna_metrics.get("tacticalPreference", 50.0)) / 100.0
        positional_pref = float(dna_metrics.get("positionalPreference", 50.0)) / 100.0
        defensive_ability = float(dna_metrics.get("defensiveAbility", 50.0)) / 100.0
        trading_tendency = float(dna_metrics.get("tradingTendency", 50.0)) / 100.0

        # Construct vector representation
        vector = [
            eval_score,
            1.0 / max(eval_rank, 1),
            cpl / 100.0,
            is_capture,
            is_check,
            is_queen_move,
            is_pawn_push,
            is_castle,
            aggression,
            risk_taking,
            tactical_pref,
            positional_pref,
            defensive_ability,
            trading_tendency
        ]

        return {
            "eval_score": eval_score,
            "eval_rank": eval_rank,
            "cpl": cpl,
            "is_capture": is_capture,
            "is_check": is_check,
            "vector": vector
        }

    @classmethod
    def create_feature_matrix(cls, candidates: list, dna_metrics: dict, fen: str):
        pos_feat = cls.extract_position_features(fen)
        matrix = []
        for cand in candidates:
            cand_feat = cls.extract_candidate_features(cand, dna_metrics)
            full_vector = [pos_feat["material_balance"], pos_feat["game_phase"]] + cand_feat["vector"]
            matrix.append(full_vector)
        return np.array(matrix, dtype=np.float32)
