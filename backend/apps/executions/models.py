from django.db import models

from apps.prompts.models import Prompt


class Execution(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        SUCCESS = "success", "Success"
        ERROR = "error", "Error"

    class Provider(models.TextChoices):
        GROQ = "groq", "Groq"
        OPENROUTER = "openrouter", "OpenRouter"

    prompt = models.ForeignKey(Prompt, on_delete=models.CASCADE, related_name="executions")
    provider = models.CharField(max_length=50, choices=Provider.choices)
    model = models.CharField(max_length=100)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    result_text = models.TextField(blank=True, default="")
    input_tokens = models.PositiveIntegerField(null=True, blank=True)
    output_tokens = models.PositiveIntegerField(null=True, blank=True)
    latency_ms = models.PositiveIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Execution({self.provider}/{self.model}) on Prompt({self.prompt_id})"
