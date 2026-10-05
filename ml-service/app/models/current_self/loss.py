import torch
import torch.nn as nn
import torch.nn.functional as F

class CandidateCrossEntropyLoss(nn.Module):
    def __init__(self):
        super().__init__()
        # CrossEntropyLoss expects logits of shape (batch, num_classes) and targets of shape (batch)
        # where targets are the class indices [0, num_classes-1].
        # Our model outputs (batch, num_candidates), which exactly matches (batch, num_classes).
        self.loss_fn = nn.CrossEntropyLoss()

    def forward(self, scores: torch.Tensor, targets: torch.Tensor):
        """
        scores: (batch_size, num_candidates) logits with -inf for masked entries
        targets: (batch_size) containing the index of the actual move candidate
        """
        return self.loss_fn(scores, targets)
