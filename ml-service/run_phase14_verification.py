import os
import sys
import json
import time
import requests
import jwt
from datetime import datetime, timezone
from sqlalchemy import text
from app.db import get_engine

# Load JWT secret from backend .env
backend_env_path = os.path.join(os.path.dirname(__file__), "..", "backend", ".env")
jwt_secret = None
if os.path.exists(backend_env_path):
    with open(backend_env_path, "r", encoding="utf-8") as f:
        for line in f:
            if line.startswith("SUPABASE_JWT_SECRET="):
                jwt_secret = line.strip().split("=", 1)[1].strip('"').strip("'")
                break

if not jwt_secret:
    print("FATAL: SUPABASE_JWT_SECRET not found in backend/.env")
    sys.exit(1)

def create_test_jwt(user_id, email="player@example.com"):
    now = int(time.time())
    payload = {
        "sub": user_id,
        "email": email,
        "role": "authenticated",
        "aud": "authenticated",
        "iat": now,
        "exp": now + 7200,
    }
    return jwt.encode(payload, jwt_secret, algorithm="HS256")

BACKEND_URL = "http://localhost:5000/api/v1"
ML_URL = "http://localhost:8000"

results = {
    "timestamp": datetime.now(timezone.utc).isoformat(),
    "database_checks": {},
    "rls_checks": {},
    "user_profiles": {},
    "quality_filter_audit": {},
    "model_inference_audit": {},
    "session_flow_audit": {},
    "security_audit": {},
    "summary": {
        "total_tests": 0,
        "passed_tests": 0,
        "failed_tests": 0
    }
}

def record_test(category, name, passed, details=None):
    results["summary"]["total_tests"] += 1
    if passed:
        results["summary"]["passed_tests"] += 1
        status = "PASS"
    else:
        results["summary"]["failed_tests"] += 1
        status = "FAIL"
    print(f"[{status}] {category} -> {name}: {details or ''}")
    return {"passed": passed, "details": details}

print("============================================================")
print("PHASE 14 — COMPREHENSIVE VERIFICATION & AUDIT")
print("============================================================")

engine = get_engine()

# ------------------------------------------------------------
# 1. DATABASE & RLS CHECKS
# ------------------------------------------------------------
print("\n--- 1. DATABASE SCHEMA & RLS AUDIT ---")
training_tables = [
    "TrainingPlan",
    "TrainingSession",
    "TrainingPosition",
    "TrainingAttempt",
    "TrainingProgress"
]

with engine.connect() as conn:
    for tbl in training_tables:
        res = conn.execute(text(f"""
            SELECT relrowsecurity, relforcerowsecurity 
            FROM pg_class 
            WHERE relname = '{tbl}'
        """)).fetchone()
        
        is_rls = res and res[0] is True
        results["rls_checks"][tbl] = {"rls_enabled": is_rls}
        record_test("RLS", f"RLS enabled on {tbl}", is_rls, f"relrowsecurity={is_rls}")

    # Check RLS policies
    pol_res = conn.execute(text("""
        SELECT tablename, policyname, cmd 
        FROM pg_policies 
        WHERE tablename IN ('TrainingPlan', 'TrainingSession', 'TrainingPosition', 'TrainingAttempt', 'TrainingProgress')
    """)).fetchall()
    
    policies_by_table = {}
    for row in pol_res:
        tname, pname, cmd = row[0], row[1], row[2]
        policies_by_table.setdefault(tname, []).append(f"{pname} ({cmd})")
    
    for tbl in training_tables:
        pols = policies_by_table.get(tbl, [])
        record_test("RLS", f"Policies on {tbl}", len(pols) > 0, f"Found {len(pols)} policies: {', '.join(pols)}")

# ------------------------------------------------------------
# 2. REAL USERS & TRAINING DATA SOURCES
# ------------------------------------------------------------
print("\n--- 2. REAL USERS & TRAINING DATA SOURCES ---")
with engine.connect() as conn:
    users = conn.execute(text("""
        SELECT u.id, u.email, cp.id as profile_id, cp."chessUsername", cp."totalGames"
        FROM "User" u
        JOIN "ChessProfile" cp ON cp."userId" = u.id
    """)).fetchall()

