import sys
import os
import types
from pathlib import Path
from contextlib import asynccontextmanager

# Add both repo root and backend dir to sys.path
backend_dir = Path(__file__).resolve().parent
repo_root = backend_dir.parent

for p in (str(repo_root), str(backend_dir)):
    if p not in sys.path:
        sys.path.insert(0, p)

# Support running directly from inside backend directory without 'backend.' prefix
try:
    import backend.app.config
except (ImportError, ModuleNotFoundError):
    import app
    backend_pkg = types.ModuleType("backend")
    backend_pkg.app = app
    sys.modules["backend"] = backend_pkg
    sys.modules["backend.app"] = app

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.config import settings
from backend.app.database import engine, Base
from backend.app.routers import (
    auth, categories, products, cart, addresses, orders, wishlist, settings as settings_router, admin
)
from backend.app.seed import seed_database

# Create tables
Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure seed data exists
    try:
        seed_database()
    except Exception as e:
        print(f"Startup seed notice: {e}")
    yield
    # Shutdown

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Backend API for Sri Adithya Organics — Traditional Wood-Pressed Oils & Certified Organic Grocery Platform",
    lifespan=lifespan
)

# Enable CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router, prefix="/api")
app.include_router(categories.router, prefix="/api")
app.include_router(products.router, prefix="/api")
app.include_router(cart.router, prefix="/api")
app.include_router(addresses.router, prefix="/api")
app.include_router(orders.router, prefix="/api")
app.include_router(wishlist.router, prefix="/api")
app.include_router(settings_router.router, prefix="/api")
app.include_router(admin.router, prefix="/api")

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "Sri Adithya Organics API",
        "version": settings.VERSION
    }
