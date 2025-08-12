import api from "./client";

export interface ProviderHealth {
  provider: string;
  status: "ok" | "error";
  latency_ms: number | null;
}

export const providersApi = {
  health: () => api.get<ProviderHealth[]>("/providers/health/").then((r) => r.data),
};
