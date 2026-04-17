import httpx
import pytest
from unittest.mock import MagicMock, patch

from config.asgi import application
from apps.providers.base import CompletionResult

BASE = "http://testserver"


def _mock_provider():
    p = MagicMock()
    p.complete.return_value = CompletionResult(
        text="Smoke answer.", input_tokens=8, output_tokens=15, latency_ms=42
    )
    return p


@pytest.mark.django_db(transaction=True)
async def test_full_user_flow():
    """Register → JWT → create prompt → execute (mocked provider) → list → stats."""
    transport = httpx.ASGITransport(app=application)
    async with httpx.AsyncClient(transport=transport, base_url=BASE) as client:
        # Register
        r = await client.post(
            "/api/auth/register/",
            json={"email": "smoke@example.com", "password": "smokepass99"},
        )
        assert r.status_code == 201

        # Obtain JWT — real auth layer, no force_authenticate
        r = await client.post(
            "/api/auth/token/",
            json={"email": "smoke@example.com", "password": "smokepass99"},
        )
        assert r.status_code == 200
        access = r.json()["access"]
        h = {"Authorization": f"Bearer {access}"}

        # /me with real token
        r = await client.get("/api/auth/me/", headers=h)
        assert r.status_code == 200
        assert r.json()["email"] == "smoke@example.com"

        # Create prompt
        r = await client.post(
            "/api/prompts/",
            json={"title": "Smoke", "content": "Explain recursion briefly."},
            headers=h,
        )
        assert r.status_code == 201
        pid = r.json()["id"]

        # Execute (provider mocked — no real API call)
        with patch("apps.executions.views.registry.get", return_value=_mock_provider()):
            r = await client.post(
                "/api/executions/",
                json={"prompt_id": pid, "provider": "groq", "model": "llama3-8b-8192"},
                headers=h,
            )
        assert r.status_code == 201
        assert r.json()["status"] == "success"
        assert r.json()["result_text"] == "Smoke answer."
        assert r.json()["input_tokens"] == 8
        assert r.json()["output_tokens"] == 15
        assert r.json()["latency_ms"] == 42

        # List executions
        r = await client.get("/api/executions/", headers=h)
        assert r.status_code == 200
        assert len(r.json()) == 1

        # Stats
        r = await client.get("/api/executions/stats/", headers=h)
        assert r.status_code == 200
        assert r.json()["7d"]["total_executions"] == 1
        assert r.json()["7d"]["success_rate"] == 1.0
