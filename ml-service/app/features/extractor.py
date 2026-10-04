import numpy as np

class FeatureExtractor:
    """
    Extracts tabular numerical feature vectors from FEN strings and move candidates.
    """

    @staticmethod
    def fen_to_features(fen: str) -> np.ndarray:
        # FEN parsing: board placement, turn, castling rights, en passant, halfmove, fullmove
        parts = fen.split(' ')
        board_str = parts[0]
        turn = 1.0 if parts[1] == 'w' else 0.0

        piece_counts = {
            'P': 0, 'N': 0, 'B': 0, 'R': 0, 'Q': 0, 'K': 0,
            'p': 0, 'n': 0, 'b': 0, 'r': 0, 'q': 0, 'k': 0,
        }

        for char in board_str:
            if char in piece_counts:
                piece_counts[char] += 1

        white_material = piece_counts['P']*1 + piece_counts['N']*3 + piece_counts['B']*3 + piece_counts['R']*5 + piece_counts['Q']*9
        black_material = piece_counts['p']*1 + piece_counts['n']*3 + piece_counts['b']*3 + piece_counts['r']*5 + piece_counts['q']*9
        material_diff = white_material - black_material

        # Construct 16-dimensional feature vector
        features = np.array([
            turn,
            white_material,
            black_material,
            material_diff,
            piece_counts['P'], piece_counts['N'], piece_counts['B'], piece_counts['R'], piece_counts['Q'],
            piece_counts['p'], piece_counts['n'], piece_counts['b'], piece_counts['r'], piece_counts['q'],
            float(len(board_str)),
            1.0 if 'K' in parts[2] else 0.0,
        ], dtype=np.float32)

        return features
