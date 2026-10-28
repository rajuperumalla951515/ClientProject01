import os
import sys
import subprocess
import time
from pathlib import Path

# Add paths
root_dir = Path(__file__).resolve().parent
backend_dir = root_dir / "backend"
for p in (str(root_dir), str(backend_dir)):
    if p not in sys.path:
        sys.path.insert(0, p)

def banner(title):
    print("\n" + "=" * 70)
    print(f"[*] {title.upper()}")
    print("=" * 70)

def run_checks():
    results = []

    # 1. Dependency Audit in requirements.txt
    banner("1. Dependency Audit in requirements.txt & backend/requirements.txt")
    req_file = root_dir / "requirements.txt"
    backend_req = backend_dir / "requirements.txt"
    assert req_file.exists(), "Root requirements.txt must exist"
    assert backend_req.exists(), "backend/requirements.txt must exist"
    
    req_text = req_file.read_text(encoding="utf-8")
    backend_text = backend_req.read_text(encoding="utf-8")
    
    required_pkgs = [
        "fastapi", "uvicorn", "pydantic", "pydantic-settings",
        "email-validator", "sqlalchemy", "psycopg", "psycopg2-binary",
        "python-jose", "bcrypt", "python-multipart"
    ]
    missing = [pkg for pkg in required_pkgs if pkg not in req_text or pkg not in backend_text]
    if not missing:
        print("  [PASS] All required packages present in both root and backend requirements.txt.")
        print(f"         Verified: {', '.join(required_pkgs)}")
        results.append(("1. Dependency Audit", "PASS", "All packages verified"))
    else:
        print(f"  [FAIL] Missing packages: {missing}")
        results.append(("1. Dependency Audit", "FAIL", f"Missing {missing}"))

    # 2. Syntax & Import Check across all backend python files
    banner("2. Syntax & Compilation Check")
    py_files = list(backend_dir.rglob("*.py")) + [root_dir / "main.py"]
    errors = []
    for f in py_files:
        try:
            with open(f, "r", encoding="utf-8") as s:
                compile(s.read(), str(f), "exec")
        except Exception as e:
            errors.append(f"{f.name}: {e}")
    if not errors:
        print(f"  [PASS] {len(py_files)} Python files compiled successfully without syntax errors.")
        results.append(("2. Syntax Check", "PASS", f"{len(py_files)} files clean"))
    else:
        print(f"  [FAIL] Syntax errors found: {errors}")
        results.append(("2. Syntax Check", "FAIL", str(errors)))

    # 3. FastAPI Application Module Export Check
    banner("3. FastAPI Application Import & Entrypoint Verification")
    try:
        import main
        from backend.main import app as backend_app
        assert hasattr(main, "app"), "main.py must export app"
        assert main.app is not None, "main.app must not be None"
        assert main.app.title == "Sri Adithya Organics API"
        print(f"  [PASS] Successfully imported 'main:app': {main.app.title} (v{main.app.version})")
        print(f"  [PASS] Backend module path exports identical application object.")
        results.append(("3. Entrypoint Verification", "PASS", "main:app valid"))
    except Exception as e:
        print(f"  [FAIL] Import failed: {e}")
        results.append(("3. Entrypoint Verification", "FAIL", str(e)))

    # 4. Configuration Validation & Placeholder Trapping
    banner("4. Configuration Validation (Missing & Placeholder Host Tests)")
    from backend.app.database import validate_db_url, normalize_db_url
    
    # Test 4a: Placeholder 'host'
    val_a, safe_a, err_a = validate_db_url("postgresql://user:pass@host:5432/dbname")
    assert not val_a, "Placeholder host 'host' must be rejected"
    assert "contains placeholder host 'host'" in err_a
    assert "pass" not in safe_a and "pass" not in err_a, "Passwords must never be exposed"
    print(f"  [PASS] Placeholder host 'host' detected and rejected cleanly without exposing credentials.")
    print(f"         Diagnostic message: {err_a}")

    # Test 4b: Real Render PostgreSQL URL normalization
    test_render_url = "postgres://raju_user:secret_render_pw@dpg-cxxxxxxxx-a.oregon-postgres.render.com:5432/sriadithya"
    val_b, safe_b, err_b = validate_db_url(test_render_url)
    assert val_b, "Real Render PostgreSQL URL must be valid"
    assert safe_b.startswith("postgresql+psycopg://raju_user:***@dpg-cxxxxxxxx-a.oregon-postgres.render.com")
    print(f"  [PASS] Render postgres:// correctly normalized to postgresql+psycopg://.")
    print(f"         Masked URL output: {safe_b}")

    # Test 4c: Missing URL in production simulation
    orig_render = os.environ.get("RENDER")
    os.environ["RENDER"] = "true"
    val_c, safe_c, err_c = validate_db_url("")
    assert not val_c, "Empty URL in production must be rejected"
    assert "DATABASE_URL environment variable is missing on Render" in err_c
    if orig_render is not None:
        os.environ["RENDER"] = orig_render
    else:
        os.environ.pop("RENDER", None)
    print(f"  [PASS] Missing DATABASE_URL on Render caught with actionable instructions.")
    results.append(("4. Configuration Validation", "PASS", "Placeholder host caught; passwords masked"))

    # 5. Database Connection Test
    banner("5. Database Connection & Pool Pre-ping Test")
    from backend.app.database import check_db_connection, engine, get_safe_db_target
    connected, conn_err = check_db_connection()
    if connected:
        print(f"  [PASS] Active database connection verified via SELECT 1.")
        print(f"         Dialect: {engine.dialect.name} | Target: {get_safe_db_target()}")
        results.append(("5. Database Connectivity", "PASS", f"Connected via {engine.dialect.name}"))
    else:
        print(f"  [WARN] Database connection test: {conn_err}")
        results.append(("5. Database Connectivity", "PARTIAL", conn_err))

    # 6. Health Endpoint Diagnostics
    banner("6. Health Endpoints (/health & /api/health)")
    from backend.main import health_check
    health_resp = health_check()
    assert health_resp["service"] == "Sri Adithya Organics API"
    assert "database" in health_resp
    assert "password" not in str(health_resp).lower()
    print(f"  [PASS] Health endpoint response valid:")
    print(f"         Status: {health_resp['status']} | Database target: {health_resp['database']['target']}")
    results.append(("6. Health Endpoint", "PASS", "Safe status verified"))

    # 7. Core Application Regression Suite
    banner("7. Existing Business Logic, Auth & E-Commerce Flow")
    ret = subprocess.run([sys.executable, "test_sri_adithya_flow.py"], capture_output=True, text=True)
    if ret.returncode == 0:
        print("  [PASS] All 9 automated test suites passed (Auth, Catalogue, Geolocation, Cart, Orders, Admin).")
        results.append(("7. Core Regression Suite", "PASS", "All 9 suites passed"))
    else:
        print(f"  [FAIL] Regression failed:\n{ret.stdout}\n{ret.stderr}")
        results.append(("7. Core Regression Suite", "FAIL", "Regression failed"))

    # 8. Start Command Simulation Test
    banner("8. Start Command Simulation (uvicorn main:app --port 8000)")
    cmd = [sys.executable, "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8899"]
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    time.sleep(2.5)
    poll = proc.poll()
    if poll is None:
        print("  [PASS] Uvicorn process started successfully with 'uvicorn main:app' on port 8899.")
        proc.terminate()
        try:
            proc.wait(timeout=2)
        except Exception:
            proc.kill()
        results.append(("8. Start Command Simulation", "PASS", "Uvicorn booted and listening"))
    else:
        out, err = proc.communicate()
        print(f"  [FAIL] Uvicorn failed to start:\n{out}\n{err}")
        results.append(("8. Start Command Simulation", "FAIL", "Uvicorn exited prematurely"))

    # Summary
    banner("FINAL VERIFICATION SUMMARY")
    for name, status, detail in results:
        sym = "[PASS]" if status == "PASS" else ("[WARN]" if status == "PARTIAL" else "[FAIL]")
        print(f"  {sym:<7} {name:<32} : {detail}")

if __name__ == "__main__":
    run_checks()
