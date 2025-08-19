from datetime import timedelta

from django.db.models import Avg, Count, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.prompts.models import Prompt
from apps.providers.exceptions import ProviderError
from apps.providers.registry import registry

from .models import Execution
from .serializers import ExecutionCreateSerializer, ExecutionSerializer


class ExecutionListCreateView(APIView):
    def get(self, request: Request) -> Response:
        qs = Execution.objects.filter(prompt__user=request.user).select_related("prompt")
        prompt_id = request.query_params.get("prompt_id")
        if prompt_id is not None:
            try:
                prompt_id_int = int(prompt_id)
            except ValueError:
                return Response(
                    {"prompt_id": "Must be an integer."}, status=status.HTTP_400_BAD_REQUEST
                )
            qs = qs.filter(prompt_id=prompt_id_int)

        serializer = ExecutionSerializer(list(qs), many=True)
        return Response(serializer.data)

    def post(self, request: Request) -> Response:
        serializer = ExecutionCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        prompt_id = serializer.validated_data["prompt_id"]
        provider_name = serializer.validated_data["provider"]
        model = serializer.validated_data["model"]

        prompt = Prompt.objects.filter(id=prompt_id, user=request.user).first()
        if prompt is None:
            return Response({"prompt_id": "Prompt not found."}, status=status.HTTP_404_NOT_FOUND)

        try:
            provider = registry.get(provider_name)
        except ValueError as exc:
            return Response({"provider": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        exec_status = Execution.Status.SUCCESS
        result_text = ""
        input_tokens = None
        output_tokens = None
        latency_ms = None

        try:
            result = provider.complete(prompt_text=prompt.content, model=model)
            result_text = result.text
            input_tokens = result.input_tokens
            output_tokens = result.output_tokens
            latency_ms = result.latency_ms
        except ProviderError as exc:
            exec_status = Execution.Status.ERROR
            result_text = str(exc)
        except Exception as exc:
            exec_status = Execution.Status.ERROR
            result_text = f"Unexpected error: {exc}"

        execution = Execution.objects.create(
            prompt=prompt,
            provider=provider_name,
            model=model,
            status=exec_status,
            result_text=result_text,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            latency_ms=latency_ms,
        )

        response_serializer = ExecutionSerializer(execution)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


def _window_stats(qs, days: int) -> dict:
    since = timezone.now() - timedelta(days=days)
    window = qs.filter(created_at__gte=since)

    total = window.count()
    success_count = window.filter(status=Execution.Status.SUCCESS).count()
    success_rate = round(success_count / total, 4) if total else 0.0

    avg_latency = window.filter(status=Execution.Status.SUCCESS).aggregate(
        avg=Avg("latency_ms")
    )["avg"]

    tokens_by_provider: dict[str, int] = {}
    for provider in Execution.Provider.values:
        agg = window.filter(provider=provider).aggregate(
            input=Sum("input_tokens"), output=Sum("output_tokens")
        )
        tokens_by_provider[provider] = (agg["input"] or 0) + (agg["output"] or 0)

    executions_by_day = [
        {"date": str(row["date"]), "count": row["count"]}
        for row in (
            window.annotate(date=TruncDate("created_at"))
            .values("date")
            .annotate(count=Count("id"))
            .order_by("date")
        )
    ]

    return {
        "total_executions": total,
        "success_rate": success_rate,
        "avg_latency_ms": round(avg_latency) if avg_latency is not None else None,
        "tokens_by_provider": tokens_by_provider,
        "executions_by_day": executions_by_day,
    }


@api_view(["GET"])
def execution_stats(request: Request) -> Response:
    qs = Execution.objects.filter(prompt__user=request.user)
    return Response({"7d": _window_stats(qs, 7), "30d": _window_stats(qs, 30)})
