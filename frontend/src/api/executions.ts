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

export const executionsApi = {
  list: (params?: { prompt_id?: number }) =>
    apiClient.get<Execution[]>("/executions/", { params }),

  create: (payload: ExecutionCreatePayload) =>
    apiClient.post<Execution>("/executions/", payload),
};
