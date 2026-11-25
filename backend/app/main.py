"""FastAPI Application Entrypoint, Middleware & Exception Handlers."""

import logging
from collections.abc import Awaitable, Callable
from datetime import datetime, timezone
from typing import Any

from fastapi import FastAPI, Request, Response, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.router import api_v1_router
from app.config import settings

logger = logging.getLogger(__name__)

app = FastAPI(
    title="Urban Air Quality Assistant API",
    version="1.0.0",
    description="Deterministic Environmental Physics & AI Orchestration Backend",
)

# -------------------------------------------------------------------------
# 1. Production CORS Middleware
# -------------------------------------------------------------------------
origins = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",") if o.strip()]
if not origins:
    origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_security_headers(
    request: Request,
    call_next: Callable[[Request], Awaitable[Response]],
) -> Response:
    """Attach standard security headers to all API responses."""
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


# -------------------------------------------------------------------------
# 2. RFC 7807 Standardized Problem Details Error Handlers
# -------------------------------------------------------------------------
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Format Pydantic schema validation errors to RFC 7807 Problem Details."""
    errors = exc.errors()
    first_error = errors[0] if errors else {}
    msg = first_error.get("msg", "Validation error")
    loc = " -> ".join(str(p) for p in first_error.get("loc", []))

    problem = {
        "type": "https://urban-air.app/errors/validation-error",
        "title": "Invalid Request Parameters",
        "status": status.HTTP_422_UNPROCESSABLE_ENTITY,
        "detail": f"{loc}: {msg}" if loc else msg,
        "instance": str(request.url.path),
        "error_code": "VALIDATION_ERROR",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    return JSONResponse(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, content=problem)


@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError) -> JSONResponse:
    """Format domain ValueError exceptions to RFC 7807 Problem Details."""
    problem = {
        "type": "https://urban-air.app/errors/domain-error",
        "title": "Domain Calculation Error",
        "status": status.HTTP_400_BAD_REQUEST,
        "detail": str(exc),
        "instance": str(request.url.path),
        "error_code": "DOMAIN_ERROR",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    return JSONResponse(status_code=status.HTTP_400_BAD_REQUEST, content=problem)


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catch-all unhandled exceptions formatted to RFC 7807 Problem Details."""
    logger.exception("Unhandled error on %s: %s", request.url.path, exc)
    problem = {
        "type": "https://urban-air.app/errors/internal-error",
        "title": "Internal Server Error",
        "status": status.HTTP_500_INTERNAL_SERVER_ERROR,
        "detail": "An unexpected error occurred while processing the environmental analysis.",
        "instance": str(request.url.path),
        "error_code": "INTERNAL_ERROR",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    return JSONResponse(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content=problem)


# -------------------------------------------------------------------------
# 3. Health Check Endpoint
# -------------------------------------------------------------------------
@app.get("/api/health", tags=["system"])
async def health_check() -> dict[str, Any]:
    """Operational readiness probe for free-tier cloud containers (Render)."""
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": "1.0.0",
        "dependencies": {
            "gemini_api": "configured" if settings.GEMINI_API_KEY else "fallback_mode",
            "weather_cache": "active",
            "offline_presets": "ready",
        },
        "provenance_mode": "HYBRID_LIVE_WITH_FALLBACKS",
    }


# -------------------------------------------------------------------------
# 4. Mount V1 API Routers
# -------------------------------------------------------------------------
app.include_router(api_v1_router)
