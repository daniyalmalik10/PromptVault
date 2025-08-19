from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from apps.executions.models import Execution
from apps.prompts.models import Prompt

STATS_URL = "/api/executions/stats/"

User = get_user_model()


@pytest.fixture
def user(db):
    return User.objects.create_user(email="stats@example.com", password="testpass123")


@pytest.fixture
def auth_client(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


@pytest.fixture
def prompt(user):
    return Prompt.objects.create(user=user, title="P", content="prompt text")


def make_execution(prompt, provider="groq", status=Execution.Status.SUCCESS, days_ago=0, **kwargs):
    e = Execution.objects.create(
        prompt=prompt,
        provider=provider,
        model="llama3-8b-8192",
        status=status,
        result_text="ok",
        input_tokens=kwargs.get("input_tokens", 10),
        output_tokens=kwargs.get("output_tokens", 5),
        latency_ms=kwargs.get("latency_ms", 100),
    )
    if days_ago:
        Execution.objects.filter(pk=e.pk).update(
            created_at=timezone.now() - timedelta(days=days_ago)
        )
    return e


@pytest.mark.django_db
class TestExecutionStats:
    def test_unauthenticated_returns_401(self, client):
        c = APIClient()
        assert c.get(STATS_URL).status_code == 401

    def test_empty_returns_zero_stats(self, auth_client):
        res = auth_client.get(STATS_URL)
        assert res.status_code == 200
        for window in ("7d", "30d"):
            assert res.data[window]["total_executions"] == 0
            assert res.data[window]["success_rate"] == 0.0
            assert res.data[window]["avg_latency_ms"] is None
            assert res.data[window]["executions_by_day"] == []

    def test_counts_executions_in_window(self, auth_client, prompt):
        make_execution(prompt, days_ago=2)
        make_execution(prompt, days_ago=6)
        make_execution(prompt, days_ago=20)  # outside 7d, inside 30d

        res = auth_client.get(STATS_URL)
        assert res.data["7d"]["total_executions"] == 2
        assert res.data["30d"]["total_executions"] == 3

    def test_success_rate(self, auth_client, prompt):
        make_execution(prompt, status=Execution.Status.SUCCESS, days_ago=1)
        make_execution(prompt, status=Execution.Status.ERROR, days_ago=1)

        res = auth_client.get(STATS_URL)
        assert res.data["7d"]["success_rate"] == 0.5

    def test_avg_latency_only_for_successful(self, auth_client, prompt):
        make_execution(prompt, status=Execution.Status.SUCCESS, latency_ms=200, days_ago=1)
        make_execution(prompt, status=Execution.Status.SUCCESS, latency_ms=400, days_ago=1)
        make_execution(prompt, status=Execution.Status.ERROR, latency_ms=None, days_ago=1)

        res = auth_client.get(STATS_URL)
        assert res.data["7d"]["avg_latency_ms"] == 300

    def test_tokens_by_provider(self, auth_client, prompt):
        make_execution(prompt, provider="groq", input_tokens=10, output_tokens=5, days_ago=1)
        make_execution(prompt, provider="groq", input_tokens=20, output_tokens=10, days_ago=1)
        make_execution(prompt, provider="openrouter", input_tokens=30, output_tokens=15, days_ago=1)

        res = auth_client.get(STATS_URL)
        assert res.data["7d"]["tokens_by_provider"]["groq"] == 45
        assert res.data["7d"]["tokens_by_provider"]["openrouter"] == 45

    def test_executions_by_day_shape(self, auth_client, prompt):
        make_execution(prompt, days_ago=1)
        make_execution(prompt, days_ago=1)
        make_execution(prompt, days_ago=3)

        res = auth_client.get(STATS_URL)
        by_day = res.data["7d"]["executions_by_day"]
        assert len(by_day) == 2
        counts = {row["count"] for row in by_day}
        assert counts == {1, 2}
        for row in by_day:
            assert "date" in row and "count" in row

    def test_user_isolation(self, auth_client, prompt, db):
        other = User.objects.create_user(email="other2@example.com", password="x")
        other_prompt = Prompt.objects.create(user=other, title="O", content="c")
        make_execution(other_prompt, days_ago=1)

        res = auth_client.get(STATS_URL)
        assert res.data["7d"]["total_executions"] == 0
