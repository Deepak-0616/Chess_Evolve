import torch
import torch.nn as nn
import torch.nn.functional as F

class PeakSelfLoss(nn.Module):
    def __init__(self, use_soft_targets: bool = False):
        super().__init__()
        self.use_soft_targets = use_soft_targets
        
        # We use CrossEntropyLoss for hard labels.
        # Masking is handled by model returning -1e9 for padded candidates,
        # which softmax will treat as zero probability.
        self.ce_loss = nn.CrossEntropyLoss()

    def forward(self, scores: torch.Tensor, targets: torch.Tensor):
        """
        scores: (batch_size, max_candidates) raw logits
        targets: (batch_size,) index of the peak target candidate if hard targets
                 OR (batch_size, max_candidates) soft probabilities if soft targets
        """
        if self.use_soft_targets:
            # KL Divergence for soft targets
            log_probs = F.log_softmax(scores, dim=-1)
            loss = F.kl_div(log_probs, targets, reduction='batchmean', log_target=False)
            return loss
        else:
            return self.ce_loss(scores, targets)
