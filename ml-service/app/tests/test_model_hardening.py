import pytest
from app.models.storage import ModelStorage
from app.retraining.activation import atomic_activate_candidate
from app.retraining.rollback import atomic_rollback_models

def test_model_storage_canonical_path():
    storage = ModelStorage("./artifacts")
    path = storage.get_canonical_path("user123", "CURRENT_SELF", "mod456")
    assert "current_self" in path
    assert "user123" in path
    assert "mod456" in path
    assert path.endswith("checkpoint_best.pt")

def test_model_storage_rejects_nonexistent_or_empty_artifact():
    storage = ModelStorage("./artifacts")
    assert storage.verify_artifact("./nonexistent_artifact_file.pt") is False

def test_atomic_activation_rejects_nonexistent_candidate():
    ok, msg, data = atomic_activate_candidate(
        user_id="fake_user_id",
        current_candidate_id="fake_cand_id_1",
        peak_candidate_id="fake_cand_id_2",
        job_id="fake_job_1",
        dry_run=False
    )
    assert ok is False
    assert "not found" in msg.lower()

def test_atomic_rollback_rejects_unauthorized_or_nonexistent_model():
    ok, msg, data = atomic_rollback_models(
        user_id="fake_user_id",
        target_current_id="fake_model_id",
        operator="TEST"
    )
    assert ok is False
    assert "not found" in msg.lower()
