from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import PromptViewSet

router = DefaultRouter()
router.register("prompts", PromptViewSet, basename="prompt")

urlpatterns = [path("", include(router.urls))]
