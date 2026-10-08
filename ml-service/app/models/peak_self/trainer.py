import torch
from torch.utils.data import DataLoader
from .model import PeakSelfNetwork
from .loss import PeakSelfLoss
from .config import PeakSelfTrainingConfig
from .dataset import PeakSelfDataset, peak_self_collate_fn
import os
import json
import uuid

class PeakSelfTrainer:
    def __init__(self, config: PeakSelfTrainingConfig, dataset_id: str):
        self.config = config
        self.dataset_id = dataset_id
        
        self.model = PeakSelfNetwork(
            position_dim=config.position_dim,
            candidate_dim=config.candidate_dim,
            hidden_dim=config.hidden_dim,
            dropout=config.dropout
        )
        
        self.criterion = PeakSelfLoss(use_soft_targets=(config.loss != "CrossEntropy"))
        
        if config.optimizer == "AdamW":
            self.optimizer = torch.optim.AdamW(self.model.parameters(), lr=config.learningRate, weight_decay=config.weightDecay)
        else:
            self.optimizer = torch.optim.Adam(self.model.parameters(), lr=config.learningRate)
            
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model.to(self.device)

    def train(self):
        train_dataset = PeakSelfDataset(self.dataset_id, "TRAIN")
        val_dataset = PeakSelfDataset(self.dataset_id, "VALIDATION")
        
        if len(train_dataset) == 0:
            raise ValueError("Insufficient training data")
            
        train_loader = DataLoader(train_dataset, batch_size=self.config.batchSize, shuffle=True, collate_fn=peak_self_collate_fn)
        val_loader = DataLoader(val_dataset, batch_size=self.config.batchSize, shuffle=False, collate_fn=peak_self_collate_fn)
        
        best_val_loss = float('inf')
        patience_counter = 0
        metrics_history = []
        
        artifact_id = str(uuid.uuid4())
        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../artifacts", "peak_self", artifact_id))
        os.makedirs(base_dir, exist_ok=True)
        
        for epoch in range(self.config.epochs):
            self.model.train()
            train_loss = 0.0
            
            for batch in train_loader:
                pos = batch["position_features"].to(self.device)
                cand = batch["candidate_features"].to(self.device)
                mask = batch["mask"].to(self.device)
                targets = batch["targets"].to(self.device)
                
                self.optimizer.zero_grad()
                scores = self.model(pos, cand, mask)
                loss = self.criterion(scores, targets)
                
                loss.backward()
                self.optimizer.step()
                
                train_loss += loss.item()
                
            train_loss /= len(train_loader)
            
            val_loss, val_top1, val_top3, val_mrr = self.evaluate(val_loader)
            
            metrics = {
                "epoch": epoch + 1,
                "train_loss": train_loss,
                "val_loss": val_loss,
                "val_top1": val_top1,
                "val_top3": val_top3,
                "val_mrr": val_mrr
            }
            metrics_history.append(metrics)
            print(f"Epoch {epoch+1} | Train Loss: {train_loss:.4f} | Val Loss: {val_loss:.4f} | Val Top-1: {val_top1:.4f} | MRR: {val_mrr:.4f}")
            
            if val_loss < best_val_loss:
                best_val_loss = val_loss
                best_val_top1 = val_top1
                best_val_top3 = val_top3
                best_val_mrr = val_mrr
                patience_counter = 0
                torch.save(self.model.state_dict(), os.path.join(base_dir, "checkpoint_best.pt"))
            else:
                patience_counter += 1
                
            if patience_counter >= self.config.earlyStoppingPatience:
                print("Early stopping triggered.")
                break
                
        # Load best model for final evaluation
        self.model.load_state_dict(torch.load(os.path.join(base_dir, "checkpoint_best.pt"), map_location=self.device))
        
        test_dataset = PeakSelfDataset(self.dataset_id, "TEST")
        if len(test_dataset) > 0:
            test_loader = DataLoader(test_dataset, batch_size=self.config.batchSize, shuffle=False, collate_fn=peak_self_collate_fn)
            test_loss, test_top1, test_top3, test_mrr = self.evaluate(test_loader)
        else:
            test_loss, test_top1, test_top3, test_mrr = best_val_loss, best_val_top1, best_val_top3, best_val_mrr
            
        final_metrics = {
            "top1": test_top1,
            "top3": test_top3,
            "mrr": test_mrr,
            "valLoss": best_val_loss
        }
        
        with open(os.path.join(base_dir, "metrics.json"), "w") as f:
            json.dump(final_metrics, f)
            
        return {
            "artifactPath": base_dir,
            "metrics": final_metrics
        }

    def evaluate(self, loader):
        self.model.eval()
        total_loss = 0.0
        correct_top1 = 0
        correct_top3 = 0
        mrr_sum = 0.0
        total_samples = 0
        
        with torch.no_grad():
            for batch in loader:
                pos = batch["position_features"].to(self.device)
                cand = batch["candidate_features"].to(self.device)
                mask = batch["mask"].to(self.device)
                targets = batch["targets"].to(self.device)
                
                scores = self.model(pos, cand, mask)
                loss = self.criterion(scores, targets)
                total_loss += loss.item() * targets.size(0)
                
                sorted_idx = torch.argsort(scores, dim=-1, descending=True)
                ranks = (sorted_idx == targets.unsqueeze(1)).nonzero(as_tuple=True)[1] + 1
                
                correct_top1 += (ranks == 1).sum().item()
                correct_top3 += (ranks <= 3).sum().item()
                mrr_sum += (1.0 / ranks.float()).sum().item()
                total_samples += targets.size(0)
                
        if total_samples == 0:
            return 0.0, 0.0, 0.0, 0.0
            
        avg_loss = total_loss / total_samples
        top1 = correct_top1 / total_samples
        top3 = correct_top3 / total_samples
        mrr = mrr_sum / total_samples
        return avg_loss, top1, top3, mrr
