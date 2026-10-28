import os
from typing import Tuple, Optional
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url, URL
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from fastapi import HTTPException, status
from backend.app.config import settings

# Placeholder hostnames commonly used in tutorials or sample configs
PLACEHOLDER_HOSTS = {
    "host",
    "<host>",
    "your_host",
    "your-host",
    "your_database_host",
    "database_host",
    "db_host",
    "example.com",
    "placeholder",
    "my_host"
}

def is_placeholder_host(host: Optional[str]) -> bool:
    """Check if a hostname is an unconfigured placeholder or invalid template."""
    if host is None:
        return False  # SQLite has no host
    h = str(host).lower().strip()
    if not h:
        return True
    if ".." in h:  # catches literal dpg-...-a, ellipses, etc.
        return True
    if any(c in h for c in "<>[]{}"):  # catches <host>, [host], etc.
        return True
    if h in PLACEHOLDER_HOSTS:
        return True
    return False

def resolve_raw_db_url() -> str:
    """Read database connection URL from environment variables safely, prioritizing non-placeholder URLs."""
    # Check all possible Render / standard database environment variables
    candidates = [
        ("INTERNAL_DATABASE_URL", os.getenv("INTERNAL_DATABASE_URL", "").strip()),
        ("DATABASE_URL", os.getenv("DATABASE_URL", "").strip()),
        ("EXTERNAL_DATABASE_URL", os.getenv("EXTERNAL_DATABASE_URL", "").strip()),
    ]

    # First pass: prefer any candidate that is set and does NOT contain a dummy placeholder host
    for var_name, val in candidates:
        if val:
            try:
                norm = normalize_db_url(val)
                parsed = make_url(norm)
                if parsed.host and not is_placeholder_host(parsed.host):
                    return val
            except Exception:
                pass

    # Check separate PG* variables
    pghost = os.getenv("PGHOST", "").strip()
    if pghost and not is_placeholder_host(pghost):
        try:
            return str(URL.create(
                drivername="postgresql+psycopg",
                username=os.getenv("PGUSER"),
                password=os.getenv("PGPASSWORD"),
                host=pghost,
                port=int(os.getenv("PGPORT", 5432)),
                database=os.getenv("PGDATABASE"),
            ))
        except Exception:
            pass

    # Return the first configured value (so validate_db_url can produce clear diagnostics)
    for var_name, val in candidates:
        if val:
            return val

    # In local development only, fallback to local SQLite database
    if not settings.IS_PRODUCTION:
        return "sqlite:///./sri_adithya.db"

    return ""

def normalize_db_url(raw_url: str) -> str:
    """
    Ensure postgresql+psycopg:// dialect prefix for SQLAlchemy 2.0 with Psycopg 3.
    Render supplies postgres://, which is converted to postgresql+psycopg://.
    """
    if not raw_url:
        return ""
    clean = raw_url.strip()
    if clean.startswith("postgres://"):
        return clean.replace("postgres://", "postgresql+psycopg://", 1)
    if clean.startswith("postgresql://") and not clean.startswith("postgresql+"):
        return clean.replace("postgresql://", "postgresql+psycopg://", 1)
    return clean

def validate_db_url(url_str: str) -> Tuple[bool, str, Optional[str]]:
    """
    Validate the database URL structure and ensure no placeholder hosts are used.
    Returns: (is_valid: bool, safe_masked_string: str, error_reason: Optional[str])
    """
    if not url_str:
        if settings.IS_PRODUCTION:
            return False, "", (
                "DATABASE_URL environment variable is missing on Render. "
                "In Render Dashboard, go to your Web Service -> Environment -> add 'DATABASE_URL' "
                "with your Render PostgreSQL Internal Connection String."
            )
        return False, "", "Database URL is not configured."

    norm_url = normalize_db_url(url_str)
    try:
        parsed = make_url(norm_url)
    except Exception as exc:
        return False, "", f"Malformed database connection string: {exc}"

    safe_url = parsed.render_as_string(hide_password=True)

    # 1. Check for dummy placeholder hostnames (e.g., 'host', 'dpg-...-a')
    if is_placeholder_host(parsed.host):
        return False, safe_url, (
            f"DATABASE_URL contains placeholder host '{parsed.host}'. "
            "Render cloud containers cannot resolve this dummy hostname. "
            "In Render Dashboard, go to your PostgreSQL database -> copy 'Internal Database URL' "
            "-> update DATABASE_URL in your Web Service Environment."
        )

    # 2. In production, prevent localhost / 127.0.0.1
    if settings.IS_PRODUCTION and parsed.host and parsed.host.lower() in ("localhost", "127.0.0.1"):
        return False, safe_url, (
            f"DATABASE_URL points to '{parsed.host}', which is not reachable inside a Render cloud container. "
            "Please configure your Render PostgreSQL Internal Connection String."
        )

    # 3. In production, prevent accidental SQLite use unless explicitly permitted
    if settings.IS_PRODUCTION and parsed.drivername.startswith("sqlite"):
        allow_sqlite = os.getenv("ALLOW_SQLITE_IN_PRODUCTION", "").lower() in ("true", "1")
        if not allow_sqlite:
            return False, safe_url, (
                "SQLite database cannot be used in production on Render because Render containers use ephemeral filesystems. "
                "Please provision and link a PostgreSQL database in the Render Dashboard."
            )

    return True, safe_url, None

# Resolve and validate configuration on module import (without attempting network connections)
raw_url = resolve_raw_db_url()
is_db_configured, safe_db_url, db_config_error = validate_db_url(raw_url)

# Engine creation:
# If valid, create engine bound to real database URL.
# If invalid (e.g. placeholder 'host' on Render), create inert in-memory engine so that
# SQLAlchemy models, Pydantic schemas, and FastAPI routers can import cleanly without crashing.
connect_args = {}
if is_db_configured:
    final_db_url = normalize_db_url(raw_url)
    if final_db_url.startswith("sqlite"):
        connect_args["check_same_thread"] = False
    engine = create_engine(
        final_db_url,
        connect_args=connect_args,
        pool_pre_ping=True
    )
else:
    final_db_url = "sqlite:///:memory:"
    connect_args["check_same_thread"] = False
    engine = create_engine(final_db_url, connect_args=connect_args)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def check_db_connection() -> Tuple[bool, Optional[str]]:
    """Test active database connectivity with a lightweight SELECT 1 query."""
    if not is_db_configured:
        return False, db_config_error
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True, None
    except Exception as exc:
        # Never leak credentials in connection error messages
        err_msg = str(exc)
        return False, f"Connection failed: {err_msg[:250]}"

def get_safe_db_target() -> str:
    """Return host:port/database without exposing username or password."""
    if not is_db_configured:
        return "unconfigured"
    try:
        parsed = make_url(normalize_db_url(raw_url))
        host = parsed.host or "local"
        port = f":{parsed.port}" if parsed.port else ""
        db = f"/{parsed.database}" if parsed.database else ""
        return f"{host}{port}{db}"
    except Exception:
        return "unknown"

def get_db():
    """FastAPI database session dependency with automatic transaction safety."""
    if not is_db_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database is unavailable: {db_config_error}"
        )
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
