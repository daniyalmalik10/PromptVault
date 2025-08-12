import time

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .registry import registry

_cache: list = []
_cache_ts: float = 0.0
_CACHE_TTL = 60.0
_CANARY = "Reply with the single word: ok"
_CANARY_MODELS = {"groq": "llama3-8b-8192", "openrouter": "openai/gpt-4o-mini"}


@api_view(["GET"])
@permission_classes([AllowAny])
def provider_health_check(request):
    global _cache, _cache_ts
    now = time.monotonic()
    if _cache and (now - _cache_ts) < _CACHE_TTL:
        return Response(_cache)

    results = []
    for name in registry.names():
        model = _CANARY_MODELS.get(name, "llama3-8b-8192")
        try:
            result = registry.get(name).complete(_CANARY, model, max_tokens=5, timeout=5.0)
            results.append({"provider": name, "status": "ok", "latency_ms": result.latency_ms})
        except Exception:
            results.append({"provider": name, "status": "error", "latency_ms": None})

    _cache = results
    _cache_ts = now
    return Response(results)
