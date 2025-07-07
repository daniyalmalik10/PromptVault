import pytest
from django.contrib.auth import get_user_model

User = get_user_model()


@pytest.mark.django_db
def test_create_user():
    user = User.objects.create_user(email="test@example.com", password="secret")
    assert user.email == "test@example.com"
    assert user.check_password("secret")
    assert not user.is_staff


@pytest.mark.django_db
def test_email_is_username_field():
    assert User.USERNAME_FIELD == "email"


@pytest.mark.django_db
def test_create_superuser():
    su = User.objects.create_superuser(email="admin@example.com", password="secret")
    assert su.is_staff
    assert su.is_superuser
