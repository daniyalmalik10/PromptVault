import { useEffect, useState } from "react";
import { type Execution, executionsApi } from "../api/executions";

interface Props {
  promptId: number;
  refreshTick: number;
}

export default function ExecutionHistory({ promptId, refreshTick }: Props) {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    executionsApi
      .list({ prompt_id: promptId })
      .then((res) => setExecutions(res.data))
      .catch(() => setError("Failed to load execution history."))
      .finally(() => setIsLoading(false));
  }, [promptId, refreshTick]);

  if (isLoading) {
    return <p className="text-gray-400 text-sm mt-4">Loading history…</p>;
  }

  if (error) {
    return <p className="text-red-500 text-sm mt-4">{error}</p>;
  }

  if (executions.length === 0) {
    return (
      <p className="text-gray-400 text-sm mt-4">No executions yet. Run the prompt above.</p>
    );
  }

  return (
    <div className="mt-2 bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-base font-semibold text-gray-900 mb-4">Execution History</h2>
      <div className="space-y-3">
        {executions.slice(0, 10).map((e) => (
          <div key={e.id} className="border border-gray-100 rounded-md p-3">
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <span className="text-xs font-medium text-gray-700 capitalize">
                {e.provider} / {e.model}
              </span>
              <span
                className={
                  e.status === "success"
                    ? "text-green-600 text-xs font-medium"
                    : "text-red-600 text-xs font-medium"
                }
              >
                {e.status}
              </span>
              {e.status === "success" && e.latency_ms != null && (
                <span className="text-gray-400 text-xs">{e.latency_ms}ms</span>
              )}
              {e.status === "success" && e.input_tokens != null && e.output_tokens != null && (
                <span className="text-gray-400 text-xs">
                  {e.input_tokens} in / {e.output_tokens} out tokens
                </span>
              )}
              <span className="text-gray-400 text-xs ml-auto">
                {new Date(e.created_at).toLocaleString()}
              </span>
            </div>
            <p className="text-sm text-gray-600 truncate">
              {e.result_text.length > 120 ? e.result_text.slice(0, 120) + "…" : e.result_text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
