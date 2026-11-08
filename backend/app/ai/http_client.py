"""
Sri Adithya Organics — Multi-Environment Asynchronous HTTP Client
Seamlessly handles outbound HTTPS calls in standard CPython (httpx/urllib)
and inside Cloudflare Python Workers (Pyodide / js.fetch).
"""
import sys
import json
import asyncio
from typing import Dict, Any, Optional, Tuple

class AIHttpClient:
    """Outbound async HTTP client designed for multi-runtime compatibility."""
    
    @classmethod
    async def post_json(
        cls,
        url: str,
        headers: Dict[str, str],
        payload: Dict[str, Any],
        timeout_seconds: float = 12.0
    ) -> Tuple[int, str]:
        """
        Executes an asynchronous POST request with JSON payload.
        Returns a tuple: (status_code, response_text).
        """
        # Strategy 1: In Cloudflare Python Workers (Emscripten / Pyodide runtime)
        if sys.platform == "emscripten":
            try:
                import js
                
                req_options = js.Object.new()
                req_options.method = "POST"
                req_headers = js.Object.new()
                for k, v in headers.items():
                    setattr(req_headers, k, v)
                req_options.headers = req_headers
                req_options.body = json.dumps(payload)
                
                resp_promise = js.fetch(url, req_options)
                # Await JS Promise in Pyodide
                resp = await resp_promise
                status_code = int(resp.status)
                text_promise = resp.text()
                body_text = await text_promise
                return status_code, str(body_text)
            except Exception as e:
                # If js.fetch fails or is unavailable, fallback to standard python
                pass

        # Strategy 2: Using httpx.AsyncClient if available
        try:
            import httpx
            async with httpx.AsyncClient(timeout=min(timeout_seconds, 8.0)) as client:
                resp = await client.post(url, headers=headers, json=payload)
                return resp.status_code, resp.text
        except Exception:
            # Fall back to standard library urllib below if httpx times out or fails
            pass

        # Strategy 3: Standard library urllib executed in background thread
        import urllib.request
        import urllib.error
        
        def _sync_post():
            data_bytes = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(url, data=data_bytes, headers=headers, method="POST")
            try:
                with urllib.request.urlopen(req, timeout=min(timeout_seconds, 8.0)) as res:
                    return res.getcode(), res.read().decode("utf-8", errors="replace")
            except urllib.error.HTTPError as he:
                return he.code, he.read().decode("utf-8", errors="replace")
            except urllib.error.URLError as ue:
                raise TimeoutError(f"Connection error to {url}: {ue.reason}")
        
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, _sync_post)

    @classmethod
    async def fetch_head_or_get(
        cls,
        url: str,
        timeout_seconds: float = 6.0
    ) -> Tuple[int, Dict[str, str], int]:
        """
        Executes lightweight HEAD or GET to inspect Content-Type and size.
        Returns: (status_code, headers_dict, size_bytes)
        """
        if sys.platform == "emscripten":
            try:
                import js
                req_options = js.Object.new()
                req_options.method = "HEAD"
                resp = await js.fetch(url, req_options)
                status_code = int(resp.status)
                headers_dict: Dict[str, str] = {}
                try:
                    ctype = str(resp.headers.get("content-type") or "")
                    clen = int(resp.headers.get("content-length") or 0)
                    headers_dict["content-type"] = ctype
                    headers_dict["content-length"] = str(clen)
                except Exception:
                    pass
                return status_code, headers_dict, int(headers_dict.get("content-length") or 0)
            except Exception:
                pass

        try:
            import httpx
            async with httpx.AsyncClient(timeout=timeout_seconds, follow_redirects=True) as client:
                try:
                    head_res = await client.head(url)
                    headers_dict = {k.lower(): v for k, v in head_res.headers.items()}
                    clen = int(headers_dict.get("content-length", 0))
                    return head_res.status_code, headers_dict, clen
                except Exception:
                    get_res = await client.get(url, headers={"Range": "bytes=0-1024"})
                    headers_dict = {k.lower(): v for k, v in get_res.headers.items()}
                    clen = int(headers_dict.get("content-length", len(get_res.content)))
                    return get_res.status_code, headers_dict, clen
        except Exception:
            pass

        import urllib.request
        def _sync_head():
            req = urllib.request.Request(url, method="HEAD", headers={"User-Agent": "Mozilla/5.0 (Sri Adithya Image Check)"})
            try:
                with urllib.request.urlopen(req, timeout=timeout_seconds) as res:
                    headers_dict = {k.lower(): v for k, v in res.getheaders()}
                    clen = int(headers_dict.get("content-length", 0))
                    return res.getcode(), headers_dict, clen
            except Exception:
                req_get = urllib.request.Request(url, method="GET", headers={"User-Agent": "Mozilla/5.0 (Sri Adithya Image Check)"})
                with urllib.request.urlopen(req_get, timeout=timeout_seconds) as res_get:
                    headers_dict = {k.lower(): v for k, v in res_get.getheaders()}
                    clen = int(headers_dict.get("content-length", 0))
                    return res_get.getcode(), headers_dict, clen

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, _sync_head)

http_client = AIHttpClient()
