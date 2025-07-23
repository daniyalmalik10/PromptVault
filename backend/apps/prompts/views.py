from rest_framework import filters, viewsets

from .models import Prompt
from .serializers import PromptSerializer


class PromptViewSet(viewsets.ModelViewSet):
    serializer_class = PromptSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ["title", "content"]

    def get_queryset(self):
        return Prompt.objects.filter(user=self.request.user)

    def perform_create(self, serializer: PromptSerializer) -> None:
        serializer.save(user=self.request.user)
