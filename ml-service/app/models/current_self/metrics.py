import torch

def calculate_metrics(scores: torch.Tensor, targets: torch.Tensor, mask: torch.Tensor):
    """
    scores: (batch_size, num_candidates) logits
    targets: (batch_size)
    mask: (batch_size, num_candidates)
    """
    batch_size = scores.size(0)
    
    # scores already has -inf for masked candidates, so argsort will naturally push them to the end
    sorted_indices = torch.argsort(scores, dim=1, descending=True)
    
    # Find the rank of the target in the sorted indices
    ranks = (sorted_indices == targets.unsqueeze(1)).nonzero(as_tuple=True)[1] + 1
    
    top1 = (ranks == 1).sum().item()
    top3 = (ranks <= 3).sum().item()
    mrr = (1.0 / ranks.float()).sum().item()
    
    return {
        "top1_count": top1,
        "top3_count": top3,
        "mrr_sum": mrr,
        "total": batch_size
    }
