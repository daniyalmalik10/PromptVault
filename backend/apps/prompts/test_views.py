from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from .models import Prompt

User = get_user_model()

PROMPTS_URL = "/api/prompts/"


def detail_url(pk: int) -> str:
    return f"/api/prompts/{pk}/"


class TestPromptList:
    def test_list_returns_only_own_prompts(self, auth_client, user, other_user):
        Prompt.objects.create(user=user, title="Mine", content="a")
        Prompt.objects.create(user=other_user, title="Theirs", content="b")
        res = auth_client.get(PROMPTS_URL)
        assert res.status_code == 200
        assert res.data["count"] == 1
        assert res.data["results"][0]["title"] == "Mine"

    def test_list_unauthenticated_returns_401(self, client):
        res = client.get(PROMPTS_URL)
        assert res.status_code == 401

    def test_list_paginated(self, auth_client, user):
        for i in range(25):
            Prompt.objects.create(user=user, title=f"Prompt {i}", content="x")
        res = auth_client.get(PROMPTS_URL)
        assert res.status_code == 200
        assert res.data["count"] == 25
        assert len(res.data["results"]) == 20
        assert res.data["next"] is not None


class TestPromptCreate:
    def test_create_success(self, auth_client):
        res = auth_client.post(
            PROMPTS_URL,
            {"title": "New", "content": "Body", "tags": ["foo"]},
            format="json",
        )
        assert res.status_code == 201
        assert res.data["id"] is not None
        assert "user" not in res.data

    def test_create_sets_user_from_request(self, auth_client, user):
        auth_client.post(PROMPTS_URL, {"title": "New", "content": "Body"}, format="json")
        assert Prompt.objects.filter(user=user, title="New").exists()

    def test_create_missing_title_returns_400(self, auth_client):
        res = auth_client.post(PROMPTS_URL, {"content": "Body"}, format="json")
        assert res.status_code == 400

    def test_create_missing_content_returns_400(self, auth_client):
        res = auth_client.post(PROMPTS_URL, {"title": "T"}, format="json")
        assert res.status_code == 400

    def test_create_default_tags_is_empty_list(self, auth_client):
        res = auth_client.post(PROMPTS_URL, {"title": "T", "content": "C"}, format="json")
        assert res.status_code == 201
        assert res.data["tags"] == []

    def test_create_unauthenticated_returns_401(self, client):
        res = client.post(PROMPTS_URL, {"title": "T", "content": "C"}, format="json")
        assert res.status_code == 401


class TestPromptRetrieve:
    def test_retrieve_own_prompt_returns_200(self, auth_client, prompt):
        res = auth_client.get(detail_url(prompt.pk))
        assert res.status_code == 200

    def test_retrieve_returns_all_fields(self, auth_client, prompt):
        res = auth_client.get(detail_url(prompt.pk))
        for field in ["id", "title", "content", "tags", "created_at", "updated_at"]:
            assert field in res.data
        assert "user" not in res.data

    def test_retrieve_other_user_prompt_returns_404(self, auth_client, other_user):
        other = Prompt.objects.create(user=other_user, title="Theirs", content="x")
        res = auth_client.get(detail_url(other.pk))
        assert res.status_code == 404


class TestPromptUpdate:
    def test_partial_update_title(self, auth_client, prompt):
        res = auth_client.patch(detail_url(prompt.pk), {"title": "Updated"}, format="json")
        assert res.status_code == 200
        assert res.data["title"] == "Updated"

    def test_partial_update_tags(self, auth_client, prompt):
        res = auth_client.patch(detail_url(prompt.pk), {"tags": ["new"]}, format="json")
        assert res.status_code == 200
        assert res.data["tags"] == ["new"]

    def test_update_other_user_prompt_returns_404(self, auth_client, other_user):
        other = Prompt.objects.create(user=other_user, title="Theirs", content="x")
        res = auth_client.patch(detail_url(other.pk), {"title": "Hacked"}, format="json")
        assert res.status_code == 404

    def test_update_unauthenticated_returns_401(self, client, prompt):
        res = client.patch(detail_url(prompt.pk), {"title": "x"}, format="json")
        assert res.status_code == 401


class TestPromptDelete:
    def test_delete_own_prompt_returns_204(self, auth_client, prompt):
        res = auth_client.delete(detail_url(prompt.pk))
        assert res.status_code == 204
        assert not Prompt.objects.filter(pk=prompt.pk).exists()

    def test_delete_other_user_prompt_returns_404(self, auth_client, other_user):
        other = Prompt.objects.create(user=other_user, title="Theirs", content="x")
        res = auth_client.delete(detail_url(other.pk))
        assert res.status_code == 404

    def test_delete_unauthenticated_returns_401(self, client, prompt):
        res = client.delete(detail_url(prompt.pk))
        assert res.status_code == 401


class TestUserIsolation:
    def test_cannot_list_other_users_prompts(self, user, other_user):
        for i in range(3):
            Prompt.objects.create(user=user, title=f"User A {i}", content="x")
        for i in range(2):
            Prompt.objects.create(user=other_user, title=f"User B {i}", content="x")

        client_b = APIClient()
        client_b.force_authenticate(user=other_user)
        res = client_b.get(PROMPTS_URL)
        assert res.data["count"] == 2
        titles = [r["title"] for r in res.data["results"]]
        assert all("User B" in t for t in titles)


class TestSearch:
    def test_search_by_title(self, auth_client, user):
        Prompt.objects.create(user=user, title="needle in title", content="irrelevant")
        Prompt.objects.create(user=user, title="no match", content="irrelevant")
        res = auth_client.get(PROMPTS_URL, {"search": "needle"})
        assert res.data["count"] == 1
        assert res.data["results"][0]["title"] == "needle in title"

    def test_search_by_content(self, auth_client, user):
        Prompt.objects.create(user=user, title="no match", content="needle in content")
        Prompt.objects.create(user=user, title="no match 2", content="irrelevant")
        res = auth_client.get(PROMPTS_URL, {"search": "needle"})
        assert res.data["count"] == 1

    def test_search_scoped_to_own_prompts(self, auth_client, user, other_user):
        Prompt.objects.create(user=user, title="my needle", content="x")
        Prompt.objects.create(user=other_user, title="their needle", content="x")
        res = auth_client.get(PROMPTS_URL, {"search": "needle"})
        assert res.data["count"] == 1
        assert res.data["results"][0]["title"] == "my needle"
