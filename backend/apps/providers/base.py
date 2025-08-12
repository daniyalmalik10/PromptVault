from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class CompletionResult:
    text: str
    input_tokens: int
    output_tokens: int
    latency_ms: int


class LLMProvider(ABC):
    @abstractmethod
    def complete(
        self,
        prompt_text: str,
        model: str,
        max_tokens: int = 1024,
        timeout: float = 60.0,
    ) -> CompletionResult: ...
