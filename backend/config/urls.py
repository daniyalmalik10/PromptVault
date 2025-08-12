from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("apps.users.urls")),
    path("api/", include("apps.prompts.urls")),
    path("api/", include("apps.executions.urls")),
    path("api/", include("apps.providers.urls")),
]
