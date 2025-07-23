import pytest
from django.contrib.auth import get_user_model

from .models import Prompt

User = get_user_model()


@pytest.mark.django_db
def test_prompt_str(prompt):
    assert str(prompt) == "My Prompt"


@pytest.mark.django_db
def test_prompt_default_tags(user):
    p = Prompt.objects.create(user=user, title="No Tags", content="content")
    assert p.tags == []


@pytest.mark.django_db
def test_prompt_belongs_to_user(prompt, user):
    assert prompt.user == user


@pytest.mark.django_db
def test_prompt_ordering(user):
    p1 = Prompt.objects.create(user=user, title="First", content="a")
    p2 = Prompt.objects.create(user=user, title="Second", content="b")
    # Touch p1 so its updated_at is newer
    p1.title = "First Updated"
    p1.save()
    prompts = list(Prompt.objects.all())
    assert prompts[0] == p1
    assert prompts[1] == p2
