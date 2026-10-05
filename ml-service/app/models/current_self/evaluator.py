import torch
import torch.nn.functional as F
import numpy as np
from torch.utils.data import DataLoader
import json
import datetime
from .model import CurrentSelfModel
from .dataset import CurrentSelfDataset, current_self_collate_fn
from .config import CurrentSelfTrainingConfig
from .behavioral_similarity import BehavioralSimilarityCalculator

class CurrentSelfEvaluator:
    def __init__(self, dataset_id: str, config: CurrentSelfTrainingConfig, artifact_path: str):
        self.dataset_id = dataset_id
        self.config = config
        self.artifact_path = artifact_path
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.test_dataset = CurrentSelfDataset(dataset_id, split="TEST")
        self.sim_calc = BehavioralSimilarityCalculator()
        
    def _expected_calibration_error(self, probs: np.ndarray, labels: np.ndarray, n_bins: int = 10) -> float:
        """
        Calculates ECE for the predicted probabilities of the chosen candidate.
        probs: 1D array of probabilities for the chosen (predicted) class.
        labels: 1D boolean array whether the predicted class was correct.
        """
        bin_limits = np.linspace(0, 1, n_bins + 1)
        ece = 0.0
        total_samples = len(probs)
        if total_samples == 0:
            return 0.0
            
        for i in range(n_bins):
            bin_lower = bin_limits[i]
            bin_upper = bin_limits[i+1]
            in_bin = (probs > bin_lower) & (probs <= bin_upper)
            if i == 0:
                in_bin = (probs >= bin_lower) & (probs <= bin_upper)
                
            bin_size = in_bin.sum()
            if bin_size > 0:
                bin_acc = labels[in_bin].mean()
                bin_conf = probs[in_bin].mean()
                ece += (bin_size / total_samples) * abs(bin_acc - bin_conf)
                
        return float(ece)

    def evaluate(self) -> dict:
        if len(self.test_dataset) == 0:
            return {"status": "INSUFFICIENT_EVIDENCE", "reason": "Empty TEST dataset."}
            
        loader = DataLoader(self.test_dataset, batch_size=self.config.batchSize, collate_fn=current_self_collate_fn)
        
        model = CurrentSelfModel(self.config).to(self.device)
        checkpoint = torch.load(self.artifact_path, map_location=self.device)
        model.load_state_dict(checkpoint['model_state_dict'])
        model.eval()
        
        total_loss = 0.0
        metrics = {"top1": 0, "top3": 0, "mrr": 0.0}
        
        actual_engine_ranks = []
        pred_engine_ranks = []
        actual_features = []
        pred_features = []
        
        all_pred_probs = []
        all_correct = []
        
        with torch.no_grad():
            for batch in loader:
                pos_feat = batch["position_features"].to(self.device)
                cand_feat = batch["candidate_features"].to(self.device)
                mask = batch["mask"].to(self.device)
                targets = batch["targets"].to(self.device)
                
                scores = model(pos_feat, cand_feat, mask)
                probs = F.softmax(scores, dim=1)
                log_probs = F.log_softmax(scores, dim=1)
                
                loss = F.nll_loss(log_probs, targets)
                total_loss += loss.item() * targets.size(0)
                
                sorted_indices = torch.argsort(scores, dim=1, descending=True)
                ranks = (sorted_indices == targets.unsqueeze(1)).nonzero(as_tuple=True)[1] + 1
                
                metrics["top1"] += (ranks == 1).sum().item()
                metrics["top3"] += (ranks <= 3).sum().item()
                metrics["mrr"] += (1.0 / ranks.float()).sum().item()
                
                batch_size = targets.size(0)
                for i in range(batch_size):
                    actual_idx = targets[i].item()
                    pred_idx = sorted_indices[i, 0].item()
                    
                    act_feat = cand_feat[i, actual_idx]
                    pred_f = cand_feat[i, pred_idx]
                    
                    actual_engine_ranks.append(int(act_feat[0].item()))
                    pred_engine_ranks.append(int(pred_f[0].item()))
                    
                    actual_features.append({
                        "is_capture": act_feat[3].item() > 0,
                        "is_check": act_feat[4].item() > 0,
                        "is_castle": act_feat[5].item() > 0,
                        "is_sacrifice": act_feat[7].item() > 0
                    })
                    pred_features.append({
                        "is_capture": pred_f[3].item() > 0,
                        "is_check": pred_f[4].item() > 0,
                        "is_castle": pred_f[5].item() > 0,
                        "is_sacrifice": pred_f[7].item() > 0
                    })
                    
                    all_pred_probs.append(probs[i, pred_idx].item())
                    all_correct.append(1 if actual_idx == pred_idx else 0)

        total = len(self.test_dataset)
        avg_loss = total_loss / total
        
        top1 = metrics["top1"] / total
        top3 = metrics["top3"] / total
        mrr = metrics["mrr"] / total
        ece = self._expected_calibration_error(np.array(all_pred_probs), np.array(all_correct))
        
        sf_top1 = sum(1 for r in actual_engine_ranks if r == 1) / total
        sf_top3 = sum(1 for r in actual_engine_ranks if r <= 3) / total
        
        engine_rank_dist = self.sim_calc.calculate_engine_rank_distance(actual_engine_ranks, pred_engine_ranks)
        move_type_dist = self.sim_calc.calculate_move_type_distance(actual_features, pred_features)
        
        gate_status = "PASS"
        reasons = []
        if top1 < 0.15:
            gate_status = "FAIL"
            reasons.append("Top-1 accuracy too low (less than 15%).")
        if engine_rank_dist > 0.6:
            gate_status = "FAIL"
            reasons.append("Engine rank JS divergence too high (> 0.6).")
            
        if len(self.test_dataset) < 10:
            gate_status = "INSUFFICIENT_EVIDENCE"
            reasons.append(f"Only {len(self.test_dataset)} games in TEST split (need more data).")

        if len(reasons) == 0:
            reasons.append("Model passed all automated quality checks.")

        return {
            "modelType": "CURRENT_SELF",
            "modelVersion": 1,
            "datasetVersion": self.config.datasetVersion,
            "featureVersion": self.config.featureVersion,
            "test": {
                "positions": total
            },
            "metrics": {
                "top1": top1,
                "top3": top3,
                "mrr": mrr,
                "logLoss": avg_loss,
                "ece": ece
            },
            "behavioralSimilarity": {
                "engineRankDistance": engine_rank_dist,
                "moveTypeDistance": move_type_dist["overall"],
                "moveTypeDifferences": move_type_dist["differences"]
            },
            "baselines": {
                "stockfish": {
                    "top1": sf_top1,
                    "top3": sf_top3
                }
            },
            "qualityGate": {
                "status": gate_status,
                "reasons": reasons
            }
        }
