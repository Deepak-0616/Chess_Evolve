import numpy as np
from scipy.spatial.distance import jensenshannon
import math

class BehavioralSimilarityCalculator:
    def __init__(self):
        pass

    def calculate_engine_rank_distance(self, actual_ranks: list[int], predicted_ranks: list[int]) -> float:
        """
        Calculates Jensen-Shannon divergence between engine rank distributions.
        """
        def get_dist(ranks):
            counts = [0, 0, 0, 0] # rank 1, 2, 3, other
            for r in ranks:
                if r == 1: counts[0] += 1
                elif r == 2: counts[1] += 1
                elif r == 3: counts[2] += 1
                else: counts[3] += 1
            total = sum(counts)
            if total == 0:
                return np.array([0.25, 0.25, 0.25, 0.25])
            return np.array([c / total for c in counts])
            
        p_act = get_dist(actual_ranks)
        p_pred = get_dist(predicted_ranks)
        
        # JS divergence is bounded between 0 and 1
        js_div = jensenshannon(p_act, p_pred)
        if math.isnan(js_div):
            return 1.0
        return float(js_div)

    def calculate_move_type_distance(self, actual_moves_features: list[dict], predicted_moves_features: list[dict]) -> dict:
        """
        Compares frequencies of captures, checks, castling, sacrifices.
        Returns a dict of absolute differences.
        """
        def get_freq(features_list):
            counts = {"capture": 0, "check": 0, "castle": 0, "sacrifice": 0}
            total = len(features_list)
            if total == 0:
                return {k: 0.0 for k in counts}
                
            for f in features_list:
                if f.get("is_capture"): counts["capture"] += 1
                if f.get("is_check"): counts["check"] += 1
                if f.get("is_castle"): counts["castle"] += 1
                if f.get("is_sacrifice"): counts["sacrifice"] += 1
                
            return {k: v / total for k, v in counts.items()}
            
        freq_act = get_freq(actual_moves_features)
        freq_pred = get_freq(predicted_moves_features)
        
        diffs = {}
        for k in freq_act.keys():
            diffs[k] = abs(freq_act[k] - freq_pred[k])
            
        # Overall distance is the average of absolute differences
        overall = sum(diffs.values()) / len(diffs)
        return {
            "differences": diffs,
            "overall": float(overall)
        }
