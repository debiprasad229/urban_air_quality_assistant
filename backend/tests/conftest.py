"""Global Pytest Fixtures and Mock Adapters."""

from typing import Any
from unittest.mock import AsyncMock, patch

import pytest

DEFAULT_MOCK_METEO = {
    "latitude": 28.61,
    "longitude": 77.21,
    "hourly": {
        "time": [f"2026-11-22T{h:02d}:00" for h in range(24)],
        "pm2_5": [110.0 + (h * 2) for h in range(24)],
        "pm10": [160.0 + (h * 3) for h in range(24)],
    },
}


@pytest.fixture(autouse=True)
def mock_external_network() -> Any:
    """Autouse fixture ensuring no tests make real outbound network requests."""
    mock_resp = AsyncMock()
    mock_resp.status_code = 200
    mock_resp.json = lambda: DEFAULT_MOCK_METEO

    with patch("httpx.AsyncClient.get", return_value=mock_resp):
        yield
