import os
import json
import uuid
import datetime
import traceback
from typing import Dict, Any, Optional
from sqlalchemy import text

from app.db import get_engine
from app.retraining.dataset_generator import generate_retraining_dataset
from app.retraining.quality_gate import CurrentSelfQualityGate, PeakSelfQualityGate
from app.retraining.activation import atomic_activate_candidate

from app.models.current_self.config import CurrentSelfTrainingConfig
from app.models.current_self.trainer import CurrentSelfTrainer
from app.models.peak_self.config import PeakSelfTrainingConfig
from app.models.peak_self.trainer import PeakSelfTrainer

class RetrainingPipeline:
    def __init__(self):
        self.engine = get_engine()

    def get_or_create_job(
        self,
        user_id: str,
        triggered_by: str = "MANUAL",
        dry_run: bool = False
    ) -> Dict[str, Any]:
        """
        Idempotent job lookup or creation (Section 8).
        If a job already exists for (userId, sourceDatasetVersion='v2', currentModelVersion)
        and is either running or completed, returns the existing job.
        """
        with self.engine.connect() as conn:
            # Get current active Current Self version
            active_m = conn.execute(text("""
                SELECT version FROM "MLModelVersion"
                WHERE "userId" = :userId AND "modelType" = 'CURRENT_SELF' AND "isActive" = true
                ORDER BY version DESC LIMIT 1
            """), {"userId": user_id}).fetchone()
            curr_ver = active_m[0] if active_m else 1
            
            # Check for existing job
            existing = conn.execute(text("""
                SELECT id, status, "progressPct", stage, "isActivated", "currentGatePassed",
                       "peakGatePassed", "failureReason", "rejectionReason", "createdAt"
                FROM "ModelRetrainingJob"
                WHERE "userId" = :userId AND "sourceDatasetVersion" = 'v2' AND "currentModelVersion" = :currVer
                ORDER BY "createdAt" DESC LIMIT 1
            """), {"userId": user_id, "currVer": curr_ver}).fetchone()
            
            if existing and existing.status in ("QUEUED", "RUNNING", "COMPLETED"):
                return {
                    "jobId": existing.id,
                    "status": existing.status,
                    "progressPct": existing.progressPct,
                    "stage": existing.stage,
                    "isActivated": existing.isActivated,
                    "currentGatePassed": existing.currentGatePassed,
                    "peakGatePassed": existing.peakGatePassed,
                    "isExisting": True
                }

            # Discover eligibility candidate ID if exists
            cand = conn.execute(text("""
                SELECT id, "newGamesSinceLastTrain"
                FROM "ModelUpdateCandidate"
                WHERE "userId" = :userId
            """), {"userId": user_id}).fetchone()
            cand_id = cand[0] if cand else None
            
            job_id = str(uuid.uuid4())
            conn.execute(text("""
                INSERT INTO "ModelRetrainingJob" (
                    id, "userId", "triggeredBy", "eligibilityCandidateId",
                    "sourceDatasetVersion", "featureVersion", "trainingConfigVersion",
                    "currentModelVersion", status, stage, "progressPct", "createdAt", "updatedAt"
                ) VALUES (
                    :id, :userId, :triggeredBy, :candId,
                    'v2', 'v1', 'v1',
                    :currVer, 'QUEUED', 'QUEUED', 0, NOW(), NOW()
                )
            """), {
                "id": job_id,
                "userId": user_id,
                "triggeredBy": triggered_by,
                "candId": cand_id,
                "currVer": curr_ver
            })
            conn.commit()

            return {
                "jobId": job_id,
                "status": "QUEUED",
                "progressPct": 0,
                "stage": "QUEUED",
                "isActivated": False,
                "isExisting": False
            }

    def _update_job(self, job_id: str, **kwargs):
        with self.engine.connect() as conn:
            set_clauses = ['"updatedAt" = NOW()']
            params = {"jobId": job_id}
            for k, v in kwargs.items():
                set_clauses.append(f'"{k}" = :{k}')
                params[k] = v
            sql = f'UPDATE "ModelRetrainingJob" SET {", ".join(set_clauses)} WHERE id = :jobId'
            conn.execute(text(sql), params)
            conn.commit()

    def run_pipeline(self, job_id: str, dry_run: bool = False) -> Dict[str, Any]:
        """
        Executes the continuous retraining pipeline end-to-end.
        """
        with self.engine.connect() as conn:
            job = conn.execute(text("""
                SELECT id, "userId", "currentModelVersion"
                FROM "ModelRetrainingJob" WHERE id = :id
            """), {"id": job_id}).fetchone()
            
        if not job:
            raise ValueError(f"Job {job_id} not found")
            
        user_id = job.userId
        current_version = job.currentModelVersion
        candidate_version = current_version + 1
        
        try:
            # -------------------------------------------------------------
            # Stage 1: Dataset Generation (0% -> 20%)
            # -------------------------------------------------------------
            self._update_job(job_id, status="RUNNING", stage="DATASET_GENERATION", progressPct=10, startedAt=datetime.datetime.utcnow())
            ds_result = generate_retraining_dataset(user_id=user_id, dataset_version="v2", window_game_count=100)
            
            curr_ds_id = ds_result["currentSelfDatasetId"]
            peak_ds_id = ds_result["peakSelfDatasetId"]
            
            self._update_job(
                job_id,
                stage="DATASET_GENERATED",
                progressPct=20,
                sourceGameCount=ds_result["totalGames"],
                sourceGameStart=datetime.datetime.fromisoformat(ds_result["splits"]["train"]["startDate"]),
                sourceGameEnd=datetime.datetime.fromisoformat(ds_result["splits"]["test"]["endDate"])
            )

            # -------------------------------------------------------------
            # Stage 2: Train Current Self Candidate (20% -> 40%)
            # -------------------------------------------------------------
            self._update_job(job_id, stage="TRAINING_CURRENT_SELF", progressPct=25)
            
            # Fetch active v1 Current Self for later comparison and paths
            with self.engine.connect() as conn:
                active_curr = conn.execute(text("""
                    SELECT id, version, "artifactPath"
                    FROM "MLModelVersion"
                    WHERE "userId" = :userId AND "modelType" = 'CURRENT_SELF' AND "isActive" = true
                    ORDER BY version DESC LIMIT 1
                """), {"userId": user_id}).fetchone()
                active_curr_artifact = active_curr.artifactPath if active_curr else None

                # Derive Next Version dynamically from DB: MAX(version) + 1
                max_curr_v = conn.execute(text("""
                    SELECT COALESCE(MAX(version), 0) FROM "MLModelVersion"
                    WHERE "userId" = :userId AND "modelType" = 'CURRENT_SELF'
                """), {"userId": user_id}).fetchone()[0]
                candidate_curr_version = max_curr_v + 1

                # Register Current Self Candidate (READY != ACTIVE, isActive = false)
                curr_cand_id = str(uuid.uuid4())
                artifact_dir_curr = os.path.abspath(f"./artifacts/current_self/{user_id}/v{candidate_curr_version}")
                os.makedirs(artifact_dir_curr, exist_ok=True)
                
                conn.execute(text("""
                    INSERT INTO "MLModelVersion" (
                        id, "userId", "modelType", version, "datasetVersion",
                        "featureVersion", "architectureVersion", "trainingConfigVersion",
                        "gamesUsed", "positionsUsed", status, "isActive", "createdAt"
                    ) VALUES (
                        :id, :userId, 'CURRENT_SELF', :version, 'v2',
                        'v1', 'v1', 'v1',
                        :games, :pos, 'TRAINING', false, NOW()
                    )
                """), {
                    "id": curr_cand_id,
                    "userId": user_id,
                    "version": candidate_curr_version,
                    "games": ds_result["totalGames"],
                    "pos": ds_result["totalPositions"]
                })
                conn.commit()

            curr_config = CurrentSelfTrainingConfig(epochs=6, batchSize=32, earlyStoppingPatience=2)
            curr_trainer = CurrentSelfTrainer(curr_ds_id, curr_config, artifact_dir_curr)
            curr_train_metrics = curr_trainer.train()
            curr_best_path = os.path.join(artifact_dir_curr, "checkpoint_best.pt")

            with self.engine.connect() as conn:
                conn.execute(text("""
                    UPDATE "MLModelVersion"
                    SET metrics = :metrics, "artifactPath" = :path, "trainedAt" = NOW()
                    WHERE id = :id
                """), {
                    "id": curr_cand_id,
                    "metrics": json.dumps(curr_train_metrics),
                    "path": curr_best_path
                })
                conn.commit()

            self._update_job(job_id, stage="EVALUATING_CURRENT_SELF", progressPct=40, currentSelfModelId=curr_cand_id, candidateCurrentSelfVersion=candidate_curr_version)

            # -------------------------------------------------------------
            # Stage 3 & 4: Current Self Evaluation & Quality Gate (40% -> 60%)
            # -------------------------------------------------------------
            curr_gate = CurrentSelfQualityGate()
            curr_passed, curr_reasons, curr_gate_report = curr_gate.evaluate_gate(
                candidate_artifact_path=curr_best_path,
                active_artifact_path=active_curr_artifact,
                test_dataset_id=curr_ds_id,
                config=curr_config
            )

            with self.engine.connect() as conn:
                conn.execute(text("""
                    UPDATE "MLModelVersion"
                    SET status = :status,
                        "evaluationStatus" = :evalStatus,
                        "evaluationMetrics" = :evalMetrics,
                        "qualityGateResult" = :qgResult,
                        "evaluationCompletedAt" = NOW()
                    WHERE id = :id
                """), {
                    "id": curr_cand_id,
                    "status": "READY" if curr_passed else "REJECTED",
                    "evalStatus": "PASS" if curr_passed else "FAIL",
                    "evalMetrics": json.dumps(curr_gate_report.get("candidateMetrics", {})),
                    "qgResult": json.dumps({"status": "PASS" if curr_passed else "FAIL", "reasons": curr_reasons})
                })
                conn.commit()

            if not curr_passed:
                rej_msg = f"Current Self candidate failed quality gate: {'; '.join(curr_reasons)}"
                self._update_job(job_id, status="REJECTED", stage="QUALITY_GATE_CURRENT_FAILED", progressPct=50, currentGatePassed=False, rejectionReason=rej_msg)
                return {
                    "status": "REJECTED",
                    "reason": rej_msg,
                    "currentSelfGate": curr_gate_report
                }

            self._update_job(job_id, stage="TRAINING_PEAK_SELF", progressPct=60, currentGatePassed=True)

            # -------------------------------------------------------------
            # Stage 5: Train Peak Self Candidate (60% -> 75%)
            # -------------------------------------------------------------
            with self.engine.connect() as conn:
                active_peak = conn.execute(text("""
                    SELECT id, version, "artifactPath"
                    FROM "MLModelVersion"
                    WHERE "userId" = :userId AND "modelType" = 'PEAK_SELF' AND "isActive" = true
                    ORDER BY version DESC LIMIT 1
                """), {"userId": user_id}).fetchone()
                active_peak_artifact = active_peak.artifactPath if active_peak else None

                max_peak_v = conn.execute(text("""
                    SELECT COALESCE(MAX(version), 0) FROM "MLModelVersion"
                    WHERE "userId" = :userId AND "modelType" = 'PEAK_SELF'
                """), {"userId": user_id}).fetchone()[0]
                candidate_peak_version = max_peak_v + 1

                # Peak Self v2 MUST depend on Current Self v2 (Section 18)
                peak_cand_id = str(uuid.uuid4())
                conn.execute(text("""
                    INSERT INTO "MLModelVersion" (
                        id, "userId", "modelType", version, "datasetVersion",
                        "featureVersion", "architectureVersion", "trainingConfigVersion",
                        "dependentModelVersionId", "gamesUsed", "positionsUsed",
                        status, "isActive", "createdAt"
                    ) VALUES (
                        :id, :userId, 'PEAK_SELF', :version, 'v2',
                        'v1', 'v1', 'v1',
                        :depId, :games, :pos,
                        'TRAINING', false, NOW()
                    )
                """), {
                    "id": peak_cand_id,
                    "userId": user_id,
                    "version": candidate_peak_version,
                    "depId": curr_cand_id,
                    "games": ds_result["totalGames"],
                    "pos": ds_result["totalPositions"]
                })
                conn.commit()

            peak_config = PeakSelfTrainingConfig(epochs=6, batchSize=32, earlyStoppingPatience=2)
            peak_trainer = PeakSelfTrainer(peak_config, peak_ds_id)
            peak_train_res = peak_trainer.train()
            peak_artifact_dir = peak_train_res["artifactPath"]
            peak_train_metrics = peak_train_res["metrics"]

            with self.engine.connect() as conn:
                conn.execute(text("""
                    UPDATE "MLModelVersion"
                    SET metrics = :metrics, "artifactPath" = :path, "trainedAt" = NOW()
                    WHERE id = :id
                """), {
                    "id": peak_cand_id,
                    "metrics": json.dumps(peak_train_metrics),
                    "path": peak_artifact_dir
                })
                conn.commit()

            self._update_job(job_id, stage="EVALUATING_PEAK_SELF", progressPct=75, peakSelfModelId=peak_cand_id, candidatePeakSelfVersion=candidate_peak_version)

            # -------------------------------------------------------------
            # Stage 6 & 7: Peak Self Evaluation & Quality Gate (75% -> 90%)
            # -------------------------------------------------------------
            peak_gate = PeakSelfQualityGate()
            peak_passed, peak_reasons, peak_gate_report = peak_gate.evaluate_gate(
                candidate_artifact_dir=peak_artifact_dir,
                dependent_current_self_id=curr_cand_id,
                candidate_dependent_id=curr_cand_id,
                test_dataset_id=peak_ds_id,
                config=peak_config,
                active_artifact_dir=active_peak_artifact
            )

            with self.engine.connect() as conn:
                conn.execute(text("""
                    UPDATE "MLModelVersion"
                    SET status = :status,
                        "evaluationStatus" = :evalStatus,
                        "evaluationMetrics" = :evalMetrics,
                        "qualityGateResult" = :qgResult,
                        "evaluationCompletedAt" = NOW()
                    WHERE id = :id
                """), {
                    "id": peak_cand_id,
                    "status": "READY" if peak_passed else "REJECTED",
                    "evalStatus": "PASS" if peak_passed else "FAIL",
                    "evalMetrics": json.dumps(peak_gate_report.get("candidateMetrics", {})),
                    "qgResult": json.dumps({"status": "PASS" if peak_passed else "FAIL", "reasons": peak_reasons})
                })
                conn.commit()

            if not peak_passed:
                rej_msg = f"Peak Self candidate failed quality gate: {'; '.join(peak_reasons)}"
                self._update_job(job_id, status="REJECTED", stage="QUALITY_GATE_PEAK_FAILED", progressPct=85, peakGatePassed=False, rejectionReason=rej_msg)
                return {
                    "status": "REJECTED",
                    "reason": rej_msg,
                    "peakSelfGate": peak_gate_report
                }

            self._update_job(job_id, stage="READY_FOR_ACTIVATION", progressPct=90, peakGatePassed=True)

            # -------------------------------------------------------------
            # Stage 8: Conditional Atomic Activation (90% -> 100%)
            # -------------------------------------------------------------
            act_ok, act_msg, act_data = atomic_activate_candidate(
                user_id=user_id,
                current_candidate_id=curr_cand_id,
                peak_candidate_id=peak_cand_id,
                job_id=job_id,
                dry_run=dry_run
            )

            if not act_ok:
                self._update_job(job_id, status="FAILED", stage="ACTIVATION_FAILED", failureReason=act_msg)
                return {
                    "status": "ACTIVATION_FAILED",
                    "reason": act_msg
                }

            full_report = {
                "status": "COMPLETED",
                "dryRun": dry_run,
                "jobId": job_id,
                "userId": user_id,
                "dataset": ds_result,
                "currentSelf": {
                    "id": curr_cand_id,
                    "version": candidate_curr_version,
                    "gate": curr_gate_report
                },
                "peakSelf": {
                    "id": peak_cand_id,
                    "version": candidate_peak_version,
                    "dependentModelVersionId": curr_cand_id,
                    "gate": peak_gate_report
                },
                "activation": act_data
            }

            # Save detailed report to artifacts
            report_dir = os.path.abspath("./artifacts/retraining")
            os.makedirs(report_dir, exist_ok=True)
            with open(os.path.join(report_dir, f"report_{job_id}.json"), "w") as f:
                json.dump(full_report, f, indent=2, default=str)

            return full_report

        except Exception as e:
            err_msg = str(e) + "\n" + traceback.format_exc()
            self._update_job(job_id, status="FAILED", stage="ERROR", failureReason=err_msg)
            raise e
