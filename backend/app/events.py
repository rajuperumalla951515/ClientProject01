import asyncio
import json
import time
from typing import Set, Dict, Any, Optional
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

class EventBroadcaster:
    """
    Lightweight, production-grade real-time event broadcaster for Sri Adithya Organics.
    Uses asyncio.Queue for multiplexed SSE connections.
    Maintains a monotonic version number so clients can also verify cache validity via short polling fallback.
    """
    def __init__(self):
        self._subscribers: Set[asyncio.Queue] = set()
        self._version: int = int(time.time())
        self._last_event: Optional[Dict[str, Any]] = None

    def get_version(self) -> int:
        return self._version

    def publish(self, event_type: str, payload: Optional[Dict[str, Any]] = None):
        """Broadcast an event to all connected clients after database transaction commits."""
        self._version += 1
        event = {
            "type": event_type,
            "version": self._version,
            "timestamp": int(time.time() * 1000),
            "payload": payload or {}
        }
        self._last_event = event

        # Non-blocking dispatch to all queues
        for queue in list(self._subscribers):
            try:
                queue.put_nowait(event)
            except asyncio.QueueFull:
                pass
            except Exception:
                self._subscribers.discard(queue)

    async def subscribe(self) -> asyncio.Queue:
        queue = asyncio.Queue(maxsize=100)
        self._subscribers.add(queue)
        return queue

    def unsubscribe(self, queue: asyncio.Queue):
        self._subscribers.discard(queue)

# Global singleton broadcaster
broadcaster = EventBroadcaster()

router = APIRouter(prefix="/events", tags=["Real-Time Synchronization"])

@router.get("/version")
def get_system_version():
    """Lightweight endpoint for polling / cache invalidation fallback."""
    return {
        "version": broadcaster.get_version(),
        "timestamp": int(time.time() * 1000),
        "status": "online"
    }

@router.get("")
@router.get("/stream")
async def event_stream(request: Request):
    """
    Server-Sent Events (SSE) stream for instant real-time synchronization.
    Sends product updates, inventory updates, and store changes immediately to browsers.
    """
    queue = await broadcaster.subscribe()

    async def generator():
        try:
            # Send initial handshake with current system version
            init_msg = json.dumps({
                "type": "CONNECTED",
                "version": broadcaster.get_version(),
                "timestamp": int(time.time() * 1000)
            })
            yield f"data: {init_msg}\n\n"

            while True:
                # Disconnect if client navigated away or closed browser
                if await request.is_disconnected():
                    break

                try:
                    # Wait for next broadcast event with 15s keep-alive timeout
                    event = await asyncio.wait_for(queue.get(), timeout=15.0)
                    msg = json.dumps(event)
                    yield f"data: {msg}\n\n"
                except asyncio.TimeoutError:
                    # SSE keep-alive heartbeat to prevent cloud load-balancer drop
                    yield ": keepalive\n\n"
        finally:
            broadcaster.unsubscribe(queue)

    return StreamingResponse(
        generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable proxy buffering on Nginx/Cloudflare
        }
    )

