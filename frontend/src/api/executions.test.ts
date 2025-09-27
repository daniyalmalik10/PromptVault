import { vi } from "vitest";

vi.mock("./client", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

import apiClient from "./client";
import { executionsApi } from "./executions";

const mockGet = vi.mocked(apiClient.get);
const mockPost = vi.mocked(apiClient.post);

beforeEach(() => vi.clearAllMocks());

describe("executionsApi", () => {
  it("list calls GET /executions/ with no params by default", () => {
    executionsApi.list();
    expect(mockGet).toHaveBeenCalledWith("/executions/", { params: undefined });
  });

  it("list passes prompt_id param", () => {
    executionsApi.list({ prompt_id: 42 });
    expect(mockGet).toHaveBeenCalledWith("/executions/", { params: { prompt_id: 42 } });
  });

  it("create calls POST /executions/ with full payload", () => {
    const payload = { prompt_id: 1, provider: "groq" as const, model: "llama-3.1-8b-instant" };
    executionsApi.create(payload);
    expect(mockPost).toHaveBeenCalledWith("/executions/", payload);
  });
});
