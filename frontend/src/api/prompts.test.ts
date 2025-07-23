import { vi } from "vitest";

vi.mock("./client", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import apiClient from "./client";
import { promptsApi } from "./prompts";

const mockGet = vi.mocked(apiClient.get);
const mockPost = vi.mocked(apiClient.post);
const mockPatch = vi.mocked(apiClient.patch);
const mockDelete = vi.mocked(apiClient.delete);

beforeEach(() => vi.clearAllMocks());

describe("promptsApi", () => {
  it("list calls GET /prompts/ with no params by default", () => {
    promptsApi.list();
    expect(mockGet).toHaveBeenCalledWith("/prompts/", { params: undefined });
  });

  it("list passes search and page params", () => {
    promptsApi.list({ search: "needle", page: 2 });
    expect(mockGet).toHaveBeenCalledWith("/prompts/", {
      params: { search: "needle", page: 2 },
    });
  });

  it("get calls GET /prompts/:id/", () => {
    promptsApi.get(5);
    expect(mockGet).toHaveBeenCalledWith("/prompts/5/");
  });

  it("create calls POST /prompts/ with payload", () => {
    const payload = { title: "T", content: "C", tags: ["a"] };
    promptsApi.create(payload);
    expect(mockPost).toHaveBeenCalledWith("/prompts/", payload);
  });

  it("update calls PATCH /prompts/:id/ with partial payload", () => {
    promptsApi.update(3, { title: "New" });
    expect(mockPatch).toHaveBeenCalledWith("/prompts/3/", { title: "New" });
  });

  it("remove calls DELETE /prompts/:id/", () => {
    promptsApi.remove(7);
    expect(mockDelete).toHaveBeenCalledWith("/prompts/7/");
  });
});
