import torch
from torch.utils.data import DataLoader
from .config import CurrentSelfTrainingConfig
from .model import CurrentSelfModel
from .dataset import CurrentSelfDataset, current_self_collate_fn
from .loss import CandidateCrossEntropyLoss
from .metrics import calculate_metrics
import os
import json
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class CurrentSelfTrainer:
    def __init__(self, dataset_id: str, config: CurrentSelfTrainingConfig, artifact_dir: str):
        self.config = config
        self.dataset_id = dataset_id
        self.artifact_dir = artifact_dir
        os.makedirs(self.artifact_dir, exist_ok=True)
        
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model = CurrentSelfModel(config).to(self.device)
        self.loss_fn = CandidateCrossEntropyLoss()
        
        # Datasets
        self.train_dataset = CurrentSelfDataset(dataset_id, split="TRAIN")
        self.val_dataset = CurrentSelfDataset(dataset_id, split="VALIDATION")
        
        self.train_loader = DataLoader(
            self.train_dataset, 
            batch_size=config.batchSize, 
            shuffle=True, 
            collate_fn=current_self_collate_fn
        )
        self.val_loader = DataLoader(
            self.val_dataset, 
            batch_size=config.batchSize, 
            shuffle=False, 
            collate_fn=current_self_collate_fn
        )
        
        self.optimizer = torch.optim.AdamW(
            self.model.parameters(), 
            lr=config.learningRate, 
            weight_decay=config.weightDecay
        )
        self.scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
            self.optimizer, mode='min', patience=2, factor=0.5
        )

    def train_epoch(self):
        self.model.train()
        total_loss = 0.0
        
        for batch in self.train_loader:
            pos_feat = batch["position_features"].to(self.device)
            cand_feat = batch["candidate_features"].to(self.device)
            mask = batch["mask"].to(self.device)
            targets = batch["targets"].to(self.device)
            
            self.optimizer.zero_grad()
            scores = self.model(pos_feat, cand_feat, mask)
            loss = self.loss_fn(scores, targets)
            
            loss.backward()
            self.optimizer.step()
            
            total_loss += loss.item() * targets.size(0)
            
        return total_loss / len(self.train_dataset)

    def evaluate(self, loader):
        self.model.eval()
        total_loss = 0.0
        metrics_sum = {"top1_count": 0, "top3_count": 0, "mrr_sum": 0.0, "total": 0}
        
        with torch.no_grad():
            for batch in loader:
                pos_feat = batch["position_features"].to(self.device)
                cand_feat = batch["candidate_features"].to(self.device)
                mask = batch["mask"].to(self.device)
                targets = batch["targets"].to(self.device)
                
                scores = self.model(pos_feat, cand_feat, mask)
                loss = self.loss_fn(scores, targets)
                
                batch_size = targets.size(0)
                total_loss += loss.item() * batch_size
                
                batch_metrics = calculate_metrics(scores, targets, mask)
                for k in metrics_sum:
                    metrics_sum[k] += batch_metrics[k]
                    
        total = metrics_sum["total"]
        if total == 0:
            return 0.0, {}
            
        return total_loss / total, {
            "top1": metrics_sum["top1_count"] / total,
            "top3": metrics_sum["top3_count"] / total,
            "mrr": metrics_sum["mrr_sum"] / total
        }

    def train(self):
        best_val_loss = float('inf')
        patience_counter = 0
        best_metrics = {}
        
        for epoch in range(self.config.epochs):
            train_loss = self.train_epoch()
            val_loss, val_metrics = self.evaluate(self.val_loader)
            self.scheduler.step(val_loss)
            
            logger.info(f"Epoch {epoch+1}/{self.config.epochs} | Train Loss: {train_loss:.4f} | Val Loss: {val_loss:.4f} | Top1: {val_metrics.get('top1', 0):.4f}")
            
            if val_loss < best_val_loss:
                best_val_loss = val_loss
                best_metrics = val_metrics
                patience_counter = 0
                self.save_checkpoint("checkpoint_best.pt", epoch, val_loss, val_metrics)
            else:
                patience_counter += 1
                
            if patience_counter >= self.config.earlyStoppingPatience:
                logger.info(f"Early stopping at epoch {epoch+1}")
                break
                
        # Load best for final evaluation
        self.load_checkpoint("checkpoint_best.pt")
        test_dataset = CurrentSelfDataset(self.dataset_id, split="TEST")
        if len(test_dataset) > 0:
            test_loader = DataLoader(test_dataset, batch_size=self.config.batchSize, collate_fn=current_self_collate_fn)
            test_loss, test_metrics = self.evaluate(test_loader)
            logger.info(f"Final Test Loss: {test_loss:.4f} | Top1: {test_metrics.get('top1', 0):.4f}")
            best_metrics["test_top1"] = test_metrics.get('top1', 0)
            best_metrics["test_mrr"] = test_metrics.get('mrr', 0)
            
        return best_metrics

    def save_checkpoint(self, filename: str, epoch: int, val_loss: float, metrics: dict):
        path = os.path.join(self.artifact_dir, filename)
        torch.save({
            'epoch': epoch,
            'model_state_dict': self.model.state_dict(),
            'optimizer_state_dict': self.optimizer.state_dict(),
            'scheduler_state_dict': self.scheduler.state_dict(),
            'val_loss': val_loss,
            'metrics': metrics,
            'config': self.config.model_dump()
        }, path)
        
    def load_checkpoint(self, filename: str):
        path = os.path.join(self.artifact_dir, filename)
        checkpoint = torch.load(path, map_location=self.device)
        self.model.load_state_dict(checkpoint['model_state_dict'])
        self.optimizer.load_state_dict(checkpoint['optimizer_state_dict'])
        self.scheduler.load_state_dict(checkpoint['scheduler_state_dict'])
