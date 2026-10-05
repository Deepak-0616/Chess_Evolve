import torch
from torch.utils.data import Dataset
from sqlalchemy import text
from app.db import get_engine
import json
import os
from dotenv import load_dotenv

class CurrentSelfDataset(Dataset):
    def __init__(self, dataset_id: str, split: str = "TRAIN"):
        """
        Groups candidates by positionId for the Candidate-Level Ranking task.
        """
        self.dataset_id = dataset_id
        self.split = split
        
        self.engine = get_engine()
        
        self.positions = []
        self._load_data()

    def _load_data(self):
        query = text("""
            SELECT "positionId", "candidateMove", "actualMove", "isActualMove", "features"
            FROM "MLDatasetRecord"
            WHERE "datasetId" = :datasetId AND "split" = :split
        """)
        
        grouped_data = {}
        with self.engine.connect() as conn:
            result = conn.execute(query, {"datasetId": self.dataset_id, "split": self.split})
            
            for row in result:
                pos_id = row.positionId
                if pos_id not in grouped_data:
                    grouped_data[pos_id] = {
                        "positionId": pos_id,
                        "actualMove": row.actualMove,
                        "candidates": []
                    }
                
                features = row.features
                if isinstance(features, str):
                    features = json.loads(features)
                    
                grouped_data[pos_id]["candidates"].append({
                    "candidateMove": row.candidateMove,
                    "isActualMove": row.isActualMove,
                    "features": features
                })
        
        # Convert to list of positions
        self.positions = list(grouped_data.values())

    def __len__(self):
        return len(self.positions)

    def __getitem__(self, idx):
        pos_data = self.positions[idx]
        
        # We need to construct tensors
        # 1. Position Features (Shared across all candidates in this position)
        # 2. Candidate Features (Varies per candidate)
        # 3. Target Label (Which candidate index is the actual move)
        
        candidates = pos_data["candidates"]
        
        # In a real scenario, we use config to dictate dimensionality. 
        # For this phase, we extract the keys we know exist.
        
        target_idx = -1
        pos_feat_tensor = None
        cand_feat_list = []
        
        for i, cand in enumerate(candidates):
            if cand["isActualMove"]:
                target_idx = i
                
            f = cand["features"]
            pos = f.get("position", {})
            c_feat = f.get("candidate", {})
            
            # Position features (shared, we just take the first one)
            if pos_feat_tensor is None:
                pos_arr = [
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
                pos_feat_tensor = torch.tensor(pos_arr, dtype=torch.float32)
                
            # Candidate features
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
            cand_feat_list.append(c_arr)
            
        cand_feat_tensor = torch.tensor(cand_feat_list, dtype=torch.float32)
        target_tensor = torch.tensor(target_idx, dtype=torch.long)
        
        return {
            "position_id": pos_data["positionId"],
            "position_features": pos_feat_tensor,
            "candidate_features": cand_feat_tensor,
            "target": target_tensor
        }

def current_self_collate_fn(batch):
    """
    Handles variable number of candidates per position using padding.
    """
    position_ids = [item["position_id"] for item in batch]
    pos_features = torch.stack([item["position_features"] for item in batch])
    targets = torch.stack([item["target"] for item in batch])
    
    # candidate_features is a list of tensors of shape (num_candidates, feature_dim)
    cand_features = [item["candidate_features"] for item in batch]
    
    # Pad candidate features to max_candidates in this batch
    from torch.nn.utils.rnn import pad_sequence
    # pad_sequence pads along dimension 0 by default. (max_len, batch, dim) -> batch_first=True -> (batch, max_len, dim)
    padded_cand_features = pad_sequence(cand_features, batch_first=True, padding_value=0.0)
    
    # Create mask (batch, max_len). 1 for valid candidate, 0 for padded
    lengths = torch.tensor([len(c) for c in cand_features])
    batch_size = len(cand_features)
    max_len = padded_cand_features.size(1)
    
    mask = torch.arange(max_len).expand(batch_size, max_len) < lengths.unsqueeze(1)
    
    return {
        "position_ids": position_ids,
        "position_features": pos_features,
        "candidate_features": padded_cand_features,
        "mask": mask,
        "targets": targets
    }
