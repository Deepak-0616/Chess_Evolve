from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from sqlalchemy import text
from app.db import get_engine
from app.retraining.pipeline import RetrainingPipeline
from app.retraining.activation import atomic_activate_candidate

router = APIRouter(prefix="/api/v1/ml/retrain", tags=["retraining"])

class TriggerRetrainRequest(BaseModel):
    user_id: str
    triggered_by: Optional[str] = "MANUAL"
    dry_run: Optional[bool] = False
    run_sync: Optional[bool] = False

class ActivateRequest(BaseModel):
    user_id: str
    current_model_id: str
    peak_model_id: str
    job_id: str

@router.get("/status/{user_id}")
def get_retraining_status(user_id: str):
    engine = get_engine()
    with engine.connect() as conn:
        # Latest job
        job = conn.execute(text("""
            SELECT id, status, stage, "progressPct", "isActivated", "currentGatePassed",
                   "peakGatePassed", "candidateCurrentSelfVersion", "candidatePeakSelfVersion",
                   "currentSelfModelId", "peakSelfModelId", "failureReason", "rejectionReason",
                   "startedAt", "completedAt", "createdAt"
            FROM "ModelRetrainingJob"
            WHERE "userId" = :userId
            ORDER BY "createdAt" DESC LIMIT 1
        """), {"userId": user_id}).fetchone()

        # Update Candidate
        cand = conn.execute(text("""
            SELECT status, "newGamesSinceLastTrain", "newPositionsSinceLastTrain",
                   "currentSelfActiveVersion", "peakSelfActiveVersion", "eligibilityReasons"
            FROM "ModelUpdateCandidate"
            WHERE "userId" = :userId
        """), {"userId": user_id}).fetchone()

        # Active Models
        active_models = conn.execute(text("""
            SELECT id, "modelType", version, status, "artifactPath", "gamesUsed", "positionsUsed", metrics, "activatedAt"
            FROM "MLModelVersion"
            WHERE "userId" = :userId AND "isActive" = true
            ORDER BY "modelType"
        """), {"userId": user_id}).fetchall()

        # All model versions for history
        all_models = conn.execute(text("""
            SELECT id, "modelType", version, status, "isActive", "dependentModelVersionId", "gamesUsed", "positionsUsed", "createdAt", "activatedAt", "supersededAt"
            FROM "MLModelVersion"
            WHERE "userId" = :userId
            ORDER BY "modelType", version DESC
        """), {"userId": user_id}).fetchall()

    return {
        "job": dict(job._mapping) if job else None,
        "eligibility": dict(cand._mapping) if cand else None,
        "activeModels": [dict(m._mapping) for m in active_models],
        "allVersions": [dict(m._mapping) for m in all_models]
    }

def _bg_run_pipeline(job_id: str, dry_run: bool):
    pipeline = RetrainingPipeline()
    try:
        pipeline.run_pipeline(job_id, dry_run=dry_run)
    except Exception as e:
        print(f"Retraining Pipeline Error for job {job_id}: {e}")

@router.post("/trigger")
def trigger_retraining(req: TriggerRetrainRequest, background_tasks: BackgroundTasks):
    pipeline = RetrainingPipeline()
    job_info = pipeline.get_or_create_job(
        user_id=req.user_id,
        triggered_by=req.triggered_by or "MANUAL",
        dry_run=req.dry_run
    )
    
    if req.run_sync:
        pipeline.run_pipeline(job_info["jobId"], dry_run=req.dry_run)
        return {
            "success": True,
            "job": job_info,
            "message": "Retraining job executed synchronously"
        }

    if not job_info.get("isExisting") or job_info.get("status") == "QUEUED":
        background_tasks.add_task(_bg_run_pipeline, job_info["jobId"], req.dry_run)
        
    return {
        "success": True,
        "job": job_info,
        "message": "Retraining job running in background" if not job_info.get("isExisting") else "Existing job returned"
    }

@router.post("/activate")
def activate_models(req: ActivateRequest):
    ok, msg, data = atomic_activate_candidate(
        user_id=req.user_id,
        current_candidate_id=req.current_model_id,
        peak_candidate_id=req.peak_model_id,
        job_id=req.job_id
    )
    if not ok:
        raise HTTPException(status_code=400, detail=msg)
    return {"success": True, "message": msg, "data": data}

class RollbackRequest(BaseModel):
    user_id: str
    target_current_id: str
    target_peak_id: Optional[str] = None
    operator: Optional[str] = "USER_REQUEST"

@router.post("/rollback")
def rollback_models(req: RollbackRequest):
    from app.retraining.rollback import atomic_rollback_models
    ok, msg, data = atomic_rollback_models(
        user_id=req.user_id,
        target_current_id=req.target_current_id,
        target_peak_id=req.target_peak_id,
        operator=req.operator or "USER_REQUEST"
    )
    if not ok:
        raise HTTPException(status_code=400, detail=msg)
    return {"success": True, "message": msg, "data": data}

@router.get("/history/{user_id}")
def get_retraining_history(user_id: str):
    engine = get_engine()
    with engine.connect() as conn:
        jobs = conn.execute(text("""
            SELECT id, "triggeredBy", "sourceGameCount", "sourceDatasetVersion",
                   "currentModelVersion", "candidateCurrentSelfVersion", "candidatePeakSelfVersion",
                   status, stage, "progressPct", "isActivated", "failureReason", "rejectionReason",
                   "startedAt", "completedAt", "createdAt"
            FROM "ModelRetrainingJob"
            WHERE "userId" = :userId
            ORDER BY "createdAt" DESC
        """), {"userId": user_id}).fetchall()
        
    return {
        "userId": user_id,
        "jobs": [dict(j._mapping) for j in jobs]
    }
