"""
Sri Adithya Organics — AI Configuration & Zero-Cost Policy Engine
Strictly manages environment variables, provider endpoints, and free-tier limits.
"""
import os
from typing import Dict, Any

class AIConfig:
    # --- Credentials (Never hardcoded, injected via Cloudflare Worker env/secrets) ---
    CLOUDFLARE_ACCOUNT_ID: str = os.getenv("CLOUDFLARE_ACCOUNT_ID", "").strip()
    CLOUDFLARE_API_TOKEN: str = os.getenv("CLOUDFLARE_API_TOKEN", "").strip()
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "").strip()
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "").strip()

    # --- Models (Verified Free-Tier Models Only) ---
    CLOUDFLARE_MODEL: str = os.getenv("CLOUDFLARE_AI_MODEL", "@cf/meta/llama-3.1-8b-instruct")
    GROQ_MODEL: str = os.getenv("GROQ_AI_MODEL", "llama-3.3-70b-versatile")
    GEMINI_MODEL: str = os.getenv("GEMINI_AI_MODEL", "gemini-1.5-flash")

    # --- Circuit Breaker & Timeout Configuration ---
    PROVIDER_TIMEOUT_SECONDS: float = float(os.getenv("AI_TIMEOUT_SECONDS", "12.0"))
    MAX_CONSECUTIVE_ERRORS: int = int(os.getenv("AI_MAX_ERRORS", "3"))
    COOLDOWN_MINUTES: int = int(os.getenv("AI_COOLDOWN_MINUTES", "5"))

    # --- Free-Tier Safety Limits (Daily Hard Ceilings) ---
    # Strict zero-cost limits prevent automatic overage
    DAILY_REQUEST_LIMIT: int = int(os.getenv("AI_DAILY_REQUEST_LIMIT", "1000"))
    DAILY_TOKEN_LIMIT: int = int(os.getenv("AI_DAILY_TOKEN_LIMIT", "250000"))

    # --- Endpoints ---
    GROQ_API_URL: str = "https://api.groq.com/openai/v1/chat/completions"
    GEMINI_API_BASE: str = "https://generativelanguage.googleapis.com/v1beta/models"

    @classmethod
    def get_provider_status(cls) -> Dict[str, Any]:
        """Returns whether API credentials exist for each provider without leaking secrets."""
        return {
            "cloudflare": {
                "has_credentials": bool(cls.CLOUDFLARE_API_TOKEN and cls.CLOUDFLARE_ACCOUNT_ID),
                "model": cls.CLOUDFLARE_MODEL,
                "provider_type": "primary",
            },
            "groq": {
                "has_credentials": bool(cls.GROQ_API_KEY),
                "model": cls.GROQ_MODEL,
                "provider_type": "fallback_1",
            },
            "gemini": {
                "has_credentials": bool(cls.GEMINI_API_KEY),
                "model": cls.GEMINI_MODEL,
                "provider_type": "fallback_2",
            },
        }

ai_config = AIConfig()
