"""Thread-Safe Sliding Window Rate Limiter.

Protects expensive AI endpoints from abuse and preserves free-tier Gemini quota
without requiring external Redis infrastructure.
"""

import math
import threading
import time
from collections import deque

from fastapi import HTTPException, Request, status


class SlidingWindowRateLimiter:
    """In-memory sliding-window rate limiter keyed by client IP."""

    def __init__(self, max_requests: int = 5, window_seconds: int = 600) -> None:
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._lock = threading.RLock()
        self._hits: dict[str, deque[float]] = {}

    @staticmethod
    def extract_client_ip(request: Request) -> str:
        """Extract client IP, respecting X-Forwarded-For behind Render/Vercel proxies."""
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            first_ip = forwarded_for.split(",")[0].strip()
            if first_ip:
                return first_ip
        if request.client and request.client.host:
            return request.client.host
        return "unknown"

    def check(self, request: Request) -> None:
        """Record a request or raise HTTP 429 if the sliding window limit is exceeded."""
        client_ip = self.extract_client_ip(request)
        now = time.monotonic()
        cutoff = now - self.window_seconds

        with self._lock:
            timestamps = self._hits.setdefault(client_ip, deque())
            while timestamps and timestamps[0] <= cutoff:
                timestamps.popleft()

            if len(timestamps) >= self.max_requests:
                retry_after = max(1, math.ceil(timestamps[0] + self.window_seconds - now))
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=(
                        f"Rate limit exceeded: maximum {self.max_requests} AI plan requests "
                        f"per {self.window_seconds // 60} minutes. Try again in {retry_after}s."
                    ),
                    headers={"Retry-After": str(retry_after)},
                )

            timestamps.append(now)

    def reset(self) -> None:
        """Clear all recorded request timestamps (useful for testing)."""
        with self._lock:
            self._hits.clear()