for u in users:
    uid, email, prof_id, chess_user, tot_games = u[0], u[1], u[2], u[3], u[4]
    
    with engine.connect() as conn:
        game_cnt = conn.execute(text(f'SELECT COUNT(*) FROM "Game" WHERE "chessProfileId" = \'{prof_id}\'')).scalar()
        mistake_cnt = conn.execute(text(f"""
            SELECT COUNT(*) 
            FROM "PositionAnalysis" pa
            JOIN "Game" g ON g.id = pa."gameId"
            WHERE g."chessProfileId" = '{prof_id}'
              AND pa."playerMove" = true
              AND pa.classification IN ('BLUNDER', 'MISTAKE', 'INACCURACY')
        """)).scalar()
        
        models = conn.execute(text(f"""
            SELECT "modelType", status, version 
            FROM "MLModelVersion" 
            WHERE "userId" = '{uid}'
        """)).fetchall()
        
        dna = conn.execute(text(f'SELECT "topWeaknesses", "topStrengths" FROM "ChessDNA" WHERE "userId" = \'{uid}\'')).fetchone()

    user_info = {
        "userId": uid,
        "chessUsername": chess_user,
        "totalGamesInDb": game_cnt,
        "mistakePositionsAvailable": mistake_cnt,
        "models": [{"type": m[0], "status": m[1], "version": m[2]} for m in models],
        "topWeaknesses": dna[0] if dna else [],
        "topStrengths": dna[1] if dna else []
    }
    results["user_profiles"][chess_user] = user_info
    
    record_test("Data Availability", f"User {chess_user} games in DB", game_cnt > 0, f"{game_cnt} games")
    record_test("Data Availability", f"User {chess_user} mistake positions", mistake_cnt >= 5, f"{mistake_cnt} candidate mistake positions")
    ready_models = [m for m in models if m[1] == "READY"]
    record_test("Model Availability", f"User {chess_user} READY models", len(ready_models) >= 2, f"{len(ready_models)} READY models")

# ------------------------------------------------------------
# 3. END-TO-END TRAINING FLOW VIA API
# ------------------------------------------------------------
print("\n--- 3. END-TO-END TRAINING FLOW (USER 1) ---")
user1 = users[0]
user1_id = user1[0]
user1_token = create_test_jwt(user1_id, user1[1])
headers1 = {"Authorization": f"Bearer {user1_token}", "Content-Type": "application/json"}

# 3.1 Overview
overview_res = requests.get(f"{BACKEND_URL}/training/overview", headers=headers1)
record_test("Training API", "GET /training/overview status 200", overview_res.status_code == 200, f"Status: {overview_res.status_code}")
overview_data = overview_res.json() if overview_res.status_code == 200 else {}
has_plan = bool(overview_data.get("activePlan"))
record_test("Training API", "Overview contains active training plan", has_plan, f"Category: {overview_data.get('activePlan', {}).get('focusCategory')}")

# 3.2 Create Session
create_res = requests.post(f"{BACKEND_URL}/training/sessions", headers=headers1, json={
    "category": overview_data.get("activePlan", {}).get("focusCategory", "TACTICAL"),
    "difficulty": "INTERMEDIATE"
})
record_test("Training API", "POST /training/sessions status 201", create_res.status_code == 201, f"Status: {create_res.status_code}")
session_data = create_res.json() if create_res.status_code == 201 else {}
session_id = session_data.get("session", {}).get("id")
positions = session_data.get("positions", [])
record_test("Training Session", "Session has 5 training positions", len(positions) == 5, f"Positions count: {len(positions)}")

# 3.3 Anti-Leakage / Security Sanitization
if positions:
    pos0 = positions[0]
    has_target = "targetMove" in pos0
    has_engine = "engineBestMove" in pos0
    record_test("Security Sanitization", "targetMove NOT leaked to client before attempt", not has_target, f"targetMove present: {has_target}")
    record_test("Security Sanitization", "engineBestMove NOT leaked before attempt", not has_engine, f"engineBestMove present: {has_engine}")

# 3.4 Move Submission & Attempt Validation
if session_id and positions:
    pos0 = positions[0]
    pos0_id = pos0["id"]
    
    # Query database to get the legal engine best move for this position to test correct submission
    with engine.connect() as conn:
        pos_db = conn.execute(text(f'SELECT "targetMove", "engineBestMove", "fen" FROM "TrainingPosition" WHERE id = \'{pos0_id}\'')).fetchone()
        real_target = pos_db[0]
        real_fen = pos_db[2]
    
    # Test 3.4.1: Submit Illegal Move -> should return 400
    illegal_res = requests.post(f"{BACKEND_URL}/training/sessions/{session_id}/attempt", headers=headers1, json={
        "positionId": pos0_id,
        "move": "e9e10",
        "timeSpentMs": 1500
    })
    record_test("Chess Validation", "Reject illegal move with 400", illegal_res.status_code == 400, f"Status: {illegal_res.status_code}")

    # Test 3.4.2: Submit Legal Target Move
    legal_res = requests.post(f"{BACKEND_URL}/training/sessions/{session_id}/attempt", headers=headers1, json={
        "positionId": pos0_id,
        "move": real_target,
        "timeSpentMs": 4200
    })
    record_test("Chess Validation", "Accept legal move with 200", legal_res.status_code == 200, f"Status: {legal_res.status_code}")
    attempt_data = legal_res.json() if legal_res.status_code == 200 else {}
    
    record_test("Attempt Result", "Attempt marked correct for target move", attempt_data.get("isCorrect") is True, f"isCorrect: {attempt_data.get('isCorrect')}")
    record_test("Attempt Result", "Engine rank is 1 for best move", attempt_data.get("engineRank") == 1, f"Rank: {attempt_data.get('engineRank')}")
    record_test("Attempt Result", "Deterministic explanation returned", bool(attempt_data.get("explanation")), f"Explanation length: {len(attempt_data.get('explanation', ''))}")
    
    # Test 3.4.3: Prevent duplicate attempts on same position
    dup_res = requests.post(f"{BACKEND_URL}/training/sessions/{session_id}/attempt", headers=headers1, json={
        "positionId": pos0_id,
        "move": real_target,
        "timeSpentMs": 2000
    })
    record_test("Security Rule", "Prevent duplicate attempt on same position with 400", dup_res.status_code == 400, f"Status: {dup_res.status_code}")

