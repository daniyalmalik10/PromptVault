import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.prompts.models import Prompt

User = get_user_model()


@pytest.fixture
def user(db):
    return User.objects.create_user(email="owner@example.com", password="testpass123")


@pytest.fixture
def other_user(db):
    return User.objects.create_user(email="other@example.com", password="testpass123")


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def auth_client(client, user):
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def prompt(user):
    return Prompt.objects.create(
        user=user,
        title="My Prompt",
        content="Do something useful.",
        tags=["ai", "test"],
    )
