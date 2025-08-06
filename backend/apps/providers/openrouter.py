import time

import httpx
from django.conf import settings

from .base import CompletionResult, LLMProvider
from .exceptions import ProviderError

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"


class OpenRouterProvider(LLMProvider):
    def __init__(self, api_key: str | None = None) -> None:
        self._api_key = api_key or settings.OPENROUTER_API_KEY

    async def complete(
        self,
        prompt_text: str,
        model: str,
        max_tokens: int = 1024,
    ) -> CompletionResult:
        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://promptvault.app",
        }
        body = {
            "model": model,
            "messages": [{"role": "user", "content": prompt_text}],
            "max_tokens": max_tokens,
        }
        start = time.monotonic()
        async with httpx.AsyncClient(base_url=OPENROUTER_BASE_URL, timeout=60.0) as client:
            response = await client.post("/chat/completions", json=body, headers=headers)
        latency_ms = int((time.monotonic() - start) * 1000)

        if response.status_code != 200:
            raise ProviderError(
                f"OpenRouter error {response.status_code}: {response.text}",
                status_code=response.status_code,
            )

        data = response.json()
        return CompletionResult(
            text=data["choices"][0]["message"]["content"],
            input_tokens=data["usage"]["prompt_tokens"],
            output_tokens=data["usage"]["completion_tokens"],
            latency_ms=latency_ms,
        )
