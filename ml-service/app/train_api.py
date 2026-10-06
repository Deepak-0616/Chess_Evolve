from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel
from app.models.current_self.trainer import CurrentSelfTrainer
from app.models.current_self.config import CurrentSelfTrainingConfig
from app.models.current_self.registry import ModelRegistry
from app.models.current_self.evaluator import CurrentSelfEvaluator
import os
import traceback

from typing import Optional

router = APIRouter()

class TrainRequest(BaseModel):
    model_version_id: str
    dataset_id: str
    user_id: str
    run_sync: Optional[bool] = False

def run_training_task(req: TrainRequest):
    registry = ModelRegistry()
    registry.start_training(req.model_version_id)
    
    try:
        config = CurrentSelfTrainingConfig()
        # Create artifacts dir specific to this model
        artifact_dir = f"./artifacts/current_self/{req.user_id}/{req.model_version_id}"
        
        trainer = CurrentSelfTrainer(req.dataset_id, config, artifact_dir)
        metrics = trainer.train()
        
        best_path = os.path.join(artifact_dir, "checkpoint_best.pt")
        
        # 2. Evaluate on TEST set
        registry.update_status(req.model_version_id, "VALIDATING")
        evaluator = CurrentSelfEvaluator(req.dataset_id, config, best_path)
        eval_report = evaluator.evaluate()
        
        # 3. Finalize
        final_status = "READY"
        if eval_report.get("qualityGate", {}).get("status") == "FAIL":
            final_status = "VALIDATION_FAILED"
        elif eval_report.get("qualityGate", {}).get("status") == "INSUFFICIENT_EVIDENCE":
            final_status = "INSUFFICIENT_DATA"
            
        registry.update_status(
            model_version_id=req.model_version_id,
            status=final_status,
            metrics=metrics,
            artifact_path=best_path,
            eval_report=eval_report
        )
    except Exception as e:
        error_msg = str(e) + "\n" + traceback.format_exc()
        print("Training Failed:", error_msg)
        registry.update_status(
            model_version_id=req.model_version_id,
            status="FAILED",
            metrics={"error": str(e)}
        )

@router.post("/api/v1/ml/train/current-self")
def start_current_self_training(req: TrainRequest, background_tasks: BackgroundTasks):
    try:
        if req.run_sync:
            run_training_task(req)
            return {"success": True, "message": "Training executed synchronously"}
        background_tasks.add_task(run_training_task, req)
        return {"success": True, "message": "Training queued"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def run_peak_training_task(req: TrainRequest):
    registry = ModelRegistry()
    registry.start_training(req.model_version_id)
    
    try:
        from app.models.peak_self.config import PeakSelfTrainingConfig
        from app.models.peak_self.trainer import PeakSelfTrainer
        from app.models.peak_self.evaluator import PeakSelfEvaluator
        
        config = PeakSelfTrainingConfig()
        trainer = PeakSelfTrainer(config, req.dataset_id)
        
        # Train returns a dict with artifactPath and metrics
        train_result = trainer.train()
        artifact_dir = train_result["artifactPath"]
        metrics = train_result["metrics"]
        
        # Evaluate
        registry.update_status(req.model_version_id, "VALIDATING")
        evaluator = PeakSelfEvaluator()
        eval_status, eval_reasons, eval_behavior = evaluator.evaluate(req.user_id, artifact_dir, req.dataset_id, metrics)
        
        final_status = "READY"
        if eval_status == "FAIL":
            final_status = "VALIDATION_FAILED"
            
        eval_report = {
            "metrics": metrics, # Copying training metrics over since we skipped a separate evaluate run
            "behavioralSimilarity": eval_behavior,
            "baselines": {},
            "qualityGate": {
                "status": eval_status,
                "reasons": eval_reasons
            }
        }
            
        registry.update_status(
            model_version_id=req.model_version_id,
            status=final_status,
            metrics=metrics,
            artifact_path=artifact_dir,
            eval_report=eval_report
        )
    except Exception as e:
        error_msg = str(e) + "\n" + traceback.format_exc()
        print("Peak Training Failed:", error_msg)
        registry.update_status(
            model_version_id=req.model_version_id,
            status="FAILED",
            metrics={"error": str(e)}
        )

@router.post("/api/v1/ml/train/peak-self")
def start_peak_self_training(req: TrainRequest, background_tasks: BackgroundTasks):
    try:
        if req.run_sync:
            run_peak_training_task(req)
            return {"success": True, "message": "Peak Self Training executed synchronously"}
        background_tasks.add_task(run_peak_training_task, req)
        return {"success": True, "message": "Peak Self Training queued"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


