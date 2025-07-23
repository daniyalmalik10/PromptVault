import apiClient from "./client";

export interface Prompt {
  id: number;
  title: string;
  content: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface PromptPayload {
  title: string;
  content: string;
  tags: string[];
}

export const promptsApi = {
  list: (params?: { search?: string; page?: number }) =>
    apiClient.get<PaginatedResponse<Prompt>>("/prompts/", { params }),

  get: (id: number) => apiClient.get<Prompt>(`/prompts/${id}/`),

  create: (payload: PromptPayload) => apiClient.post<Prompt>("/prompts/", payload),

  update: (id: number, payload: Partial<PromptPayload>) =>
    apiClient.patch<Prompt>(`/prompts/${id}/`, payload),

  remove: (id: number) => apiClient.delete(`/prompts/${id}/`),
};
