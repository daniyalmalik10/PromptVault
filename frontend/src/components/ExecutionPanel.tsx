import { useEffect, useState } from "react";
import {
  type Execution,
  type ProviderName,
  executionsApi,
} from "../api/executions";

interface Props {
  promptId: number;
  onExecutionComplete: () => void;
}

const DEFAULT_MODELS: Record<ProviderName, string> = {
  groq: "llama-3.1-8b-instant",
  openrouter: "openai/gpt-4o-mini",
};

export default function ExecutionPanel({ promptId, onExecutionComplete }: Props) {
  const [provider, setProvider] = useState<ProviderName>("groq");
  const [model, setModel] = useState(DEFAULT_MODELS.groq);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<Execution | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setModel(DEFAULT_MODELS[provider]);
  }, [provider]);

  const handleRun = async () => {
    setIsRunning(true);
    setError(null);
    setResult(null);
    try {
      const res = await executionsApi.create({ prompt_id: promptId, provider, model });
      setResult(res.data);
      onExecutionComplete();
    } catch {
      setError("Failed to reach the server. Please try again.");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="mt-6 bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-base font-semibold text-gray-900 mb-4">Run Prompt</h2>

      <div className="flex gap-3 items-end mb-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Provider</label>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value as ProviderName)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="groq">Groq</option>
            <option value="openrouter">OpenRouter</option>
          </select>
        </div>

        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-700 mb-1">Model</label>
          <input
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <button
          onClick={handleRun}
          disabled={isRunning}
          className="px-4 py-2 text-sm rounded-md bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          {isRunning ? "Running…" : "Run"}
        </button>
      </div>

      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

      {result && (
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span
              className={
                result.status === "success"
                  ? "text-green-600 text-xs font-medium"
                  : "text-red-600 text-xs font-medium"
              }
            >
              {result.status === "success" ? "Success" : "Error"}
            </span>
            {result.status === "success" && result.latency_ms != null && (
              <span className="text-gray-400 text-xs">{result.latency_ms}ms</span>
            )}
            {result.status === "success" &&
              result.input_tokens != null &&
              result.output_tokens != null && (
                <span className="text-gray-400 text-xs">
                  {result.input_tokens} in / {result.output_tokens} out tokens
                </span>
              )}
          </div>
          <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono bg-gray-50 rounded p-4">
            {result.result_text}
          </pre>
        </div>
      )}
    </div>
  );
}
