import apiClient from "./client";

export type ExecutionStatus = "pending" | "success" | "error";
export type ProviderName = "groq" | "openrouter";

export interface Execution {
  id: number;
  prompt: number;
  provider: ProviderName;
  model: string;
  status: ExecutionStatus;
  result_text: string;
  input_tokens: number | null;
  output_tokens: number | null;
  latency_ms: number | null;
  created_at: string;
}

export interface ExecutionCreatePayload {
  prompt_id: number;
  provider: ProviderName;
  model: string;
}

export interface DayCount {
  date: string;
  count: number;
}

export interface WindowStats {
  total_executions: number;
  success_rate: number;
  avg_latency_ms: number | null;
  tokens_by_provider: Record<string, number>;
  executions_by_day: DayCount[];
}

export interface ExecutionStats {
  "7d": WindowStats;
  "30d": WindowStats;
}

export const executionsApi = {
  list: (params?: { prompt_id?: number }) =>
    apiClient.get<Execution[]>("/executions/", { params }),

  create: (payload: ExecutionCreatePayload) =>
    apiClient.post<Execution>("/executions/", payload),

  stats: () => apiClient.get<ExecutionStats>("/executions/stats/").then((r) => r.data),
};
