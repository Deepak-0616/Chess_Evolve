from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
from .models.current_self.inference import CurrentSelfInferenceEngine
from .models.current_self.registry import ModelRegistry

router = APIRouter(prefix="/api/v1/ml")
inference_engine = CurrentSelfInferenceEngine()

class InferenceRequest(BaseModel):
    user_id: str
    fen: str
    candidates: List[Dict[str, Any]]
    move_number: int = 1
    game_phase: str = "MIDDLEGAME"
    model_version_id: str = None

@router.post("/predict")
def predict(req: InferenceRequest):
    # 1. Fetch active model metadata from DB
    registry = ModelRegistry()
    with registry.engine.connect() as conn:
        if req.model_version_id:
            query = """
                SELECT id, version, "artifactPath", "featureVersion", "datasetVersion"
                FROM "MLModelVersion"
                WHERE id = :mvid AND "userId" = :uid
            """
            params = {"uid": req.user_id, "mvid": req.model_version_id}
        else:
            query = """
                SELECT id, version, "artifactPath", "featureVersion", "datasetVersion"
                FROM "MLModelVersion"
                WHERE "userId" = :uid AND "modelType" = 'CURRENT_SELF' AND status = 'READY'
                ORDER BY version DESC LIMIT 1
            """
            params = {"uid": req.user_id}
            
        result = conn.execute(registry.text(query), params).first()
        
    if not result:
        raise HTTPException(status_code=404, detail="No valid Current Self model found for this request.")
        
    model_version_id, version, artifact_path, feature_version, dataset_version = result
    
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
        prediction = inference_engine.predict(
            user_id=req.user_id,
            model_version=version,
            artifact_path=artifact_path,
            db_config=db_config,
            position_features=pos_list,
            candidate_features=cand_lists,
            candidate_moves=cand_moves
        )
        
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
