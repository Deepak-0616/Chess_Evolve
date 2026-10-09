from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from sqlalchemy import text
from .models.current_self.inference import CurrentSelfInferenceEngine
from .models.peak_self.inference import PeakSelfInferenceEngine
from .models.current_self.registry import ModelRegistry

router = APIRouter(prefix="/api/v1/ml")
current_self_engine = CurrentSelfInferenceEngine()
peak_self_engine = PeakSelfInferenceEngine()

class InferenceRequest(BaseModel):
    user_id: str
    fen: str
    candidates: List[Dict[str, Any]]
    move_number: int = 1
    game_phase: str = "MIDDLEGAME"
    model_version_id: Optional[str] = None
    model_type: str = "CURRENT_SELF"

_MODEL_CACHE = {}
_DEP_MODEL_CACHE = {}

@router.post("/predict")
def predict(req: InferenceRequest):
    cache_key = (req.user_id, req.model_version_id or req.model_type)
    result = _MODEL_CACHE.get(cache_key)
    
    if not result:
        registry = ModelRegistry()
        with registry.engine.connect() as conn:
            # 1. Look up by model_version_id if provided and has valid artifact
            if req.model_version_id:
                query = """
                    SELECT id, version, "artifactPath", "featureVersion", "datasetVersion", "dependentModelVersionId", "modelType"
                    FROM "MLModelVersion"
                    WHERE id = :mvid AND "artifactPath" IS NOT NULL
                """
                result = conn.execute(text(query), {"mvid": req.model_version_id}).first()

            # 2. Look up by userId and modelType
            if not result:
                query = """
                    SELECT id, version, "artifactPath", "featureVersion", "datasetVersion", "dependentModelVersionId", "modelType"
                    FROM "MLModelVersion"
                    WHERE "userId" = :uid AND "modelType" = :mtype AND status IN ('ACTIVE', 'READY') AND "artifactPath" IS NOT NULL
                    ORDER BY version DESC LIMIT 1
                """
                result = conn.execute(text(query), {"uid": req.user_id, "mtype": req.model_type}).first()

            # 3. Look up by connected ChessProfile username for the player
            if not result:
                query = """
                    SELECT m.id, m.version, m."artifactPath", m."featureVersion", m."datasetVersion", m."dependentModelVersionId", m."modelType"
                    FROM "MLModelVersion" m
                    JOIN "ChessProfile" cp ON cp."userId" = m."userId"
                    WHERE LOWER(cp."chessUsername") = (
                        SELECT LOWER(cp2."chessUsername") FROM "ChessProfile" cp2 WHERE cp2."userId" = :uid LIMIT 1
                    )
                    AND m."modelType" = :mtype AND m.status IN ('ACTIVE', 'READY') AND m."artifactPath" IS NOT NULL
                    ORDER BY m.version DESC LIMIT 1
                """
                result = conn.execute(text(query), {"uid": req.user_id, "mtype": req.model_type}).first()
                
            if result:
                _MODEL_CACHE[cache_key] = result
        
    if not result:
        raise HTTPException(status_code=404, detail=f"No trained {req.model_type} model with valid artifact found for player. Please synchronize games first.")
        
    model_version_id, version, artifact_path, feature_version, dataset_version, dependent_model_id, actual_model_type = result
    
    if not artifact_path:
        raise HTTPException(status_code=500, detail="Active model has no artifact path.")
        
    db_config = {
        "featureVersion": feature_version,
        "datasetVersion": dataset_version
    }
    
    from .features.feature_pipeline import extract_position_features, extract_candidate_features
    
    pos_feat_obj = extract_position_features(req.fen, req.move_number, req.game_phase)
    pos = pos_feat_obj.model_dump()
    
    pos_list = [
        float(pos.get("material_balance", 0)),
        float(pos.get("white_material", 0)),
        float(pos.get("black_material", 0)),
        float(pos.get("white_piece_count", 0)),
        float(pos.get("black_piece_count", 0)),
        float(pos.get("white_pawn_count", 0)),
        float(pos.get("black_pawn_count", 0)),
        float(pos.get("white_legal_moves", 0)),
        float(pos.get("black_legal_moves", 0)),
        float(pos.get("mobility_difference", 0)),
        float(pos.get("move_number", 1)),
        float(pos.get("side_to_move", 1)),
        float(pos.get("king_safety", 0)),
        float(pos.get("center_control", 0)),
        float(1 if pos.get("game_phase") == "OPENING" else (2 if pos.get("game_phase") == "MIDDLEGAME" else 3))
    ]
    
    cand_lists = []
    cand_moves = []
    
    for cand in req.candidates:
        c_feat_obj = extract_candidate_features(cand)
        c_feat = c_feat_obj.model_dump()
        c_arr = [
            float(c_feat.get("engine_rank", 1)),
            float(c_feat.get("engine_score", 0)),
            float(c_feat.get("centipawn_loss", 0)),
            float(1 if c_feat.get("is_capture") else 0),
            float(1 if c_feat.get("is_check") else 0),
            float(1 if c_feat.get("is_castle") else 0),
            float(1 if c_feat.get("is_promotion") else 0),
            float(1 if c_feat.get("is_sacrifice") else 0),
            float(c_feat.get("material_change", 0)),
            float(c_feat.get("tactical_score", 0)),
            float(c_feat.get("positional_score", 0))
        ]
        cand_lists.append(c_arr)
        cand_moves.append(cand.get("move"))
        
    try:
        if actual_model_type == "CURRENT_SELF":
            prediction = current_self_engine.predict(
                user_id=req.user_id,
                model_version=version,
                artifact_path=artifact_path,
                db_config=db_config,
                position_features=pos_list,
                candidate_features=cand_lists,
                candidate_moves=cand_moves
            )
        elif actual_model_type == "PEAK_SELF":
            dep_result = None
            if dependent_model_id:
                dep_result = _DEP_MODEL_CACHE.get(dependent_model_id)
                if not dep_result:
                    with registry.engine.connect() as conn:
                        dep_result = conn.execute(text("""
                            SELECT version, "artifactPath" FROM "MLModelVersion"
                            WHERE id = :depid AND "artifactPath" IS NOT NULL
                        """), {"depid": dependent_model_id}).first()
                    if dep_result:
                        _DEP_MODEL_CACHE[dependent_model_id] = dep_result

            # If dependent model not found or has no artifact, resolve active Current Self for user or player
            if not dep_result or not dep_result[1]:
                with registry.engine.connect() as conn:
                    dep_row = conn.execute(text("""
                        SELECT version, "artifactPath" FROM "MLModelVersion"
                        WHERE "userId" = :uid AND "modelType" = 'CURRENT_SELF' AND status IN ('ACTIVE', 'READY') AND "artifactPath" IS NOT NULL
                        ORDER BY version DESC LIMIT 1
                    """), {"uid": req.user_id}).first()
                    if not dep_row:
                        dep_row = conn.execute(text("""
                            SELECT m.version, m."artifactPath" FROM "MLModelVersion" m
                            JOIN "ChessProfile" cp ON cp."userId" = m."userId"
                            WHERE LOWER(cp."chessUsername") = (
                                SELECT LOWER(cp2."chessUsername") FROM "ChessProfile" cp2 WHERE cp2."userId" = :uid LIMIT 1
                            )
                            AND m."modelType" = 'CURRENT_SELF' AND m.status IN ('ACTIVE', 'READY') AND m."artifactPath" IS NOT NULL
                            ORDER BY m.version DESC LIMIT 1
                        """), {"uid": req.user_id}).first()
                    if dep_row:
                        dep_result = dep_row

            if not dep_result or not dep_result[1]:
                raise ValueError("Dependent Current Self model artifact not found.")
            dep_version, dep_artifact_path = dep_result
                
            # Predict base probability with Current Self
            dep_prediction = current_self_engine.predict(
                user_id=req.user_id,
                model_version=dep_version,
                artifact_path=dep_artifact_path,
                db_config=db_config,
                position_features=pos_list,
                candidate_features=cand_lists,
                candidate_moves=cand_moves
            )
            base_probs = dep_prediction.get("moveProbabilities", {})
            
            # Append base probability to candidate features
            for i, cand_move in enumerate(cand_moves):
                cand_lists[i].append(base_probs.get(cand_move, 0.0))
                
            # Predict Peak Self
            prediction = peak_self_engine.predict(
                user_id=req.user_id,
                model_version=version,
                artifact_path=artifact_path,
                db_config=db_config,
                position_features=pos_list,
                candidate_features=cand_lists,
                candidate_moves=cand_moves
            )
        else:
            raise ValueError("Unsupported model type.")
            
        # Enrich prediction with engine rank of the chosen move
        chosen = prediction.get("recommendedMove")
        chosen_rank = 1
        for c in req.candidates:
            if c.get("move") == chosen:
                chosen_rank = c.get("rank", 1)
                break
        prediction["chosenEngineRank"] = chosen_rank
        
        return prediction
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")
