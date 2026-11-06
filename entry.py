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

# Official Cloudflare Workers ASGI entrypoint integration with env-variable synchronization
try:
    from workers import WorkerEntrypoint, asgi
    
    class Default(WorkerEntrypoint):
        async def fetch(self, request):
            # 1. Sync Cloudflare Worker environment variables/secrets to os.environ
            if hasattr(self, "env") and self.env:
                try:
                    import js
                    for key in js.Object.keys(self.env):
                        val = getattr(self.env, str(key), None)
                        if val is not None and isinstance(val, (str, int, float, bool)):
                            os.environ[str(key)] = str(val)
                except Exception:
                    pass
                
                # 2. Bridge Cloudflare Hyperdrive accelerated PostgreSQL edge connection
                if hasattr(self.env, "HYPERDRIVE"):
                    try:
                        hd = self.env.HYPERDRIVE
                        conn_str = getattr(hd, "connectionString", getattr(hd, "connection_string", None))
                        if conn_str:
                            raw_str = str(conn_str)
                            if "pg8000" not in raw_str:
                                raw_str = raw_str.replace("postgresql://", "postgresql+pg8000://").replace("postgres://", "postgresql+pg8000://")
                            os.environ["DATABASE_URL"] = raw_str
                            os.environ["HYPERDRIVE"] = "1"
                    except Exception:
                        pass
            
            if (request.headers.get("upgrade") or "").lower() == "websocket":
                return await asgi.websocket(app, request, self.env)
            return await asgi.fetch(app, request, self.env, self.ctx)
            
except (ImportError, ModuleNotFoundError):
    # Preserves backwards-compatibility for local Uvicorn / Pytest execution
    Default = app


