from django.urls import path

from .views import ExecutionListCreateView

urlpatterns = [
    path("executions/", ExecutionListCreateView.as_view(), name="execution-list-create"),
]
