import sys
import os
import types
from typing import Optional
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

from fastapi import FastAPI, Response, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import SQLAlchemyError, OperationalError
from backend.app.config import settings
from backend.app.database import (
    engine, Base, is_db_configured, db_config_error, safe_db_url,
    check_db_connection, get_safe_db_target
)
from backend.app.routers import (
    auth, categories, products, cart, addresses, orders, wishlist, settings as settings_router, admin
)
from backend.app.seed import seed_database

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup Phase
    print("=" * 70)
    print(f"🌿 Starting {settings.PROJECT_NAME} (v{settings.VERSION})")
    print(f"📍 Runtime Mode: {'Production (Render Cloud)' if settings.IS_PRODUCTION else 'Development'}")

    if not is_db_configured:
        print("=" * 70)
        print("⚠️  DATABASE CONFIGURATION NOTICE:")
        print(f"   {db_config_error}")
        print("   TO RESOLVE IN RENDER DASHBOARD:")
        print("   1. Open Render Dashboard -> Go to your PostgreSQL database.")
        print("   2. Under 'Connections', copy the 'Internal Database URL'.")
        print("   3. Go to your Web Service -> 'Environment'.")
        print("   4. Set 'DATABASE_URL' = <copied Internal Database URL>.")
        print("   5. Click 'Save Changes' to deploy with live database connectivity.")
        print("=" * 70)
        app.state.db_connected = False
        app.state.db_error = db_config_error
    else:
        print(f"🔗 Target Database: {safe_db_url}")
        connected, conn_err = check_db_connection()
        if connected:
            print("✅ Database connection verified successfully.")
            app.state.db_connected = True
            app.state.db_error = None
            # Initialize schema and seed data safely
            try:
                Base.metadata.create_all(bind=engine)
                seed_database()
                print("✅ Database tables and seed catalogue synchronized.")
            except Exception as exc:
                print(f"⚠️  Database table/seed notice: {exc}")
        else:
            print("=" * 70)
            print(f"⚠️  DATABASE CONNECTION WARNING: {conn_err}")
            print("   The server will start so health endpoints can report status.")
            print("   Please verify your DATABASE_URL in the Render Dashboard.")
            print("=" * 70)
            app.state.db_connected = False
            app.state.db_error = conn_err

    yield

    # Shutdown Phase
    print(f"🛑 Shutting down {settings.PROJECT_NAME}")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Backend API for Sri Adithya Organics — Traditional Wood-Pressed Oils & Certified Organic Grocery Platform",
    lifespan=lifespan
)

# Allowed CORS origins for development and production
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://localhost:4173",
    "https://sriadithyaorganics.vercel.app",
]
frontend_url = os.getenv("FRONTEND_URL", "").strip()
if frontend_url:
    for o in frontend_url.split(","):
        if o.strip() and o.strip() not in ALLOWED_ORIGINS:
            ALLOWED_ORIGINS.append(o.strip())
cors_origins = os.getenv("CORS_ORIGINS", "").strip()
if cors_origins:
    for o in cors_origins.split(","):
        if o.strip() and o.strip() not in ALLOWED_ORIGINS:
            ALLOWED_ORIGINS.append(o.strip())

# Enable CORS for web and mobile clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"^https?:\/\/(localhost|127\.0\.0\.1|.*\.onrender\.com|.*\.vercel\.app|.*\.netlify\.app)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global database exception handler (attaches proper CORS headers and HTTP 503 status)
@app.exception_handler(OperationalError)
@app.exception_handler(SQLAlchemyError)
async def db_exception_handler(request: Request, exc: Exception):
    print(f"⚠️ Database error on {request.method} {request.url.path}: {exc}")
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={
            "detail": "Database connection error. In Render Dashboard, please set DATABASE_URL to your real Render PostgreSQL Internal Connection String (copy from Render PostgreSQL -> Connections -> Internal Database URL).",
            "error_type": exc.__class__.__name__
        }
    )

# Global catch-all handler for unhandled errors
@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    print(f"⚠️ Unhandled error on {request.method} {request.url.path}: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": f"Server processing error: {str(exc)[:200]}"}
    )

# Root Endpoint
@app.get("/", tags=["Root"])
def root():
    return {
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "online",
        "description": "Backend API for Sri Adithya Organics — Traditional Wood-Pressed Oils & Certified Organic Grocery Platform",
        "endpoints": {
            "docs": "/docs",
            "openapi": "/openapi.json",
            "health_summary": "/health",
            "liveness": "/health/live",
            "readiness": "/health/ready",
            "products": "/api/products",
            "categories": "/api/categories"
        }
    }

# Register Core API Routers
app.include_router(auth.router, prefix="/api")
app.include_router(categories.router, prefix="/api")
app.include_router(products.router, prefix="/api")
app.include_router(cart.router, prefix="/api")
app.include_router(addresses.router, prefix="/api")
app.include_router(orders.router, prefix="/api")
app.include_router(wishlist.router, prefix="/api")
app.include_router(settings_router.router, prefix="/api")
app.include_router(admin.router, prefix="/api")

# Liveness Check (Confirms FastAPI process is alive)
@app.get("/health/live", tags=["Health"])
def liveness():
    return {
        "status": "alive",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION
    }

# Readiness Check (Tests active database connection)
@app.get("/health/ready", tags=["Health"])
def readiness(response: Response):
    connected, conn_err = check_db_connection()
    if not connected:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {
            "status": "not_ready",
            "service": settings.PROJECT_NAME,
            "database": {
                "connected": False,
                "target": get_safe_db_target(),
                "error": conn_err or "Database connection failed",
                "hint": "Set DATABASE_URL to your Render PostgreSQL Internal Connection String in Render Dashboard"
            }
        }
    return {
        "status": "ready",
        "service": settings.PROJECT_NAME,
        "database": {
            "connected": True,
            "target": get_safe_db_target()
        }
    }

@app.get("/health", tags=["Health"])
@app.get("/api/health", tags=["Health"])
def health_check(response: Response = None):
    # If app.state.db_connected was evaluated during lifespan, use it; otherwise test live
    if hasattr(app.state, "db_connected"):
        is_connected = app.state.db_connected
        error_msg = getattr(app.state, "db_error", None)
    else:
        is_connected, error_msg = check_db_connection()

    db_info = {
        "connected": is_connected,
        "target": get_safe_db_target()
    }
    
    if not is_connected:
        db_info["error"] = error_msg or "Database connection unverified"
        db_info["hint"] = "Set DATABASE_URL to your Render PostgreSQL Internal Connection String in Render Dashboard"
        # Distinguish application health from database connectivity
        if response:
            response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE if settings.IS_PRODUCTION else status.HTTP_200_OK
        return {
            "status": "unhealthy" if settings.IS_PRODUCTION else "degraded",
            "service": settings.PROJECT_NAME,
            "version": settings.VERSION,
            "database": db_info
        }

    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "database": db_info
    }

@app.get("/api/seed", tags=["Admin"])
@app.post("/api/seed", tags=["Admin"])
def force_seed():
    """Explicit endpoint to seed or verify Sri Adithya Organics catalogue."""
    from backend.app.seed import seed_database
    from backend.app.database import SessionLocal
    from backend.app.models import Product, Category
    seed_database()
    db = SessionLocal()
    try:
        p_count = db.query(Product).count()
        c_count = db.query(Category).count()
        return {
            "status": "seeded",
            "products_count": p_count,
            "categories_count": c_count,
            "message": f"Successfully verified {p_count} products across {c_count} organic categories."
        }
    finally:
        db.close()
