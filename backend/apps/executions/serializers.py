from rest_framework import serializers

from .models import Execution


class ExecutionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Execution
        fields = [
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
        ]
        read_only_fields = [
            "id",
            "status",
            "result_text",
            "input_tokens",
            "output_tokens",
            "latency_ms",
            "created_at",
        ]


class ExecutionCreateSerializer(serializers.Serializer):
    prompt_id = serializers.IntegerField()
    provider = serializers.ChoiceField(choices=Execution.Provider.choices)
    model = serializers.CharField(max_length=100)
