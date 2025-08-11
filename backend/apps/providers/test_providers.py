from unittest.mock import MagicMock, patch

import pytest

from apps.providers.base import CompletionResult
from apps.providers.exceptions import ProviderError
from apps.providers.groq import GroqProvider
from apps.providers.openrouter import OpenRouterProvider

COMPLETION_RESPONSE = {
    "choices": [{"message": {"content": "Hello world"}}],
    "usage": {"prompt_tokens": 10, "completion_tokens": 20},
}


def _make_response(status_code: int, data: dict) -> MagicMock:
    mock = MagicMock()
    mock.status_code = status_code
    mock.json.return_value = data
    mock.text = str(data)
    return mock


def _mock_client(response: MagicMock) -> tuple[MagicMock, MagicMock]:
    client = MagicMock()
    client.post = MagicMock(return_value=response)
    ctx = MagicMock()
    ctx.__enter__ = MagicMock(return_value=client)
    ctx.__exit__ = MagicMock(return_value=False)
    return ctx, client


class TestGroqProvider:
    @pytest.fixture
    def provider(self):
        return GroqProvider(api_key="test-key")

    def test_complete_success_returns_result(self, provider):
        ctx, _ = _mock_client(_make_response(200, COMPLETION_RESPONSE))
        with patch("apps.providers.groq.httpx.Client", return_value=ctx):
            result = provider.complete("Say hello", "llama3-8b-8192")

        assert isinstance(result, CompletionResult)
        assert result.text == "Hello world"
        assert result.input_tokens == 10
        assert result.output_tokens == 20
        assert result.latency_ms >= 0

    def test_complete_sends_correct_body_and_auth_header(self, provider):
        ctx, client = _mock_client(_make_response(200, COMPLETION_RESPONSE))
        with patch("apps.providers.groq.httpx.Client", return_value=ctx):
            provider.complete("My prompt", "llama3-8b-8192", max_tokens=512)

        call_kwargs = client.post.call_args.kwargs
        assert call_kwargs["json"]["model"] == "llama3-8b-8192"
        assert call_kwargs["json"]["messages"][0]["content"] == "My prompt"
        assert call_kwargs["json"]["max_tokens"] == 512
        assert call_kwargs["headers"]["Authorization"] == "Bearer test-key"

    def test_complete_non_200_raises_provider_error(self, provider):
        ctx, _ = _mock_client(_make_response(401, {"error": "invalid_api_key"}))
        with patch("apps.providers.groq.httpx.Client", return_value=ctx):
            with pytest.raises(ProviderError) as exc_info:
                provider.complete("prompt", "model")

        assert exc_info.value.status_code == 401

    def test_complete_429_raises_provider_error_with_status(self, provider):
        ctx, _ = _mock_client(_make_response(429, {"error": "rate_limit"}))
        with patch("apps.providers.groq.httpx.Client", return_value=ctx):
            with pytest.raises(ProviderError) as exc_info:
                provider.complete("prompt", "model")

        assert exc_info.value.status_code == 429


class TestOpenRouterProvider:
    @pytest.fixture
    def provider(self):
        return OpenRouterProvider(api_key="or-test-key")

    def test_complete_success(self, provider):
        ctx, _ = _mock_client(_make_response(200, COMPLETION_RESPONSE))
        with patch("apps.providers.openrouter.httpx.Client", return_value=ctx):
            result = provider.complete("prompt", "openai/gpt-4o-mini")

        assert result.text == "Hello world"
        assert result.input_tokens == 10
        assert result.output_tokens == 20

    def test_complete_sends_http_referer_header(self, provider):
        ctx, client = _mock_client(_make_response(200, COMPLETION_RESPONSE))
        with patch("apps.providers.openrouter.httpx.Client", return_value=ctx):
            provider.complete("prompt", "model")

        headers = client.post.call_args.kwargs["headers"]
        assert "HTTP-Referer" in headers

    def test_complete_sends_correct_auth_header(self, provider):
        ctx, client = _mock_client(_make_response(200, COMPLETION_RESPONSE))
        with patch("apps.providers.openrouter.httpx.Client", return_value=ctx):
            provider.complete("prompt", "model")

        headers = client.post.call_args.kwargs["headers"]
        assert headers["Authorization"] == "Bearer or-test-key"

    def test_complete_non_200_raises_provider_error(self, provider):
        ctx, _ = _mock_client(_make_response(429, {"error": "rate_limit"}))
        with patch("apps.providers.openrouter.httpx.Client", return_value=ctx):
            with pytest.raises(ProviderError) as exc_info:
                provider.complete("prompt", "model")

        assert exc_info.value.status_code == 429