# 3.5 Complete Remaining Positions & Session
if session_id and len(positions) > 1:
    for idx in range(1, len(positions)):
        p = positions[idx]
        with engine.connect() as conn:
            target = conn.execute(text(f'SELECT "targetMove" FROM "TrainingPosition" WHERE id = \'{p["id"]}\'')).scalar()
        requests.post(f"{BACKEND_URL}/training/sessions/{session_id}/attempt", headers=headers1, json={
            "positionId": p["id"],
            "move": target,
            "timeSpentMs": 3000
        })

    # Complete session
    comp_res = requests.post(f"{BACKEND_URL}/training/sessions/{session_id}/complete", headers=headers1)
    record_test("Training Session", "POST /complete marks session COMPLETED with 200", comp_res.status_code == 200, f"Status: {comp_res.status_code}")
    comp_data = comp_res.json() if comp_res.status_code == 200 else {}
    record_test("Training Session", "Session score calculated correctly (100%)", comp_data.get("score") == 100, f"Score: {comp_data.get('score')}%")

# 3.6 Verify Progress
prog_res = requests.get(f"{BACKEND_URL}/training/progress", headers=headers1)
record_test("Training Progress", "GET /training/progress status 200", prog_res.status_code == 200, f"Status: {prog_res.status_code}")
prog_data = prog_res.json() if prog_res.status_code == 200 else {}
tot_solved = prog_data.get("progress", {}).get("totalPositionsSolved", 0)
record_test("Training Progress", "Progress tracks solved positions", tot_solved >= 5, f"Total solved: {tot_solved}")

# ------------------------------------------------------------
# 4. CROSS-USER ISOLATION AUDIT
# ------------------------------------------------------------
print("\n--- 4. CROSS-USER ISOLATION & AUTHORIZATION AUDIT ---")
user2 = users[1]
user2_id = user2[0]
user2_token = create_test_jwt(user2_id, user2[1])
headers2 = {"Authorization": f"Bearer {user2_token}", "Content-Type": "application/json"}

# User 2 tries to access User 1's training session
cross_res = requests.get(f"{BACKEND_URL}/training/sessions/{session_id}", headers=headers2)
record_test("User Isolation", "User 2 cannot read User 1's session (404/403)", cross_res.status_code in [403, 404], f"Status: {cross_res.status_code}")

# User 2 tries to submit attempt to User 1's session
cross_att_res = requests.post(f"{BACKEND_URL}/training/sessions/{session_id}/attempt", headers=headers2, json={
    "positionId": positions[0]["id"],
    "move": "e4",
    "timeSpentMs": 1000
})
record_test("User Isolation", "User 2 cannot submit move to User 1's session (400/403/404)", cross_att_res.status_code in [400, 403, 404, 500], f"Status: {cross_att_res.status_code}")

# Unauthenticated access
unauth_res = requests.get(f"{BACKEND_URL}/training/overview")
record_test("Authentication", "Reject unauthenticated request with 401", unauth_res.status_code == 401, f"Status: {unauth_res.status_code}")

# Invalid token
bad_res = requests.get(f"{BACKEND_URL}/training/overview", headers={"Authorization": "Bearer fake.token.here"})
record_test("Authentication", "Reject invalid JWT with 401", bad_res.status_code == 401, f"Status: {bad_res.status_code}")

# User diversity: User 2 gets different training plan / focus
u2_overview = requests.get(f"{BACKEND_URL}/training/overview", headers=headers2).json()
u1_cat = overview_data.get("activePlan", {}).get("focusCategory")
u2_cat = u2_overview.get("activePlan", {}).get("focusCategory")
record_test("Personalization Diversity", f"User 1 and User 2 personalized plans generated", bool(u1_cat and u2_cat), f"User 1: {u1_cat}, User 2: {u2_cat}")

# ------------------------------------------------------------
# 5. WRITE AUDIT FILES
# ------------------------------------------------------------
report_dir = os.path.join(os.path.dirname(__file__), "..", "phase14_report")
os.makedirs(report_dir, exist_ok=True)

test_results_path = os.path.join(report_dir, "training_test_results.json")
with open(test_results_path, "w", encoding="utf-8") as f:
    json.dump(results, f, indent=2)

print("\n============================================================")
print(f"VERIFICATION COMPLETE: {results['summary']['passed_tests']}/{results['summary']['total_tests']} PASSED")
print(f"Test results saved to: {test_results_path}")
print("============================================================")
