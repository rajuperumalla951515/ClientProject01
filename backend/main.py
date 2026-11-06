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

from fastapi import FastAPI, Response, Request, Depends, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from backend.app.config import settings
from backend.app.d1 import D1Database, get_d1
from backend.app.routers import (
    auth, categories, products, cart, addresses, orders, wishlist, settings as settings_router, admin
)
from backend.app.events import router as events_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup Phase
    print("=" * 70)
    print(f"[STARTUP] Starting {settings.PROJECT_NAME} (v{settings.VERSION})")
    print(f"[DATABASE] Database Engine: Cloudflare D1 Serverless Edge SQL")
    print(f"[ENV] Runtime Mode: {'Production (Cloudflare Workers)' if settings.IS_PRODUCTION else 'Development'}")
    print("=" * 70)

    yield

    # Shutdown Phase
    print(f"[SHUTDOWN] Shutting down {settings.PROJECT_NAME}")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Backend API for Sri Adithya Organics — Traditional Wood-Pressed Oils & Certified Organic Grocery Platform powered by Cloudflare D1",
    lifespan=lifespan
)

# Allowed CORS origins for development, preview and production
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5175",
    "http://localhost:3000",
    "http://localhost:4173",
    "https://sriadithyaorganics.pages.dev",
    "https://adminsriadithyaorganics.pages.dev",
    "https://sriadithyaorganics.vercel.app",
    "https://adminsriadithyaorganics.vercel.app",
    "https://sriadithyaorganics.com",
    "https://www.sriadithyaorganics.com",
    "https://admin.sriadithyaorganics.com",
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

# Enable CORS for web, mobile and edge clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"^https?:\/\/(localhost|127\.0\.0\.1|.*\.pages\.dev|.*\.workers\.dev|.*\.onrender\.com|.*\.vercel\.app|sriadithyaorganics\.com|.*\.sriadithyaorganics\.com)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
        "database": "Cloudflare D1",
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
app.include_router(events_router, prefix="/api")

# Liveness Check (Confirms Worker runtime is responding)
@app.get("/health/live", tags=["Health"])
def liveness():
    return {
        "status": "alive",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION
    }

# Readiness Check (Tests active Cloudflare D1 edge database connectivity)
@app.get("/health/ready", tags=["Health"])
async def readiness(d1: D1Database = Depends(get_d1)):
    try:
        prod_count = await d1.fetch_one("SELECT count(*) as c FROM products WHERE is_active = 1")
        cat_count = await d1.fetch_one("SELECT count(*) as c FROM categories WHERE is_active = 1")
        return {
            "status": "ready",
            "service": settings.PROJECT_NAME,
            "database": {
                "connected": True,
                "type": "Cloudflare D1",
                "products_count": prod_count["c"] if prod_count else 0,
                "categories_count": cat_count["c"] if cat_count else 0
            }
        }
    except Exception as exc:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "not_ready",
                "service": settings.PROJECT_NAME,
                "database": {
                    "connected": False,
                    "type": "Cloudflare D1",
                    "error": str(exc)
                }
            }
        )

# Health Check (Reports Cloudflare D1 connectivity status)
@app.get("/health", tags=["Health"])
@app.get("/api/health", tags=["Health"])
async def health_check(d1: D1Database = Depends(get_d1)):
    try:
        prod_count = await d1.fetch_one("SELECT count(*) as c FROM products WHERE is_active = 1")
        cat_count = await d1.fetch_one("SELECT count(*) as c FROM categories WHERE is_active = 1")
        return {
            "status": "healthy",
            "service": settings.PROJECT_NAME,
            "version": settings.VERSION,
            "database": {
                "connected": True,
                "type": "Cloudflare D1",
                "products_count": prod_count["c"] if prod_count else 0,
                "categories_count": cat_count["c"] if cat_count else 0
            }
        }
    except Exception as exc:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE if settings.IS_PRODUCTION else status.HTTP_200_OK,
            content={
                "status": "unhealthy" if settings.IS_PRODUCTION else "degraded",
                "service": settings.PROJECT_NAME,
                "version": settings.VERSION,
                "database": {
                    "connected": False,
                    "type": "Cloudflare D1",
                    "error": str(exc)
                }
            }
        )

# Database Initialization & Seed Endpoint
@app.get("/api/init-db", tags=["Admin"])
@app.post("/api/init-db", tags=["Admin"])
@app.get("/api/seed", tags=["Admin"])
@app.post("/api/seed", tags=["Admin"])
async def initialize_and_seed_db(d1: D1Database = Depends(get_d1)):
    from backend.app.d1_migrations import SCHEMA_STATEMENTS, SEED_STATEMENTS
    try:
        await d1.exec_statements(SCHEMA_STATEMENTS)
        await d1.exec_statements(SEED_STATEMENTS)
        prod_count = await d1.fetch_one("SELECT count(*) as c FROM products")
        cat_count = await d1.fetch_one("SELECT count(*) as c FROM categories")
        p_num = prod_count["c"] if prod_count else 0
        c_num = cat_count["c"] if cat_count else 0
        return {
            "status": "success",
            "database": "Cloudflare D1",
            "products_count": p_num,
            "categories_count": c_num,
            "message": f"Successfully verified/initialized {p_num} products across {c_num} organic categories in Cloudflare D1."
        }
    except Exception as exc:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "status": "error",
                "database": "Cloudflare D1",
                "detail": str(exc)
            }
        )
