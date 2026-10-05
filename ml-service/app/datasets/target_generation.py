from typing import Dict, Any, List, Optional
from .schemas import PeakTargetConfig

def calculate_peak_score(candidate: Dict[str, Any], position: Dict[str, Any], player: Dict[str, Any], weakness: Dict[str, Any], config: PeakTargetConfig) -> Dict[str, Any]:
    # 1. Engine Quality
    # Normalize rank: rank 1 is best. Score = 1.0 / rank (e.g., Rank 1 -> 1.0, Rank 2 -> 0.5)
    rank = candidate.get("engine_rank", 1)
    engine_quality = 1.0 / max(1, rank)
    
    # 2. Style Compatibility
    # Based on whether candidate is tactical vs positional and player preference
    # (Placeholder logic)
    tactical_pref = player.get("tactical_preference", 0.5)
    is_tactical = candidate.get("is_capture", False) or candidate.get("is_check", False)
    style_compat = 1.0 - abs(tactical_pref - (1.0 if is_tactical else 0.0))
    
    # 3. Weakness Correction
    # If candidate is a blunder (high cp_loss), penalize. If player has high tactical weakness, reward safer moves.
    cp_loss = candidate.get("centipawn_loss", 0.0)
    weakness_score = 1.0 if cp_loss < 20 else 0.0
    
    # 4. Preference Compatibility
    pref_compat = 0.8 # Placeholder
    
    # 5. Risk Penalty
    risk = 1.0 if candidate.get("is_sacrifice", False) else 0.0
    
    # Final Score
    score = (
        (engine_quality * config.engineQualityWeight) +
        (style_compat * config.styleCompatibilityWeight) +
        (weakness_score * config.weaknessCorrectionWeight) +
        (pref_compat * config.preferenceCompatibilityWeight) -
        (risk * config.riskPenaltyWeight)
    )
    
    return {
        "engineQuality": engine_quality,
        "styleCompatibility": style_compat,
        "weaknessCorrection": weakness_score,
        "preferenceCompatibility": pref_compat,
        "riskPenalty": risk,
        "peakScore": max(0.0, score)
    }

def select_peak_target(candidates: List[Dict[str, Any]], position: Dict[str, Any], player: Dict[str, Any], weakness: Dict[str, Any], config: PeakTargetConfig) -> Optional[str]:
    best_candidate = None
    highest_score = -1.0
    
    for cand in candidates:
        scores = calculate_peak_score(cand, position, player, weakness, config)
        if scores["peakScore"] >= config.minimumEvidence and scores["engineQuality"] >= config.minimumEngineQuality:
            if scores["peakScore"] > highest_score:
                highest_score = scores["peakScore"]
                best_candidate = cand.get("candidateMove")
                
    return best_candidate
