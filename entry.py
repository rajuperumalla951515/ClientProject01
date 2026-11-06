"""
Cloudflare Python Worker entrypoint for Sri Adithya Organics FastAPI backend.
Leverages the official Cloudflare Workers ASGI adapter (`workers.asgi`).
"""
import sys
import os
from pathlib import Path

# Ensure root, backend, and vendored packages are correctly ordered in sys.path
root_dir = Path(__file__).resolve().parent
backend_dir = root_dir / "backend"
modules_dir = root_dir / "python_modules"

if sys.platform == "emscripten" and modules_dir.exists():
    if str(modules_dir) not in sys.path:
        sys.path.insert(0, str(modules_dir))

for p in (str(root_dir), str(backend_dir)):
    if p not in sys.path:
        sys.path.insert(0, p)

from backend.main import app

# Official Cloudflare Workers ASGI entrypoint integration
try:
    from workers import asgi
    Default = asgi.entrypoint(app)
except (ImportError, ModuleNotFoundError):
    # Preserves backwards-compatibility for local Uvicorn / Pytest execution
    Default = app


