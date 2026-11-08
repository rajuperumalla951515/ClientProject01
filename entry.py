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
from backend.app.d1 import D1Database

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
                
                # 2. Attach Cloudflare D1 database binding to FastAPI application state
                if hasattr(self.env, "DB") and self.env.DB is not None:
                    app.state.d1 = D1Database(binding=self.env.DB)
                    if not getattr(app.state, "_d1_initialized", False):
                        try:
                            check_row = await app.state.d1.fetch_one("SELECT count(*) as c FROM products")
                            if check_row and check_row.get("c", 0) > 0:
                                app.state._d1_initialized = True
                            else:
                                raise Exception("Empty products table")
                        except Exception:
                            try:
                                from backend.app.d1_migrations import SCHEMA_STATEMENTS, SEED_STATEMENTS
                                await app.state.d1.exec_statements(SCHEMA_STATEMENTS)
                                await app.state.d1.exec_statements(SEED_STATEMENTS)
                                app.state._d1_initialized = True
                                print("[D1] Auto-initialized and seeded D1 schema and catalogue successfully.")
                            except Exception as e:
                                print(f"[D1] Auto-initialization notice: {e}")

                # 3. Attach Cloudflare Workers AI binding if present
                if hasattr(self.env, "AI") and self.env.AI is not None:
                    app.state.ai = self.env.AI
            
            if (request.headers.get("upgrade") or "").lower() == "websocket":
                return await asgi.websocket(app, request, self.env)
            return await asgi.fetch(app, request, self.env, self.ctx)
            
except (ImportError, ModuleNotFoundError):
    # Preserves backwards-compatibility for local Uvicorn / Pytest execution
    Default = app


