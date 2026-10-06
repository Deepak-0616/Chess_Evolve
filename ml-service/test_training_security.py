import requests

BASE_URL = "http://localhost:5000/api/v1/training"

def test_security():
    print("=== TRAINING SECURITY AUDIT ===")
    
    # 1. Unauthenticated GET /overview
    r1 = requests.get(f"{BASE_URL}/overview")
    print(f"1. Unauthenticated GET /overview: {r1.status_code} (Expected 401)")
    assert r1.status_code == 401, f"Expected 401, got {r1.status_code}"
    
    # 2. Unauthenticated POST /sessions
    r2 = requests.post(f"{BASE_URL}/sessions", json={"category": "TACTICAL"})
    print(f"2. Unauthenticated POST /sessions: {r2.status_code} (Expected 401)")
    assert r2.status_code == 401, f"Expected 401, got {r2.status_code}"
    
    # 3. Invalid / Fake Bearer Token
    fake_headers = {"Authorization": "Bearer fake.jwt.token"}
    r3 = requests.get(f"{BASE_URL}/overview", headers=fake_headers)
    print(f"3. Fake Bearer Token GET /overview: {r3.status_code} (Expected 401)")
    assert r3.status_code == 401, f"Expected 401, got {r3.status_code}"
    
    # 4. Unauthenticated GET /progress
    r4 = requests.get(f"{BASE_URL}/progress")
    print(f"4. Unauthenticated GET /progress: {r4.status_code} (Expected 401)")
    assert r4.status_code == 401, f"Expected 401, got {r4.status_code}"
    
    # 5. Unauthenticated GET /weaknesses
    r5 = requests.get(f"{BASE_URL}/weaknesses")
    print(f"5. Unauthenticated GET /weaknesses: {r5.status_code} (Expected 401)")
    assert r5.status_code == 401, f"Expected 401, got {r5.status_code}"
    
    # 6. Unauthenticated POST /sessions/fake_id/attempt
    r6 = requests.post(f"{BASE_URL}/sessions/fake_id/attempt", json={"positionId": "fake_p", "move": "e4"})
    print(f"6. Unauthenticated POST /attempt: {r6.status_code} (Expected 401)")
    assert r6.status_code == 401, f"Expected 401, got {r6.status_code}"
    
    print("\nALL TRAINING SECURITY INVARIANTS: PASS")

if __name__ == "__main__":
    test_security()
