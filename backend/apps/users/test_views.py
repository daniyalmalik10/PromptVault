import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def auth_client(client, user):
    client.force_authenticate(user=user)
    return client


# ---------------------------------------------------------------------------
# Register endpoint
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestRegisterView:
    url = "/api/auth/register/"

    def test_register_success(self, client):
        resp = client.post(self.url, {"email": "new@example.com", "password": "strongpass"})
        assert resp.status_code == 201
        data = resp.json()
        assert data["email"] == "new@example.com"
        assert "password" not in data
        assert User.objects.filter(email="new@example.com").exists()

    def test_register_duplicate_email(self, client, user):
        resp = client.post(self.url, {"email": user.email, "password": "strongpass"})
        assert resp.status_code == 400
        assert "email" in resp.json()

    def test_register_missing_email(self, client):
        resp = client.post(self.url, {"password": "strongpass"})
        assert resp.status_code == 400

    def test_register_missing_password(self, client):
        resp = client.post(self.url, {"email": "new@example.com"})
        assert resp.status_code == 400

    def test_register_short_password(self, client):
        resp = client.post(self.url, {"email": "new@example.com", "password": "short"})
        assert resp.status_code == 400

    def test_register_invalid_email(self, client):
        resp = client.post(self.url, {"email": "notanemail", "password": "strongpass"})
        assert resp.status_code == 400


# ---------------------------------------------------------------------------
# Me endpoint
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestMeView:
    url = "/api/auth/me/"

    def test_me_returns_user_info(self, auth_client, user):
        resp = auth_client.get(self.url)
        assert resp.status_code == 200
        data = resp.json()
        assert data["email"] == user.email
        assert "password" not in data
        assert "id" in data
        assert "is_staff" in data
        assert "date_joined" in data

    def test_me_unauthenticated(self, client):
        resp = client.get(self.url)
        assert resp.status_code == 401

    def test_me_invalid_token(self, client):
        client.credentials(HTTP_AUTHORIZATION="Bearer invalidtoken")
        resp = client.get(self.url)
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# Token endpoint smoke test
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestTokenView:
    url = "/api/auth/token/"

    def test_token_returns_access_and_refresh(self, client, user):
        resp = client.post(self.url, {"email": user.email, "password": "testpass123"})
        assert resp.status_code == 200
        data = resp.json()
        assert "access" in data
        assert "refresh" in data

    def test_token_wrong_password(self, client, user):
        resp = client.post(self.url, {"email": user.email, "password": "wrongpass"})
        assert resp.status_code == 401
