import pytest
from django.contrib.auth import get_user_model

from apps.executions.models import Execution
from apps.prompts.models import Prompt

User = get_user_model()


@pytest.mark.django_db
class TestExecutionStr:
    def test_str_format(self):
        user = User.objects.create_user(email="str@example.com", password="pass")
        prompt = Prompt.objects.create(user=user, title="T", content="C")
        execution = Execution.objects.create(
            prompt=prompt,
            provider="groq",
            model="llama3-8b-8192",
            status=Execution.Status.SUCCESS,
            result_text="ok",
        )
        assert str(execution) == f"Execution(groq/llama3-8b-8192) on Prompt({prompt.pk})"
