from django.urls import path

from .views import ExecutionListCreateView, execution_stats

urlpatterns = [
    path("executions/", ExecutionListCreateView.as_view(), name="execution-list-create"),
    path("executions/stats/", execution_stats, name="execution-stats"),
]
