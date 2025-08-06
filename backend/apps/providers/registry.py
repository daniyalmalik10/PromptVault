from .base import LLMProvider
from .groq import GroqProvider
from .openrouter import OpenRouterProvider


class ProviderRegistry:
    def __init__(self) -> None:
        self._providers: dict[str, LLMProvider] = {}

    def register(self, name: str, provider: LLMProvider) -> None:
        self._providers[name] = provider

    def get(self, name: str) -> LLMProvider:
        try:
            return self._providers[name]
        except KeyError:
            raise ValueError(f"Unknown provider: '{name}'. Available: {list(self._providers)}")

    def names(self) -> list[str]:
        return list(self._providers.keys())


registry = ProviderRegistry()
registry.register("groq", GroqProvider())
registry.register("openrouter", OpenRouterProvider())
