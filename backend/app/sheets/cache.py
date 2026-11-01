"""
Thread-Safe In-Memory Cache and Concurrency Lock Manager
Sri Adithya Organics - Google Sheets Storage Layer
Designed to serve 30,000+ monthly visitors within Google Sheets API rate limits.
"""

import time
import threading
from typing import Any, Optional, Dict, List
from backend.app.config import settings

class SheetsCacheManager:
    def __init__(self, default_ttl: int = 120):
        self._lock = threading.RLock()
        self._order_lock = threading.Lock()  # Concurrency lock for atomic checkout/stock updates
        self._default_ttl = default_ttl
        
        # In-memory stores
        self._products_cache: Optional[List[Dict[str, Any]]] = None
        self._products_cache_expiry: float = 0.0
        
        self._categories_cache: Optional[List[Dict[str, Any]]] = None
        self._categories_cache_expiry: float = 0.0
        
        self._settings_cache: Optional[Dict[str, Any]] = None
        self._settings_cache_expiry: float = 0.0

        # Stats
        self.hits: int = 0
        self.misses: int = 0

    @property
    def order_lock(self) -> threading.Lock:
        """Lock for serializing inventory reservations and order placements."""
        return self._order_lock

    # --- Products Cache ---
    def get_products(self) -> Optional[List[Dict[str, Any]]]:
        with self._lock:
            now = time.time()
            if self._products_cache is not None and now < self._products_cache_expiry:
                self.hits += 1
                return list(self._products_cache)
            self.misses += 1
            return None

    def set_products(self, products: List[Dict[str, Any]], ttl: Optional[int] = None) -> None:
        with self._lock:
            effective_ttl = ttl if ttl is not None else self._default_ttl
            self._products_cache = list(products)
            self._products_cache_expiry = time.time() + effective_ttl

    def invalidate_products(self) -> None:
        with self._lock:
            self._products_cache = None
            self._products_cache_expiry = 0.0

    # --- Categories Cache ---
    def get_categories(self) -> Optional[List[Dict[str, Any]]]:
        with self._lock:
            now = time.time()
            if self._categories_cache is not None and now < self._categories_cache_expiry:
                self.hits += 1
                return list(self._categories_cache)
            self.misses += 1
            return None

    def set_categories(self, categories: List[Dict[str, Any]], ttl: Optional[int] = None) -> None:
        with self._lock:
            effective_ttl = ttl if ttl is not None else self._default_ttl
            self._categories_cache = list(categories)
            self._categories_cache_expiry = time.time() + effective_ttl

    def invalidate_categories(self) -> None:
        with self._lock:
            self._categories_cache = None
            self._categories_cache_expiry = 0.0

    # --- Settings Cache ---
    def get_settings(self) -> Optional[Dict[str, Any]]:
        with self._lock:
            now = time.time()
            if self._settings_cache is not None and now < self._settings_cache_expiry:
                self.hits += 1
                return dict(self._settings_cache)
            self.misses += 1
            return None

    def set_settings(self, data: Dict[str, Any], ttl: Optional[int] = None) -> None:
        with self._lock:
            effective_ttl = ttl if ttl is not None else (self._default_ttl * 2)
            self._settings_cache = dict(data)
            self._settings_cache_expiry = time.time() + effective_ttl

    def invalidate_settings(self) -> None:
        with self._lock:
            self._settings_cache = None
            self._settings_cache_expiry = 0.0

    # --- Invalidate All ---
    def invalidate_all(self) -> None:
        with self._lock:
            self._products_cache = None
            self._products_cache_expiry = 0.0
            self._categories_cache = None
            self._categories_cache_expiry = 0.0
            self._settings_cache = None
            self._settings_cache_expiry = 0.0

# Singleton instance
sheets_cache = SheetsCacheManager(default_ttl=settings.GOOGLE_SHEETS_CACHE_TTL)

