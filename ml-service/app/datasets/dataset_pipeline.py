from typing import List, Dict, Any
from .schemas import DatasetGenerationRequest, MLDatasetRecordSchema, PeakTargetConfig
from .target_generation import select_peak_target

def build_datasets_from_batch(req: DatasetGenerationRequest) -> List[Dict[str, Any]]:
    records = []
    config = PeakTargetConfig()
    
    # Group batch records by positionId to handle Peak Self selection properly
    positions = {}
    for item in req.batch:
        pos_id = item.get("positionId")
        if pos_id not in positions:
            positions[pos_id] = []
        positions[pos_id].append(item)
        
    for pos_id, candidates in positions.items():
        if not candidates:
            continue
            
        # Extract base features from the first candidate (they are shared)
        base = candidates[0]
        userId = base.get("userId")
        gameId = base.get("gameId")
        moveNumber = base.get("moveNumber")
        actualMove = base.get("actualMove")
        split = base.get("split", "TRAIN")
        
        position_features = base.get("position", {})
        player_features = base.get("player", {})
        weakness_features = base.get("weakness", {})
        
        # Determine Peak Self Target
        peak_target = None
        if req.generatePeakSelf:
            # We need to map candidate features out of the batch
            cand_features_list = [c.get("candidate", {}) for c in candidates]
            # Inject the actual move name into the dict so select_peak_target can return it
            for i, c in enumerate(candidates):
                cand_features_list[i]["candidateMove"] = c.get("candidateMove")
                
            peak_target = select_peak_target(cand_features_list, position_features, player_features, weakness_features, config)
            
        # Construct output records
        for cand in candidates:
            cand_move = cand.get("candidateMove")
            is_actual = (cand_move == actualMove)
            is_peak = (cand_move == peak_target)
            
            # Reconstruct full feature payload
            features = {
                "position": cand.get("position"),
                "candidate": cand.get("candidate"),
                "player": cand.get("player"),
                "history": cand.get("history"),
                "weakness": cand.get("weakness"),
                "dna": cand.get("dna")
            }
            
            metadata = {
                "featureVersion": req.featureVersion,
                "datasetVersion": req.datasetVersion
            }
            
            if req.generateCurrentSelf:
                record = MLDatasetRecordSchema(
                    userId=userId,
                    gameId=gameId,
                    positionId=pos_id,
                    moveNumber=moveNumber,
                    candidateMove=cand_move,
                    actualMove=actualMove,
                    isActualMove=is_actual,
                    isPeakTarget=False, # CURRENT_SELF doesn't care about peak target
                    peakScore=None,
                    features=features,
                    metadata=metadata,
                    split=split
                )
                records.append({ "datasetType": "CURRENT_SELF", **record.model_dump() })
                
            if req.generatePeakSelf and peak_target:
                # Calculate the score for metadata
                cand_feat = cand.get("candidate", {})
                scores = {} # We could recalculate or cache it
                peak_record = MLDatasetRecordSchema(
                    userId=userId,
                    gameId=gameId,
                    positionId=pos_id,
                    moveNumber=moveNumber,
                    candidateMove=cand_move,
                    actualMove=actualMove,
                    isActualMove=is_actual,
                    isPeakTarget=is_peak,
                    peakScore=None, # Populate later if needed
                    features=features,
                    metadata=metadata,
                    split=split
                )
                records.append({ "datasetType": "PEAK_SELF", **peak_record.model_dump() })
                
    return records
