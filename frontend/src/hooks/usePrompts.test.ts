import { act, renderHook, waitFor } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("../api/prompts");

import { promptsApi } from "../api/prompts";
import { usePrompts } from "./usePrompts";

const mockedPromptsApi = vi.mocked(promptsApi);

const makePage = (count = 1) => ({
  data: {
    count,
    next: null,
    previous: null,
    results: [{ id: 1, title: "T", content: "C", tags: [], created_at: "", updated_at: "" }],
  },
});

beforeEach(() => vi.clearAllMocks());

describe("usePrompts", () => {
  it("starts in loading state", () => {
    mockedPromptsApi.list.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => usePrompts());
    expect(result.current.isLoading).toBe(true);
  });

  it("populates data when API resolves", async () => {
    mockedPromptsApi.list.mockResolvedValue(makePage(1) as never);
    const { result } = renderHook(() => usePrompts());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data?.count).toBe(1);
  });

  it("sets error when API rejects", async () => {
    mockedPromptsApi.list.mockRejectedValue(new Error("fail"));
    const { result } = renderHook(() => usePrompts());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe("Failed to load prompts.");
  });

  it("refetches when page changes", async () => {
    mockedPromptsApi.list.mockResolvedValue(makePage(1) as never);
    const { result } = renderHook(() => usePrompts());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.setPage(2));
    await waitFor(() => expect(mockedPromptsApi.list).toHaveBeenCalledTimes(2));
    expect(mockedPromptsApi.list).toHaveBeenLastCalledWith({ page: 2, search: undefined });
  });

  it("refetches when search changes", async () => {
    mockedPromptsApi.list.mockResolvedValue(makePage(1) as never);
    const { result } = renderHook(() => usePrompts());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.setSearch("needle"));
    await waitFor(() => expect(mockedPromptsApi.list).toHaveBeenCalledTimes(2));
    expect(mockedPromptsApi.list).toHaveBeenLastCalledWith({ page: 1, search: "needle" });
  });
});
