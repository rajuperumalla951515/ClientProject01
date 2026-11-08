"""
Sri Adithya Organics — AI System D1 Schema & Migrations
Defines self-healing D1 database tables for multi-model AI routing, usage logging,
content studio drafts, promotion intelligence, action approvals, and audit trails.
"""
from typing import List

AI_SCHEMA_STATEMENTS: List[str] = [
    """CREATE TABLE IF NOT EXISTS ai_provider_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider_name TEXT UNIQUE NOT NULL,
    model_name TEXT NOT NULL,
    is_enabled INTEGER DEFAULT 1,
    priority INTEGER DEFAULT 1,
    daily_request_limit INTEGER DEFAULT 1000,
    daily_token_limit INTEGER DEFAULT 200000,
    requests_today INTEGER DEFAULT 0,
    tokens_today INTEGER DEFAULT 0,
    consecutive_errors INTEGER DEFAULT 0,
    cooldown_until TEXT,
    last_success_at TEXT,
    last_error_at TEXT,
    last_error_message TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
);""",
    "CREATE INDEX IF NOT EXISTS idx_ai_provider_name ON ai_provider_config(provider_name);",
    "CREATE INDEX IF NOT EXISTS idx_ai_provider_priority ON ai_provider_config(priority);",
    """CREATE TABLE IF NOT EXISTS ai_usage_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    task_type TEXT NOT NULL,
    tokens_prompt INTEGER DEFAULT 0,
    tokens_completion INTEGER DEFAULT 0,
    latency_ms INTEGER DEFAULT 0,
    status TEXT NOT NULL,
    error_message TEXT,
    admin_id INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
);""",
    "CREATE INDEX IF NOT EXISTS idx_ai_usage_provider ON ai_usage_logs(provider);",
    "CREATE INDEX IF NOT EXISTS idx_ai_usage_created ON ai_usage_logs(created_at);",
    """CREATE TABLE IF NOT EXISTS ai_generated_content (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER,
    task_type TEXT NOT NULL,
    prompt_hash TEXT,
    generated_content_json TEXT NOT NULL,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    status TEXT DEFAULT 'draft',
    created_by INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
);""",
    "CREATE INDEX IF NOT EXISTS idx_ai_content_prod ON ai_generated_content(product_id);",
    "CREATE INDEX IF NOT EXISTS idx_ai_content_task ON ai_generated_content(task_type);",
    """CREATE TABLE IF NOT EXISTS ai_promotions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    promo_type TEXT NOT NULL,
    product_id INTEGER,
    category_id INTEGER,
    target_pincode TEXT,
    original_price REAL,
    discounted_price REAL,
    calculated_margin REAL,
    min_order_value REAL DEFAULT 0.0,
    reasoning TEXT,
    suggested_code TEXT,
    status TEXT DEFAULT 'draft',
    start_date TEXT,
    end_date TEXT,
    created_by INTEGER,
    approved_by INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);""",
    "CREATE INDEX IF NOT EXISTS idx_ai_promos_status ON ai_promotions(status);",
    """CREATE TABLE IF NOT EXISTS ai_action_approvals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action_type TEXT NOT NULL,
    target_id INTEGER,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    preview_diff_json TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    requested_by INTEGER,
    approved_by INTEGER,
    idempotency_key TEXT UNIQUE NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    executed_at TEXT
);""",
    "CREATE INDEX IF NOT EXISTS idx_ai_approvals_status ON ai_action_approvals(status);",
    "CREATE INDEX IF NOT EXISTS idx_ai_approvals_key ON ai_action_approvals(idempotency_key);",
    """CREATE TABLE IF NOT EXISTS ai_audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id INTEGER,
    details_json TEXT,
    admin_id INTEGER,
    ip_address TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);""",
    "CREATE INDEX IF NOT EXISTS idx_ai_audit_action ON ai_audit_logs(action);",
    "CREATE INDEX IF NOT EXISTS idx_ai_audit_created ON ai_audit_logs(created_at);",
]

AI_SEED_STATEMENTS: List[str] = [
    """INSERT OR IGNORE INTO ai_provider_config (
        id, provider_name, model_name, is_enabled, priority, daily_request_limit, daily_token_limit
    ) VALUES (
        1, 'cloudflare', '@cf/meta/llama-3.1-8b-instruct', 1, 1, 1000, 250000
    );""",
    """INSERT OR IGNORE INTO ai_provider_config (
        id, provider_name, model_name, is_enabled, priority, daily_request_limit, daily_token_limit
    ) VALUES (
        2, 'groq', 'llama-3.3-70b-versatile', 1, 2, 1000, 250000
    );""",
    """INSERT OR IGNORE INTO ai_provider_config (
        id, provider_name, model_name, is_enabled, priority, daily_request_limit, daily_token_limit
    ) VALUES (
        3, 'gemini', 'gemini-1.5-flash', 1, 3, 1000, 250000
    );""",
]

async def ensure_ai_tables(d1) -> None:
    """Ensures all AI database structures and default provider configurations exist in D1."""
    try:
        await d1.exec_statements(AI_SCHEMA_STATEMENTS)
        await d1.exec_statements(AI_SEED_STATEMENTS)
    except Exception as e:
        print(f"[AI D1 Schema] Initialization note: {e}")
