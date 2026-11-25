"""Direct Asynchronous Gemini REST API Client.

Interfaces with Google Gemini via httpx without heavy Cloud SDK dependencies,
ensuring low memory overhead on free-tier containers.
"""

import json
import logging
from typing import Any, cast

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


class AIService:
    """Asynchronous Gemini REST API client with structured JSON output."""

    def __init__(self) -> None:
        self.api_key = settings.GEMINI_API_KEY
        self.model = settings.GEMINI_MODEL
        self.timeout = settings.GEMINI_TIMEOUT_SECONDS

    async def generate_plan(self, prompt_text: str) -> dict[str, Any] | None:
        """Call Gemini generateContent endpoint and parse JSON response.

        Tries the configured model first and falls back to alternative Flash
        models if experiencing temporary 503 high demand or 404 model aliases.

        Returns:
            Parsed dictionary matching AssistantPlanResponseDTO, or None on failure.
        """
        if not self.api_key:
            logger.info("GEMINI_API_KEY is not configured; using deterministic fallback.")
            return None

        candidate_models: list[str] = []
        for m in [
            self.model,
            "gemini-3.5-flash-lite",
            "gemini-flash-lite-latest",
            "gemini-3.1-flash-lite",
        ]:
            if m and m not in candidate_models:
                candidate_models.append(m)

        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": prompt_text}],
                }
            ],
            "generationConfig": {
                "temperature": 0.2,
                "topP": 0.8,
                "responseMimeType": "application/json",
            },
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                for model_name in candidate_models:
                    url = (
                        f"https://generativelanguage.googleapis.com/v1beta/models/"
                        f"{model_name}:generateContent?key={self.api_key}"
                    )
                    resp = await client.post(url, json=payload)

                    if resp.status_code == 200:
                        data = resp.json()
                        candidates = data.get("candidates", [])
                        if candidates:
                            raw_text = (
                                candidates[0]
                                .get("content", {})
                                .get("parts", [{}])[0]
                                .get("text", "")
                            )
                            clean_text = raw_text.strip()
                            if clean_text.startswith("```json"):
                                clean_text = clean_text[7:]
                            if clean_text.startswith("```"):
                                clean_text = clean_text[3:]
                            if clean_text.endswith("```"):
                                clean_text = clean_text[:-3]

                            parsed_dict = json.loads(clean_text.strip())
                            return cast(dict[str, Any], parsed_dict)

                    logger.warning(
                        "Gemini API call (%s) failed with status %s: %s",
                        model_name,
                        resp.status_code,
                        resp.text[:200],
                    )
                    if resp.status_code not in (404, 429, 503):
                        break
                return None
        except Exception as exc:
            logger.warning("Gemini API request encountered exception: %s", exc)
            return None
