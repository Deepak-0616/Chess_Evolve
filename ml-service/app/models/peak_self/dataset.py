import torch
import torch.nn.functional as F
from torch.utils.data import Dataset
from sqlalchemy import create_engine, text
import json
import os
from dotenv import load_dotenv

load_dotenv()

class PeakSelfDataset(Dataset):
    def __init__(self, dataset_id: str, split: str = "TRAIN", user_id: str = None):
        """
        Loads PEAK_SELF dataset.
        Groups candidates by positionId.
        Appends Current Self Probability as an extra candidate feature (mocked or loaded).
        """
        self.dataset_id = dataset_id
        self.split = split
        self.user_id = user_id
        
        db_url = os.getenv("DIRECT_DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/chess_evolve")
        if db_url.startswith("postgresql://"):
            db_url = db_url.replace("postgresql://", "postgresql+psycopg2://")
            
        self.engine = create_engine(db_url)
        self.positions = []
        self._load_data()

    def _load_data(self):
        query = text("""
            SELECT "positionId", "candidateMove", "isPeakTarget", "features"
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
                        "candidates": []
                    }
                
                features = row.features
                if isinstance(features, str):
                    features = json.loads(features)
                    
                grouped_data[pos_id]["candidates"].append({
                    "candidateMove": row.candidateMove,
                    "isPeakTarget": row.isPeakTarget,
                    "features": features
                })
                
        self.positions = list(grouped_data.values())

    def __len__(self):
        return len(self.positions)

    def __getitem__(self, idx):
        pos_data = self.positions[idx]
        candidates = pos_data["candidates"]
        
        target_idx = -1
        pos_feat_tensor = None
        cand_feat_list = []
        
        for i, cand in enumerate(candidates):
            if cand["isPeakTarget"]:
                target_idx = i
                
            f = cand["features"]
            pos = f.get("position", {})
            c_feat = f.get("candidate", {})
            
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
                
            # Simulate Current Self Probability for now since doing a full model load
            # and inference inside dataset initialization adds massive complexity.
            # A real implementation would run the trained Current Self model here.
            # Using engine_rank as a proxy for "Current Self's baseline bias".
            rank = float(c_feat.get("engine_rank", 1))
            current_self_prob = 1.0 / max(1.0, rank) 
                
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
                float(c_feat.get("positional_score", 0)),
                current_self_prob
            ]
            cand_feat_list.append(c_arr)
            
        cand_feat_tensor = torch.tensor(cand_feat_list, dtype=torch.float32)
        
        # If target_idx is -1, this example is invalid. We default to 0 to prevent crashes,
        # but the audit gate should drop this dataset if there are too many.
        if target_idx == -1:
            target_idx = 0
            
        target_tensor = torch.tensor(target_idx, dtype=torch.long)
        
        return {
            "position_id": pos_data["positionId"],
            "position_features": pos_feat_tensor,
            "candidate_features": cand_feat_tensor,
            "target": target_tensor
        }

def peak_self_collate_fn(batch):
    position_ids = [item["position_id"] for item in batch]
    pos_features = torch.stack([item["position_features"] for item in batch])
    targets = torch.stack([item["target"] for item in batch])
    
    cand_features = [item["candidate_features"] for item in batch]
    from torch.nn.utils.rnn import pad_sequence
    padded_cand_features = pad_sequence(cand_features, batch_first=True, padding_value=0.0)
    
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
