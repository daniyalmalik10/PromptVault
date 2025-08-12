from django.urls import path

from .views import provider_health_check

urlpatterns = [
    path("providers/health/", provider_health_check),
]
