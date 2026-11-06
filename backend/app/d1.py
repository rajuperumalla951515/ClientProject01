"""
Sri Adithya Organics — Cloudflare D1 Native Database Access Layer
Supports native Cloudflare Python Workers D1 binding (self.env.DB)
and local SQLite fallback for isolated unit testing.
"""
import os
import sqlite3
from typing import Any, Dict, List, Optional
from pathlib import Path
from fastapi import Request

class D1Database:
    """
    Asynchronous data-access client for Cloudflare D1.
    Wraps Cloudflare's native D1 binding (prepare -> bind -> all/first/run)
    with seamless local SQLite execution support.
    """
    def __init__(self, binding: Any = None, local_db_path: str = "sri_adithya_d1.db"):
        self.binding = binding
        self.local_db_path = local_db_path
        self._local_conn: Optional[sqlite3.Connection] = None
        
        # If binding is not provided (local dev/testing), initialize local sqlite3
        if self.binding is None:
            self._init_local_db()

    def _init_local_db(self):
        """Initialize local SQLite database with migrations if not existing."""
        is_memory = self.local_db_path == ":memory:"
        db_file = Path(self.local_db_path)
        needs_migration = is_memory or not db_file.exists()
        
        conn = sqlite3.connect(self.local_db_path, timeout=5, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        self._local_conn = conn
        
        if needs_migration:
            schema_file = Path("migrations/d1/0001_initial_schema.sql")
            seed_file = Path("migrations/d1/0002_seed_data.sql")
            if schema_file.exists():
                conn.executescript(schema_file.read_text(encoding="utf-8"))
            if seed_file.exists():
                conn.executescript(seed_file.read_text(encoding="utf-8"))
            conn.commit()

    @property
    def is_d1(self) -> bool:
        """Returns True if running against real Cloudflare D1 binding."""
        return self.binding is not None

    async def fetch_all(self, query: str, *params) -> List[Dict[str, Any]]:
        """Execute a parameterized query returning all matching rows as dictionaries."""
        if self.is_d1:
            stmt = self.binding.prepare(query)
            if params:
                stmt = stmt.bind(*params)
            res = await stmt.all()
            if hasattr(res, "results"):
                return [dict(r) for r in res.results]
            return [dict(r) for r in res] if res else []
        else:
            cur = self._local_conn.cursor()
            cur.execute(query, params)
            rows = cur.fetchall()
            return [dict(r) for r in rows]

    async def fetch_one(self, query: str, *params) -> Optional[Dict[str, Any]]:
        """Execute a parameterized query returning the first matching row or None."""
        if self.is_d1:
            stmt = self.binding.prepare(query)
            if params:
                stmt = stmt.bind(*params)
            res = await stmt.first()
            return dict(res) if res is not None else None
        else:
            cur = self._local_conn.cursor()
            cur.execute(query, params)
            row = cur.fetchone()
            return dict(row) if row is not None else None

    async def execute(self, query: str, *params) -> Any:
        """Execute a write statement (INSERT, UPDATE, DELETE)."""
        if self.is_d1:
            stmt = self.binding.prepare(query)
            if params:
                stmt = stmt.bind(*params)
            return await stmt.run()
        else:
            cur = self._local_conn.cursor()
            cur.execute(query, params)
            self._local_conn.commit()
            return cur

    async def execute_insert(self, query: str, *params) -> int:
        """Execute an INSERT statement and return the generated row ID."""
        if self.is_d1:
            stmt = self.binding.prepare(query)
            if params:
                stmt = stmt.bind(*params)
            res = await stmt.run()
            # D1 meta provides last_row_id or last_insert_rowid
            if hasattr(res, "meta") and hasattr(res.meta, "last_row_id"):
                return res.meta.last_row_id
            # Fallback: query last_insert_rowid()
            last_id_stmt = self.binding.prepare("SELECT last_insert_rowid() as id")
            row = await last_id_stmt.first()
            return dict(row)["id"] if row else 0
        else:
            cur = self._local_conn.cursor()
            cur.execute(query, params)
            self._local_conn.commit()
            return cur.lastrowid

    async def batch(self, statements: List[tuple]) -> List[Any]:
        """Execute multiple parameterized statements atomically."""
        if self.is_d1:
            prepared_list = []
            for item in statements:
                if isinstance(item, tuple):
                    q, p = item
                    stmt = self.binding.prepare(q).bind(*p)
                else:
                    stmt = self.binding.prepare(item)
                prepared_list.append(stmt)
            return await self.binding.batch(prepared_list)
        else:
            cur = self._local_conn.cursor()
            results = []
            try:
                for item in statements:
                    if isinstance(item, tuple):
                        q, p = item
                        cur.execute(q, p)
                    else:
                        cur.execute(item)
                    results.append(cur)
                self._local_conn.commit()
                return results
            except Exception:
                self._local_conn.rollback()
                raise


# Global fallback instance for local testing
_global_local_d1: Optional[D1Database] = None

def get_local_d1() -> D1Database:
    global _global_local_d1
    if _global_local_d1 is None:
        _global_local_d1 = D1Database(binding=None, local_db_path="sri_adithya_d1.db")
    return _global_local_d1

async def get_d1(request: Request) -> D1Database:
    """FastAPI dependency injecting the active D1 database client."""
    # 1. Check if request state has D1 attached from entrypoint fetch()
    if hasattr(request.state, "d1") and request.state.d1 is not None:
        return request.state.d1
    # 2. Check if app.state has D1 attached
    if hasattr(request.app.state, "d1") and request.app.state.d1 is not None:
        return request.app.state.d1
    # 3. Fallback to local D1 client
    return get_local_d1()
