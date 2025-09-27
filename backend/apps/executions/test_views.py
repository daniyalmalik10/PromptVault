from unittest.mock import MagicMock, patch

from apps.executions.models import Execution
from apps.prompts.models import Prompt
from apps.providers.base import CompletionResult
from apps.providers.exceptions import ProviderError

EXECUTIONS_URL = "/api/executions/"


def mock_provider(text="The answer.", input_tokens=5, output_tokens=10, latency_ms=200):
    provider = MagicMock()
    provider.complete = MagicMock(
        return_value=CompletionResult(
            text=text,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            latency_ms=latency_ms,
        )
    )
    return provider


class TestExecutionCreate:
    def test_unauthenticated_returns_401(self, client, prompt):
        res = client.post(
            EXECUTIONS_URL,
            {"prompt_id": prompt.pk, "provider": "groq", "model": "llama-3.1-8b-instant"},
            format="json",
        )
        assert res.status_code == 401

    def test_missing_fields_returns_400(self, auth_client):
        res = auth_client.post(EXECUTIONS_URL, {}, format="json")
        assert res.status_code == 400
        assert "prompt_id" in res.data
        assert "provider" in res.data

    def test_invalid_provider_returns_400(self, auth_client, prompt):
        res = auth_client.post(
            EXECUTIONS_URL,
            {"prompt_id": prompt.pk, "provider": "invalid_llm", "model": "x"},
            format="json",
        )
        assert res.status_code == 400

    def test_other_users_prompt_returns_404(self, auth_client, other_user):
        other_prompt = Prompt.objects.create(user=other_user, title="T", content="C")
        with patch("apps.executions.views.registry.get", return_value=mock_provider()):
            res = auth_client.post(
                EXECUTIONS_URL,
                {"prompt_id": other_prompt.pk, "provider": "groq", "model": "llama-3.1-8b-instant"},
                format="json",
            )
        assert res.status_code == 404

    def test_success_returns_201_with_correct_fields(self, auth_client, prompt):
        with patch("apps.executions.views.registry.get", return_value=mock_provider("The answer.")):
            res = auth_client.post(
                EXECUTIONS_URL,
                {"prompt_id": prompt.pk, "provider": "groq", "model": "llama-3.1-8b-instant"},
                format="json",
            )
        assert res.status_code == 201
        assert res.data["status"] == "success"
        assert res.data["result_text"] == "The answer."
        assert res.data["input_tokens"] == 5
        assert res.data["output_tokens"] == 10
        assert res.data["latency_ms"] == 200

    def test_success_persists_execution(self, auth_client, prompt):
        with patch("apps.executions.views.registry.get", return_value=mock_provider()):
            auth_client.post(
                EXECUTIONS_URL,
                {"prompt_id": prompt.pk, "provider": "groq", "model": "llama-3.1-8b-instant"},
                format="json",
            )
        assert Execution.objects.filter(prompt=prompt).count() == 1

    def test_provider_error_saves_error_execution(self, auth_client, prompt):
        failing = MagicMock()
        failing.complete = MagicMock(
            side_effect=ProviderError("Rate limit exceeded", status_code=429)
        )
        with patch("apps.executions.views.registry.get", return_value=failing):
            res = auth_client.post(
                EXECUTIONS_URL,
                {"prompt_id": prompt.pk, "provider": "groq", "model": "llama-3.1-8b-instant"},
                format="json",
            )
        assert res.status_code == 201
        assert res.data["status"] == "error"
        assert "Rate limit exceeded" in res.data["result_text"]
        assert Execution.objects.filter(prompt=prompt, status="error").count() == 1

    def test_unexpected_error_saves_error_execution(self, auth_client, prompt):
        failing = MagicMock()
        failing.complete = MagicMock(side_effect=RuntimeError("Connection timeout"))
        with patch("apps.executions.views.registry.get", return_value=failing):
            res = auth_client.post(
                EXECUTIONS_URL,
                {"prompt_id": prompt.pk, "provider": "groq", "model": "llama-3.1-8b-instant"},
                format="json",
            )
        assert res.status_code == 201
        assert res.data["status"] == "error"

    def test_correct_provider_and_model_stored(self, auth_client, prompt):
        with patch("apps.executions.views.registry.get", return_value=mock_provider()):
            res = auth_client.post(
                EXECUTIONS_URL,
                {
                    "prompt_id": prompt.pk,
                    "provider": "openrouter",
                    "model": "openai/gpt-4o-mini",
                },
                format="json",
            )
        assert res.data["provider"] == "openrouter"
        assert res.data["model"] == "openai/gpt-4o-mini"


class TestExecutionList:
    def test_unauthenticated_returns_401(self, client):
        res = client.get(EXECUTIONS_URL)
        assert res.status_code == 401

    def test_returns_only_own_executions(self, auth_client, user, other_user, prompt):
        other_prompt = Prompt.objects.create(user=other_user, title="T", content="C")
        Execution.objects.create(
            prompt=prompt, provider="groq", model="m", status="success", result_text="r"
        )
        Execution.objects.create(
            prompt=other_prompt, provider="groq", model="m", status="success", result_text="r"
        )
        res = auth_client.get(EXECUTIONS_URL)
        assert res.status_code == 200
        assert len(res.data) == 1

    def test_filter_by_prompt_id(self, auth_client, user, prompt):
        prompt2 = Prompt.objects.create(user=user, title="Other", content="C")
        Execution.objects.create(
            prompt=prompt, provider="groq", model="m", status="success", result_text="r"
        )
        Execution.objects.create(
            prompt=prompt2, provider="groq", model="m", status="success", result_text="r"
        )
        res = auth_client.get(EXECUTIONS_URL, {"prompt_id": prompt.pk})
        assert res.status_code == 200
        assert len(res.data) == 1
        assert res.data[0]["prompt"] == prompt.pk

    def test_filter_by_invalid_prompt_id_returns_400(self, auth_client):
        res = auth_client.get(EXECUTIONS_URL, {"prompt_id": "not-an-int"})
        assert res.status_code == 400

    def test_filter_by_other_users_prompt_id_returns_empty(self, auth_client, other_user):
        other_prompt = Prompt.objects.create(user=other_user, title="T", content="C")
        Execution.objects.create(
            prompt=other_prompt, provider="groq", model="m", status="success", result_text="r"
        )
        res = auth_client.get(EXECUTIONS_URL, {"prompt_id": other_prompt.pk})
        assert res.status_code == 200
        assert len(res.data) == 0

    def test_response_contains_expected_fields(self, auth_client, prompt):
        Execution.objects.create(
            prompt=prompt,
            provider="groq",
            model="llama3",
            status="success",
            result_text="answer",
            input_tokens=5,
            output_tokens=10,
            latency_ms=300,
        )
        res = auth_client.get(EXECUTIONS_URL)
        assert res.status_code == 200
        item = res.data[0]
        for field in [
            "id",
            "prompt",
            "provider",
            "model",
            "status",
            "result_text",
            "input_tokens",
            "output_tokens",
            "latency_ms",
            "created_at",
        ]:
            assert field in item
