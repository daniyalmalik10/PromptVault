import pytest
from unittest.mock import MagicMock

from apps.providers.base import LLMProvider
from apps.providers.registry import ProviderRegistry


class TestProviderRegistry:
    def test_register_and_get(self):
        reg = ProviderRegistry()
        mock = MagicMock(spec=LLMProvider)
        reg.register("test", mock)
        assert reg.get("test") is mock

    def test_get_unknown_raises(self):
        reg = ProviderRegistry()
        with pytest.raises(ValueError, match="Unknown provider"):
            reg.get("nonexistent")

    def test_names_returns_keys(self):
        reg = ProviderRegistry()
        reg.register("a", MagicMock(spec=LLMProvider))
        reg.register("b", MagicMock(spec=LLMProvider))
        assert reg.names() == ["a", "b"]

    def test_register_overwrites_existing(self):
        reg = ProviderRegistry()
        first = MagicMock(spec=LLMProvider)
        second = MagicMock(spec=LLMProvider)
        reg.register("p", first)
        reg.register("p", second)
        assert reg.get("p") is second
