"""
Sri Adithya Organics — Multi-Model AI Provider Abstraction
Implements uniform interface across Cloudflare Workers AI, GroqCloud, and Google Gemini.
Strictly respects free-tier quotas and zero-cost constraints.
"""
import json
import time
from typing import Dict, Any, Optional
from backend.app.ai.config import ai_config
from backend.app.ai.http_client import http_client

class BaseAIProvider:
    """Abstract base class for all AI model providers."""
    name: str = "base"
    model: str = "default"

    def is_configured(self) -> bool:
        """Returns True if the provider has the minimum credentials/environment required."""
        raise NotImplementedError

    async def generate(
        self,
        prompt: str,
        system_prompt: str = "You are an enterprise AI assistant for Sri Adithya Organics.",
        json_mode: bool = False,
        max_tokens: int = 1000,
        temperature: float = 0.3,
        binding: Any = None
    ) -> Dict[str, Any]:
        """
        Generates content from the provider.
        Returns a dict:
        {
            "content": str,
            "tokens_prompt": int,
            "tokens_completion": int,
            "latency_ms": int,
            "provider": str,
            "model": str
        }
        """
        raise NotImplementedError


class CloudflareWorkersAIProvider(BaseAIProvider):
    """
    Primary Provider: Cloudflare Workers AI.
    Runs locally on Cloudflare's global edge network via Workers AI binding (@cf/meta/llama-3.1-8b-instruct)
    or via Cloudflare Client v4 AI REST API.
    """
    name = "cloudflare"

    def __init__(self, model: Optional[str] = None):
        self.model = model or ai_config.CLOUDFLARE_MODEL

    def is_configured(self) -> bool:
        return bool(ai_config.CLOUDFLARE_ACCOUNT_ID and ai_config.CLOUDFLARE_API_TOKEN)

    async def generate(
        self,
        prompt: str,
        system_prompt: str = "You are an enterprise AI assistant for Sri Adithya Organics.",
        json_mode: bool = False,
        max_tokens: int = 1000,
        temperature: float = 0.3,
        binding: Any = None
    ) -> Dict[str, Any]:
        start_time = time.time()
        
        # 1. Attempt Native Cloudflare Workers AI Binding if available on request
        if binding is not None and hasattr(binding, "run"):
            try:
                run_payload = {
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": prompt}
                    ],
                    "max_tokens": max_tokens,
                    "temperature": temperature,
                }
                res = await binding.run(self.model, run_payload)
                content = ""
                if isinstance(res, dict):
                    content = res.get("response", "") or res.get("result", {}).get("response", "")
                elif hasattr(res, "response"):
                    content = str(res.response)
                
                latency_ms = int((time.time() - start_time) * 1000)
                return {
                    "content": content.strip(),
                    "tokens_prompt": len(prompt) // 4,
                    "tokens_completion": len(content) // 4,
                    "latency_ms": latency_ms,
                    "provider": self.name,
                    "model": self.model
                }
            except Exception as bind_err:
                # If binding fails, fallback to REST API below
                pass

        # 2. Cloudflare Workers AI REST API
        if not self.is_configured():
            raise ValueError("Cloudflare Workers AI credentials missing (CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN).")

        url = f"https://api.cloudflare.com/client/v4/accounts/{ai_config.CLOUDFLARE_ACCOUNT_ID}/ai/run/{self.model}"
        headers = {
            "Authorization": f"Bearer {ai_config.CLOUDFLARE_API_TOKEN}",
            "Content-Type": "application/json"
        }
        payload = {
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            "max_tokens": max_tokens,
            "temperature": temperature
        }

        status, text = await http_client.post_json(
            url, headers, payload, timeout_seconds=ai_config.PROVIDER_TIMEOUT_SECONDS
        )

        latency_ms = int((time.time() - start_time) * 1000)

        if status == 429:
            raise RuntimeError("Cloudflare AI Rate Limit Exceeded (HTTP 429)")
        if status != 200:
            raise RuntimeError(f"Cloudflare AI Error ({status}): {text[:300]}")

        data = json.loads(text)
        content = data.get("result", {}).get("response", "")
        if not content:
            raise ValueError("Cloudflare AI returned empty content response.")

        return {
            "content": content.strip(),
            "tokens_prompt": len(prompt) // 4,
            "tokens_completion": len(content) // 4,
            "latency_ms": latency_ms,
            "provider": self.name,
            "model": self.model
        }


