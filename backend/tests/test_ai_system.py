"""
Sri Adithya Organics — AI System Unit & Integration Tests
"""
import sqlite3
from backend.app.ai_migrations import AI_SCHEMA_STATEMENTS, AI_SEED_STATEMENTS
from backend.app.ai.promotions import promotion_intelligence
from backend.app.ai.config import ai_config
from backend.app.ai.router import ai_router

def test_ai_database_initialization():
    """Test self-healing AI schema creation in SQLite/D1."""
    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row
    for s in AI_SCHEMA_STATEMENTS:
        conn.execute(s)
    for s in AI_SEED_STATEMENTS:
        conn.execute(s)
    conn.commit()

    rows = conn.execute("SELECT * FROM ai_provider_config").fetchall()
    assert len(rows) == 3
    providers = [r["provider_name"] for r in rows]
    assert "cloudflare" in providers
    assert "groq" in providers
    assert "gemini" in providers

def test_deterministic_margin_calculation():
    """Verify backend strictly calculates margins and clamps dangerous discounts."""
    calc = promotion_intelligence.calculate_margin(
        original_price=500.0,
        discounted_price=420.0,
        estimated_cost=350.0
    )
    assert calc["discount_amount"] == 80.0
    assert calc["discount_percent"] == 16.0
    assert calc["gross_profit"] == 70.0
    assert calc["gross_margin_percent"] == 16.7

def test_zero_cost_policy_provider_configuration():
    """Verify provider credentials status inspection."""
    status = ai_config.get_provider_status()
    assert "cloudflare" in status
    assert "groq" in status
    assert "gemini" in status
    assert status["cloudflare"]["provider_type"] == "primary"
    assert status["groq"]["provider_type"] == "fallback_1"
    assert status["gemini"]["provider_type"] == "fallback_2"

def test_ai_router_provider_registry():
    """Verify all 3 zero-cost providers are registered in the failover router."""
    registered = list(ai_router.providers.keys())
    assert registered == ["cloudflare", "groq", "gemini"]
