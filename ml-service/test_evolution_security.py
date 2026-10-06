import requests

BASE_URL = "http://localhost:5000/api/v1/evolution"

def test_evolution_security():
    print("=== PHASE 15 EVOLUTION SECURITY AUDIT ===")
    
    endpoints = [
        ("GET /overview", "GET", f"{BASE_URL}", None),
        ("GET /timeline", "GET", f"{BASE_URL}/timeline", None),
        ("GET /gameplay", "GET", f"{BASE_URL}/gameplay", None),
        ("GET /weaknesses", "GET", f"{BASE_URL}/weaknesses", None),
        ("GET /model-update-status", "GET", f"{BASE_URL}/model-update-status", None),
        ("POST /snapshots/generate", "POST", f"{BASE_URL}/snapshots/generate", None),
        ("GET /snapshots", "GET", f"{BASE_URL}/snapshots", None),
        ("Fake Bearer Token", "GET", f"{BASE_URL}", "Bearer FAKE_TOKEN_12345"),
    ]
    
    all_passed = True
    for name, method, url, auth_header in endpoints:
        headers = {}
        if auth_header:
            headers["Authorization"] = auth_header
        
        try:
            if method == "GET":
                resp = requests.get(url, headers=headers, timeout=5)
            else:
                resp = requests.post(url, headers=headers, json={}, timeout=5)
            
            passed = resp.status_code == 401
            status = "PASS" if passed else "FAIL"
            print(f"[{status}] {name}: got {resp.status_code} (expected 401)")
            if not passed:
                all_passed = False
        except Exception as e:
            print(f"[FAIL] {name}: exception {e}")
            all_passed = False
            
    assert all_passed, "Evolution security audit failed"
    print("\nALL EVOLUTION SECURITY INVARIANTS: PASS")

if __name__ == "__main__":
    test_evolution_security()
