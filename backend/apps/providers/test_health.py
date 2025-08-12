from unittest.mock import MagicMock, patch

import pytest

from apps.providers.base import CompletionResult


def _make_result(latency_ms: int = 120) -> CompletionResult:
    return CompletionResult(text="ok", input_tokens=5, output_tokens=1, latency_ms=latency_ms)


@pytest.fixture(autouse=True)
def reset_cache(monkeypatch):
    import apps.providers.views as v

    monkeypatch.setattr(v, "_cache", [])
    monkeypatch.setattr(v, "_cache_ts", 0.0)


@pytest.mark.django_db
class TestProviderHealthCheck:
    def test_returns_list_with_one_entry_per_provider(self, client):
        with patch("apps.providers.views.registry") as mock_reg:
            mock_reg.names.return_value = ["groq", "openrouter"]
            groq = MagicMock()
            groq.complete.return_value = _make_result(80)
            openrouter = MagicMock()
            openrouter.complete.return_value = _make_result(200)
            mock_reg.get.side_effect = lambda name: {"groq": groq, "openrouter": openrouter}[name]

            response = client.get("/api/providers/health/")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert {"provider": "groq", "status": "ok", "latency_ms": 80} in data
        assert {"provider": "openrouter", "status": "ok", "latency_ms": 200} in data

    def test_provider_error_returns_error_status(self, client):
        with patch("apps.providers.views.registry") as mock_reg:
            mock_reg.names.return_value = ["groq"]
            groq = MagicMock()
            groq.complete.side_effect = Exception("API error")
            mock_reg.get.return_value = groq

            response = client.get("/api/providers/health/")

        assert response.status_code == 200
        data = response.json()
        assert data[0] == {"provider": "groq", "status": "error", "latency_ms": None}

    def test_no_auth_required(self, client):
        with patch("apps.providers.views.registry") as mock_reg:
            mock_reg.names.return_value = []
            response = client.get("/api/providers/health/")

        assert response.status_code == 200

    def test_cache_hit_skips_provider_call(self, client):
        with patch("apps.providers.views.registry") as mock_reg:
            mock_reg.names.return_value = ["groq"]
            groq = MagicMock()
            groq.complete.return_value = _make_result()
            mock_reg.get.return_value = groq

            client.get("/api/providers/health/")
            client.get("/api/providers/health/")

        assert groq.complete.call_count == 1

    def test_cache_expires_after_ttl(self, client, monkeypatch):
        import apps.providers.views as v

        with patch("apps.providers.views.registry") as mock_reg:
            mock_reg.names.return_value = ["groq"]
            groq = MagicMock()
            groq.complete.return_value = _make_result()
            mock_reg.get.return_value = groq

            client.get("/api/providers/health/")
            monkeypatch.setattr(v, "_cache_ts", v._cache_ts - v._CACHE_TTL - 1)
            client.get("/api/providers/health/")

        assert groq.complete.call_count == 2

    def test_uses_5s_timeout_for_canary(self, client):
        with patch("apps.providers.views.registry") as mock_reg:
            mock_reg.names.return_value = ["groq"]
            groq = MagicMock()
            groq.complete.return_value = _make_result()
            mock_reg.get.return_value = groq

            client.get("/api/providers/health/")

        _, kwargs = groq.complete.call_args
        assert kwargs.get("timeout") == 5.0