class GroqProvider(BaseAIProvider):
    """
    Fallback Provider 1: GroqCloud API (Ultra-low latency Llama-3.3-70b-versatile or Llama-3.1-8b).
    Operates under Groq free-tier quotas.
    """
    name = "groq"

    def __init__(self, model: Optional[str] = None):
        self.model = model or ai_config.GROQ_MODEL

    def is_configured(self) -> bool:
        return bool(ai_config.GROQ_API_KEY)

    async def generate(
        self,
        prompt: str,
        system_prompt: str = "You are an enterprise AI assistant for Sri Adithya Organics.",
        json_mode: bool = False,
        max_tokens: int = 1000,
        temperature: float = 0.3,
        binding: Any = None
    ) -> Dict[str, Any]:
        if not self.is_configured():
            raise ValueError("Groq API Key missing (GROQ_API_KEY).")

        start_time = time.time()
        url = ai_config.GROQ_API_URL
        headers = {
            "Authorization": f"Bearer {ai_config.GROQ_API_KEY}",
            "Content-Type": "application/json"
        }

        payload: Dict[str, Any] = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            "max_tokens": max_tokens,
            "temperature": temperature
        }

        if json_mode:
            payload["response_format"] = {"type": "json_object"}

        status, text = await http_client.post_json(
            url, headers, payload, timeout_seconds=ai_config.PROVIDER_TIMEOUT_SECONDS
        )

        latency_ms = int((time.time() - start_time) * 1000)

        if status == 429:
            raise RuntimeError("Groq Rate Limit Exceeded (HTTP 429)")
        if status != 200:
            raise RuntimeError(f"Groq API Error ({status}): {text[:300]}")

        data = json.loads(text)
        choices = data.get("choices", [])
        if not choices:
            raise ValueError("Groq returned 0 choices.")

        content = choices[0].get("message", {}).get("content", "")
        usage = data.get("usage", {})
        tokens_p = usage.get("prompt_tokens", len(prompt) // 4)
        tokens_c = usage.get("completion_tokens", len(content) // 4)

        return {
            "content": content.strip(),
            "tokens_prompt": tokens_p,
            "tokens_completion": tokens_c,
            "latency_ms": latency_ms,
            "provider": self.name,
            "model": self.model
        }


class GeminiProvider(BaseAIProvider):
    """
    Fallback Provider 2: Google Gemini API (gemini-1.5-flash / gemini-2.0-flash).
    Operates under Google AI Studio free tier.
    """
    name = "gemini"

    def __init__(self, model: Optional[str] = None):
        self.model = model or ai_config.GEMINI_MODEL

    def is_configured(self) -> bool:
        return bool(ai_config.GEMINI_API_KEY)

    async def generate(
        self,
        prompt: str,
        system_prompt: str = "You are an enterprise AI assistant for Sri Adithya Organics.",
        json_mode: bool = False,
        max_tokens: int = 1000,
        temperature: float = 0.3,
        binding: Any = None
    ) -> Dict[str, Any]:
        if not self.is_configured():
            raise ValueError("Google Gemini API Key missing (GEMINI_API_KEY).")

        start_time = time.time()
        url = f"{ai_config.GEMINI_API_BASE}/{self.model}:generateContent?key={ai_config.GEMINI_API_KEY}"
        headers = {
            "Content-Type": "application/json"
        }

        generation_config: Dict[str, Any] = {
            "maxOutputTokens": max_tokens,
            "temperature": temperature,
        }
        if json_mode:
            generation_config["responseMimeType"] = "application/json"

        payload = {
            "systemInstruction": {
                "parts": [{"text": system_prompt}]
            },
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": prompt}]
                }
            ],
            "generationConfig": generation_config
        }

        status, text = await http_client.post_json(
            url, headers, payload, timeout_seconds=ai_config.PROVIDER_TIMEOUT_SECONDS
        )

        latency_ms = int((time.time() - start_time) * 1000)

        if status == 429:
            raise RuntimeError("Gemini Rate Limit Exceeded (HTTP 429)")
        if status != 200:
            raise RuntimeError(f"Gemini API Error ({status}): {text[:300]}")

        data = json.loads(text)
        candidates = data.get("candidates", [])
        if not candidates:
            raise ValueError("Gemini returned 0 candidates.")

        parts = candidates[0].get("content", {}).get("parts", [])
        content = "".join([p.get("text", "") for p in parts if "text" in p])

        usage = data.get("usageMetadata", {})
        tokens_p = usage.get("promptTokenCount", len(prompt) // 4)
        tokens_c = usage.get("candidatesTokenCount", len(content) // 4)

        return {
            "content": content.strip(),
            "tokens_prompt": tokens_p,
            "tokens_completion": tokens_c,
            "latency_ms": latency_ms,
            "provider": self.name,
            "model": self.model
        }
