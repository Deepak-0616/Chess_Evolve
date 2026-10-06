from app.db import get_engine
from sqlalchemy import text

engine = get_engine()
with engine.connect() as conn:
    print("=== LIVE RESOLUTION VERIFICATION ===")
    uid = 'b2ea5969-f4a9-4fb6-9228-10a3bd42adcf'
    
    # Check what play session would resolve
    curr_active = conn.execute(text("""
        SELECT id, "modelType", version, status, "isActive", "artifactPath"
        FROM "MLModelVersion"
        WHERE "userId" = :uid AND "modelType" = 'CURRENT_SELF' AND "isActive" = true
        ORDER BY version DESC LIMIT 1
    """), {"uid": uid}).fetchone()
    print("Resolved Active Current Self:", curr_active)
    
    peak_active = conn.execute(text("""
        SELECT id, "modelType", version, status, "isActive", "dependentModelVersionId", "artifactPath"
        FROM "MLModelVersion"
        WHERE "userId" = :uid AND "modelType" = 'PEAK_SELF' AND "isActive" = true
        ORDER BY version DESC LIMIT 1
    """), {"uid": uid}).fetchone()
    print("Resolved Active Peak Self:", peak_active)
    
    assert curr_active.version == 2, "Current Self version should be 2"
    assert peak_active.version == 2, "Peak Self version should be 2"
    assert peak_active.dependentModelVersionId == curr_active.id, "Peak Self v2 must depend on Current Self v2"
    print("[OK] Dependency and live resolution verified!")
    
    # Check Evolution milestone
    evo = conn.execute(text("""
        SELECT id, "sourceType", "cohortName", "currentSelfModelVersion", "peakSelfModelVersion", notes
        FROM "EvolutionSnapshot"
        WHERE "userId" = :uid AND "sourceType" = 'POST_TRAINING'
        ORDER BY "snapshotDate" DESC LIMIT 1
    """), {"uid": uid}).fetchone()
    print("Resolved Evolution Milestone:", evo)
    assert evo.currentSelfModelVersion == 2
    assert evo.peakSelfModelVersion == 2
    print("[OK] Evolution milestone verified!")
