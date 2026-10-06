import datetime
import json
from typing import Dict, Any, Tuple, Optional
from sqlalchemy import text
from app.db import get_engine

def atomic_rollback_models(
    user_id: str,
    target_current_id: str,
    target_peak_id: Optional[str] = None,
    operator: str = "USER_REQUEST"
) -> Tuple[bool, str, Dict[str, Any]]:
    """
    Executes an atomic rollback to a previous model version for a verified user.
    Ensures dependency integrity between Peak Self and Current Self.
    Logs an audit event in ModelRetrainingJob.
    """
    engine = get_engine()

    with engine.connect() as conn:
        trans = conn.begin()
        try:
            # 1. Lock user row to serialize model activation state mutations
            conn.execute(text("""
                SELECT id FROM "User" WHERE id = :userId FOR UPDATE
            """), {"userId": user_id})

            # 2. Fetch and verify Target Current Self model
            current_target = conn.execute(text("""
                SELECT id, version, status, "modelType", "artifactPath"
                FROM "MLModelVersion"
                WHERE id = :id AND "userId" = :userId AND "modelType" = 'CURRENT_SELF'
                FOR UPDATE
            """), {"id": target_current_id, "userId": user_id}).fetchone()

            if not current_target:
                trans.rollback()
                return False, f"Target Current Self model {target_current_id} not found or not owned by user.", {}

            if current_target.status not in ["READY", "SUPERSEDED", "ACTIVE"]:
                trans.rollback()
                return False, f"Cannot rollback to model with status '{current_target.status}'.", {}

            # 3. Resolve and verify matching Peak Self model
            if target_peak_id:
                peak_target = conn.execute(text("""
                    SELECT id, version, status, "modelType", "dependentModelVersionId", "artifactPath"
                    FROM "MLModelVersion"
                    WHERE id = :id AND "userId" = :userId AND "modelType" = 'PEAK_SELF'
                    FOR UPDATE
                """), {"id": target_peak_id, "userId": user_id}).fetchone()

                if not peak_target:
                    trans.rollback()
                    return False, f"Target Peak Self model {target_peak_id} not found.", {}

                if peak_target.dependentModelVersionId != target_current_id:
                    trans.rollback()
                    return False, (
                        f"Dependency mismatch: Peak model {target_peak_id} depends on "
                        f"{peak_target.dependentModelVersionId}, not target Current model {target_current_id}."
                    ), {}
            else:
                # Automatically find the Peak Self model dependent on this Current Self model
                peak_target = conn.execute(text("""
                    SELECT id, version, status, "modelType", "dependentModelVersionId", "artifactPath"
                    FROM "MLModelVersion"
                    WHERE "userId" = :userId 
                      AND "modelType" = 'PEAK_SELF' 
                      AND "dependentModelVersionId" = :depId
                      AND status IN ('READY', 'SUPERSEDED', 'ACTIVE')
                    ORDER BY version DESC LIMIT 1
                    FOR UPDATE
                """), {"userId": user_id, "depId": target_current_id}).fetchone()

                if not peak_target:
                    trans.rollback()
                    return False, (
                        f"No compatible Peak Self model found that depends on Current Self version {current_target.version}. "
                        "Rollback aborted to preserve dependency integrity."
                    ), {}

            now = datetime.datetime.utcnow()

            # 4. Deactivate currently active models
            conn.execute(text("""
                UPDATE "MLModelVersion"
                SET "isActive" = false, status = 'SUPERSEDED', "supersededAt" = :now
                WHERE "userId" = :userId AND "isActive" = true
            """), {"userId": user_id, "now": now})

            # 5. Atomically activate target models
            conn.execute(text("""
                UPDATE "MLModelVersion"
                SET "isActive" = true, status = 'ACTIVE', "activatedAt" = :now
                WHERE id IN (:currentId, :peakId)
            """), {"currentId": target_current_id, "peakId": peak_target.id, "now": now})

            # 6. Insert audit trail record
            audit_job_id = f"rollback_{target_current_id[:8]}_{int(now.timestamp())}"
            conn.execute(text("""
                INSERT INTO "ModelRetrainingJob" (
                    id, "userId", "triggeredBy", "sourceGameCount", "sourceDatasetVersion",
                    "currentModelVersion", "candidateCurrentSelfVersion", "candidatePeakSelfVersion",
                    "currentSelfModelId", "peakSelfModelId", status, stage, "progressPct",
                    "isActivated", "currentGatePassed", "peakGatePassed", "completedAt", "createdAt"
                ) VALUES (
                    :id, :userId, :triggeredBy, 0, 'rollback',
                    :currentVer, :currentVer, :peakVer,
                    :currentId, :peakId, 'COMPLETED', 'ROLLBACK_EXECUTED', 100,
                    true, true, true, :now, :now
                )
            """), {
                "id": audit_job_id,
                "userId": user_id,
                "triggeredBy": f"ROLLBACK:{operator}",
                "currentVer": current_target.version,
                "peakVer": peak_target.version,
                "currentId": target_current_id,
                "peakId": peak_target.id,
                "now": now
            })

            # 7. Update ModelUpdateCandidate
            conn.execute(text("""
                UPDATE "ModelUpdateCandidate"
                SET "currentSelfActiveVersion" = :currentVer,
                    "peakSelfActiveVersion" = :peakVer,
                    "lastEvaluatedAt" = :now
                WHERE "userId" = :userId
            """), {
                "currentVer": current_target.version,
                "peakVer": peak_target.version,
                "now": now,
                "userId": user_id
            })

            trans.commit()

            return True, "Model rollback executed successfully.", {
                "auditJobId": audit_job_id,
                "activatedCurrentSelf": {
                    "id": target_current_id,
                    "version": current_target.version,
                    "status": "ACTIVE"
                },
                "activatedPeakSelf": {
                    "id": peak_target.id,
                    "version": peak_target.version,
                    "dependentModelId": target_current_id,
                    "status": "ACTIVE"
                },
                "rolledBackAt": now.isoformat()
            }

        except Exception as e:
            trans.rollback()
            return False, f"Rollback transaction failed: {str(e)}", {}
