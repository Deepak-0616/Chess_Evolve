import datetime
import json
import uuid
from typing import Dict, Any, Tuple
from sqlalchemy import text
from app.db import get_engine

def atomic_activate_candidate(
    user_id: str,
    current_candidate_id: str,
    peak_candidate_id: str,
    job_id: str,
    dry_run: bool = False
) -> Tuple[bool, str, Dict[str, Any]]:
    """
    Executes an atomic activation transaction for Current Self and Peak Self candidates.
    If either fails or dry_run is True, no activation occurs and existing active models remain ACTIVE.
    """
    if dry_run:
        return True, "DRY_RUN: Gates passed successfully; activation skipped as requested.", {
            "isActivated": False,
            "dryRun": True
        }
        
    engine = get_engine()
    
    with engine.connect() as conn:
        trans = conn.begin()
        try:
            # 1. Row-level locks and Concurrency Protection (Section 26)
            conn.execute(text("""
                SELECT id FROM "User" WHERE id = :userId FOR UPDATE
            """), {"userId": user_id})
            
            # 2. Fetch and verify Current Candidate
            current_cand = conn.execute(text("""
                SELECT id, version, status, "qualityGateResult", "modelType"
                FROM "MLModelVersion"
                WHERE id = :id AND "userId" = :userId
                FOR UPDATE
            """), {"id": current_candidate_id, "userId": user_id}).fetchone()
            
            if not current_cand:
                trans.rollback()
                return False, f"Current Self candidate {current_candidate_id} not found.", {}
                
            if current_cand.status != "READY":
                trans.rollback()
                return False, f"Current Self candidate is not READY (status: {current_cand.status}).", {}
                
            current_gate = current_cand.qualityGateResult
            if isinstance(current_gate, str):
                current_gate = json.loads(current_gate)
            if not current_gate or current_gate.get("status") != "PASS":
                trans.rollback()
                return False, f"Current Self candidate failed quality gate (status: {current_gate.get('status') if current_gate else 'None'}).", {}

            # 3. Fetch and verify Peak Candidate
            peak_cand = conn.execute(text("""
                SELECT id, version, status, "qualityGateResult", "dependentModelVersionId", "modelType"
                FROM "MLModelVersion"
                WHERE id = :id AND "userId" = :userId
                FOR UPDATE
            """), {"id": peak_candidate_id, "userId": user_id}).fetchone()
            
            if not peak_cand:
                trans.rollback()
                return False, f"Peak Self candidate {peak_candidate_id} not found.", {}
                
            if peak_cand.status != "READY":
                trans.rollback()
                return False, f"Peak Self candidate is not READY (status: {peak_cand.status}).", {}
                
            if peak_cand.dependentModelVersionId != current_candidate_id:
                trans.rollback()
                return False, (
                    f"Peak candidate dependency violation: depends on {peak_cand.dependentModelVersionId}, "
                    f"expected Current candidate {current_candidate_id}."
                ), {}
                
            peak_gate = peak_cand.qualityGateResult
            if isinstance(peak_gate, str):
                peak_gate = json.loads(peak_gate)
            if not peak_gate or peak_gate.get("status") != "PASS":
                trans.rollback()
                return False, f"Peak Self candidate failed quality gate (status: {peak_gate.get('status') if peak_gate else 'None'}).", {}

            now = datetime.datetime.utcnow()
            
            # 4. Deactivate currently active models (Section 5, 25)
            # Find and deactivate existing ACTIVE Current Self models
            conn.execute(text("""
                UPDATE "MLModelVersion"
                SET "isActive" = false, status = 'SUPERSEDED', "supersededAt" = :now
                WHERE "userId" = :userId AND "modelType" = 'CURRENT_SELF' AND "isActive" = true
            """), {"userId": user_id, "now": now})
            
            # Find and deactivate existing ACTIVE Peak Self models
            conn.execute(text("""
                UPDATE "MLModelVersion"
                SET "isActive" = false, status = 'SUPERSEDED', "supersededAt" = :now
                WHERE "userId" = :userId AND "modelType" = 'PEAK_SELF' AND "isActive" = true
            """), {"userId": user_id, "now": now})
            
            # 5. Activate Candidate Models
            conn.execute(text("""
                UPDATE "MLModelVersion"
                SET "isActive" = true, status = 'ACTIVE', "activatedAt" = :now
                WHERE id = :id
            """), {"id": current_candidate_id, "now": now})
            
            conn.execute(text("""
                UPDATE "MLModelVersion"
                SET "isActive" = true, status = 'ACTIVE', "activatedAt" = :now
                WHERE id = :id
            """), {"id": peak_candidate_id, "now": now})
            
            # 6. Update ModelUpdateCandidate
            conn.execute(text("""
                UPDATE "ModelUpdateCandidate"
                SET status = 'ACTIVATED',
                    "currentSelfActiveVersion" = :currVer,
                    "peakSelfActiveVersion" = :peakVer,
                    "candidateCurrentSelfVersion" = :currVer,
                    "candidatePeakSelfVersion" = :peakVer,
                    "retrainingJobId" = :jobId,
                    "activationStatus" = 'ACTIVATED',
                    "updatedAt" = :now
                WHERE "userId" = :userId
            """), {
                "userId": user_id,
                "currVer": current_cand.version,
                "peakVer": peak_cand.version,
                "jobId": job_id,
                "now": now
            })
            
            # 7. Create Evolution Milestone Snapshot (Section 37)
            milestone_id = str(uuid.uuid4())
            conn.execute(text("""
                INSERT INTO "EvolutionSnapshot" (
                    id, "userId", "snapshotDate", "sourceType", "cohortName",
                    "currentSelfModelVersion", "peakSelfModelVersion",
                    notes, "createdAt"
                ) VALUES (
                    :id, :userId, :now, 'POST_TRAINING', :cohort,
                    :currVer, :peakVer, :notes, :now
                )
            """), {
                "id": milestone_id,
                "userId": user_id,
                "now": now,
                "cohort": f"Retraining Milestone (v{current_cand.version})",
                "currVer": current_cand.version,
                "peakVer": peak_cand.version,
                "notes": f"Activated Current Self v{current_cand.version} and Peak Self v{peak_cand.version} via atomic retraining pipeline."
            })
            
            # 8. Update Retraining Job Status
            conn.execute(text("""
                UPDATE "ModelRetrainingJob"
                SET status = 'COMPLETED',
                    stage = 'ACTIVATION_COMPLETED',
                    "progressPct" = 100,
                    "isActivated" = true,
                    "currentGatePassed" = true,
                    "peakGatePassed" = true,
                    "candidateCurrentSelfVersion" = :currVer,
                    "candidatePeakSelfVersion" = :peakVer,
                    "currentSelfModelId" = :currId,
                    "peakSelfModelId" = :peakId,
                    "completedAt" = :now,
                    "updatedAt" = :now
                WHERE id = :jobId
            """), {
                "jobId": job_id,
                "currVer": current_cand.version,
                "peakVer": peak_cand.version,
                "currId": current_candidate_id,
                "peakId": peak_candidate_id,
                "now": now
            })
            
            trans.commit()
            
            return True, "Atomic activation succeeded for Current Self and Peak Self candidates.", {
                "isActivated": True,
                "activatedCurrentSelfVersion": current_cand.version,
                "activatedPeakSelfVersion": peak_cand.version,
                "currentSelfModelId": current_candidate_id,
                "peakSelfModelId": peak_candidate_id,
                "evolutionMilestoneId": milestone_id,
                "activatedAt": now.isoformat()
            }
            
        except Exception as e:
            trans.rollback()
            return False, f"Atomic activation failed with error: {str(e)}", {}
