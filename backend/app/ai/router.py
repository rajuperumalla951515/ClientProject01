"""
Sri Adithya Organics — Centralized AI Model Failover Router
Enforces the Zero-Cost Multi-Model Architecture with circuit breaker,
rate-limit detection, cooldown management, and automatic failover:
Cloudflare Workers AI -> GroqCloud -> Google Gemini.
"""
import hashlib
import json
import time
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from backend.app.ai.config import ai_config
from backend.app.ai.providers import (
    BaseAIProvider,
    CloudflareWorkersAIProvider,
    GroqProvider,
    GeminiProvider
)
from backend.app.ai_migrations import ensure_ai_tables

class AIRouter:
    def __init__(self):
        # Register providers in priority order
        self.providers: Dict[str, BaseAIProvider] = {
            "cloudflare": CloudflareWorkersAIProvider(),
            "groq": GroqProvider(),
            "gemini": GeminiProvider(),
        }
        # Ephemeral in-memory short-term deduplication cache (60s TTL)
        self._cache: Dict[str, Dict[str, Any]] = {}

    def _get_cache_key(self, task_type: str, prompt: str, system_prompt: str, json_mode: bool) -> str:
        raw = f"{task_type}:{prompt}:{system_prompt}:{json_mode}"
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    async def get_provider_configs(self, d1) -> List[Dict[str, Any]]:
        """Reads active provider configurations, priorities, and quotas from D1."""
        await ensure_ai_tables(d1)
        configs = await d1.fetch_all(
            "SELECT * FROM ai_provider_config ORDER BY priority ASC"
        )
        if not configs:
            # Fallback if table was freshly created
            configs = [
                {"provider_name": "cloudflare", "model_name": ai_config.CLOUDFLARE_MODEL, "is_enabled": 1, "priority": 1, "daily_request_limit": 1000, "daily_token_limit": 250000, "requests_today": 0, "tokens_today": 0, "consecutive_errors": 0, "cooldown_until": None},
                {"provider_name": "groq", "model_name": ai_config.GROQ_MODEL, "is_enabled": 1, "priority": 2, "daily_request_limit": 1000, "daily_token_limit": 250000, "requests_today": 0, "tokens_today": 0, "consecutive_errors": 0, "cooldown_until": None},
                {"provider_name": "gemini", "model_name": ai_config.GEMINI_MODEL, "is_enabled": 1, "priority": 3, "daily_request_limit": 1000, "daily_token_limit": 250000, "requests_today": 0, "tokens_today": 0, "consecutive_errors": 0, "cooldown_until": None},
            ]
        return configs

    async def route_request(
        self,
        d1,
        task_type: str,
        prompt: str,
        system_prompt: str = "You are an enterprise AI assistant for Sri Adithya Organics.",
        json_mode: bool = False,
        max_tokens: int = 1000,
        temperature: float = 0.3,
        admin_id: Optional[int] = None,
        binding: Any = None
    ) -> Dict[str, Any]:
        """
        Executes an AI request with automatic multi-model failover and zero-cost quotas.
        """
        actual_binding = binding or getattr(d1, "ai_binding", None)

        # 1. Check in-memory short-term cache for duplicate requests
        cache_key = self._get_cache_key(task_type, prompt, system_prompt, json_mode)
        now_ts = time.time()
        if cache_key in self._cache:
            entry = self._cache[cache_key]
            if now_ts - entry["timestamp"] < 60.0:  # 60s cache window
                cached_res = entry["result"].copy()
                cached_res["is_cached"] = True
                return cached_res

        # 2. Fetch provider configurations from D1
        configs = await self.get_provider_configs(d1)
        now_dt = datetime.utcnow()
        now_str = now_dt.strftime("%Y-%m-%d %H:%M:%S")

        errors_encountered: List[Dict[str, Any]] = []

        # 3. Iterate through eligible providers in configured priority order
        for cfg in configs:
            p_name = cfg["provider_name"]
            provider = self.providers.get(p_name)
            if not provider:
                continue

            # Check if enabled
            if not cfg.get("is_enabled", 1):
                continue

            # Check credentials
            if not provider.is_configured():
                # Allow Cloudflare if binding is attached
                if p_name == "cloudflare" and actual_binding is not None:
                    pass
                else:
                    errors_encountered.append({
                        "provider": p_name,
                        "error": f"Credentials for {p_name} are not configured in environment."
                    })
                    continue

            # Check zero-cost daily limits
            reqs_today = cfg.get("requests_today", 0)
            req_limit = cfg.get("daily_request_limit", 1000)
            if reqs_today >= req_limit:
                errors_encountered.append({
                    "provider": p_name,
                    "error": f"Zero-cost daily request limit ({req_limit}) reached for {p_name}."
                })
                continue

            # Check circuit breaker cooldown
            cooldown_until = cfg.get("cooldown_until")
            if cooldown_until:
                try:
                    cd_dt = datetime.strptime(cooldown_until, "%Y-%m-%d %H:%M:%S")
                    if now_dt < cd_dt:
                        errors_encountered.append({
                            "provider": p_name,
                            "error": f"{p_name} is in circuit breaker cooldown until {cooldown_until}."
                        })
                        continue
                except Exception:
                    pass

            # 4. Attempt Generation with Current Provider
            try:
                result = await provider.generate(
                    prompt=prompt,
                    system_prompt=system_prompt,
                    json_mode=json_mode,
                    max_tokens=max_tokens,
                    temperature=temperature,
                    binding=actual_binding if p_name == "cloudflare" else None
                )

                # Validate output
                content = result.get("content", "").strip()
                if not content:
                    raise ValueError(f"Provider {p_name} returned empty text.")

                if json_mode:
                    # Sanitize markdown formatting if wrapped in ```json ... ```
                    cleaned_content = content
                    if cleaned_content.startswith("```json"):
                        cleaned_content = cleaned_content[7:]
                    if cleaned_content.startswith("```"):
                        cleaned_content = cleaned_content[3:]
                    if cleaned_content.endswith("```"):
                        cleaned_content = cleaned_content[:-3]
                    cleaned_content = cleaned_content.strip()
                    
                    try:
                        # Validate that it parses as JSON
                        json.loads(cleaned_content)
                        result["content"] = cleaned_content
                    except json.JSONDecodeError as jde:
                        raise ValueError(f"Malformed JSON from {p_name}: {jde}")

                # Success: update provider state in D1
                tokens_prompt = result.get("tokens_prompt", 0)
                tokens_completion = result.get("tokens_completion", 0)
                total_tokens = tokens_prompt + tokens_completion

                await d1.execute(
                    """UPDATE ai_provider_config
                       SET consecutive_errors = 0,
                           cooldown_until = NULL,
                           last_success_at = ?,
                           requests_today = requests_today + 1,
                           tokens_today = tokens_today + ?,
                           updated_at = ?
                       WHERE provider_name = ?""",
                    now_str, total_tokens, now_str, p_name
                )

                # Log to ai_usage_logs
                await d1.execute(
                    """INSERT INTO ai_usage_logs (
                        provider, model, task_type, tokens_prompt, tokens_completion,
                        latency_ms, status, admin_id, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, 'success', ?, ?)""",
                    p_name, result.get("model", ""), task_type, tokens_prompt, tokens_completion,
                    result.get("latency_ms", 0), admin_id, now_str
                )

                # Cache response
                self._cache[cache_key] = {
                    "timestamp": now_ts,
                    "result": result
                }

                result["is_cached"] = False
                result["failover_history"] = errors_encountered
                return result

            except Exception as exc:
                err_msg = str(exc)
                is_rate_limit = "429" in err_msg or "rate limit" in err_msg.lower()
                is_timeout = "timeout" in err_msg.lower() or isinstance(exc, TimeoutError)

                # Compute new error count & potential cooldown
                cur_errors = cfg.get("consecutive_errors", 0) + 1
                cooldown_str = None
                if is_rate_limit or cur_errors >= ai_config.MAX_CONSECUTIVE_ERRORS:
                    cooldown_dt = now_dt + timedelta(minutes=ai_config.COOLDOWN_MINUTES)
                    cooldown_str = cooldown_dt.strftime("%Y-%m-%d %H:%M:%S")

                await d1.execute(
                    """UPDATE ai_provider_config
                       SET consecutive_errors = ?,
                           cooldown_until = ?,
                           last_error_at = ?,
                           last_error_message = ?,
                           updated_at = ?
                       WHERE provider_name = ?""",
                    cur_errors, cooldown_str, now_str, err_msg[:250], now_str, p_name
                )

                # Log failure to ai_usage_logs
                status_label = "rate_limit" if is_rate_limit else "timeout" if is_timeout else "error"
                await d1.execute(
                    """INSERT INTO ai_usage_logs (
                        provider, model, task_type, status, error_message, admin_id, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)""",
                    p_name, cfg.get("model_name", ""), task_type, status_label, err_msg[:250], admin_id, now_str
                )

                errors_encountered.append({
                    "provider": p_name,
                    "status": status_label,
                    "error": err_msg
                })
                # Proceed to next eligible provider in loop!

        # 5. If all eligible providers failed, raise comprehensive diagnostic error
        detail_reasons = "; ".join([f"{e.get('provider')}: {e.get('error')}" for e in errors_encountered])
        raise RuntimeError(
            f"All AI providers failed to satisfy request. Zero-Cost Policy Protected. Details: [{detail_reasons}]"
        )

ai_router = AIRouter()
