from rest_framework import serializers

from .models import Prompt


class PromptSerializer(serializers.ModelSerializer):
    class Meta:
        model = Prompt
        fields = ["id", "title", "content", "tags", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_tags(self, value: list) -> list:
        if not isinstance(value, list):
            raise serializers.ValidationError("tags must be a list.")
        return value
