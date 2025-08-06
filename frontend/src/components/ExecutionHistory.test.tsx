import { render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("../api/executions");

import { executionsApi } from "../api/executions";
import ExecutionHistory from "./ExecutionHistory";

const mockedApi = vi.mocked(executionsApi);

const makeExecution = (overrides = {}) => ({
  id: 1,
  prompt: 1,
  provider: "groq" as const,
  model: "llama3-8b-8192",
  status: "success" as const,
  result_text: "The answer to everything.",
  input_tokens: 5,
  output_tokens: 10,
  latency_ms: 200,
  created_at: new Date().toISOString(),
  ...overrides,
});

beforeEach(() => vi.clearAllMocks());

const renderHistory = (refreshTick = 0) =>
  render(<ExecutionHistory promptId={1} refreshTick={refreshTick} />);

describe("ExecutionHistory", () => {
  it("shows loading state on mount", () => {
    mockedApi.list.mockReturnValue(new Promise(() => {}) as never);
    renderHistory();
    expect(screen.getByText(/loading history/i)).toBeInTheDocument();
  });

  it("renders a row per execution after load", async () => {
    mockedApi.list.mockResolvedValue({
      data: [makeExecution({ id: 1 }), makeExecution({ id: 2 })],
    } as never);
    renderHistory();
    await waitFor(() => expect(screen.getByText("Execution History")).toBeInTheDocument());
    expect(screen.getAllByText(/groq \/ llama3-8b-8192/i)).toHaveLength(2);
  });

  it("shows empty state when no executions", async () => {
    mockedApi.list.mockResolvedValue({ data: [] } as never);
    renderHistory();
    await waitFor(() => expect(screen.getByText(/no executions yet/i)).toBeInTheDocument());
  });

  it("shows error message when API call fails", async () => {
    mockedApi.list.mockRejectedValue(new Error("Network error"));
    renderHistory();
    await waitFor(() =>
      expect(screen.getByText(/failed to load execution history/i)).toBeInTheDocument()
    );
  });

  it("shows success badge for success execution", async () => {
    mockedApi.list.mockResolvedValue({ data: [makeExecution()] } as never);
    renderHistory();
    await waitFor(() => expect(screen.getByText("success")).toBeInTheDocument());
  });

  it("shows error badge for error execution", async () => {
    mockedApi.list.mockResolvedValue({
      data: [makeExecution({ status: "error", input_tokens: null, output_tokens: null, latency_ms: null })],
    } as never);
    renderHistory();
    await waitFor(() => expect(screen.getByText("error")).toBeInTheDocument());
  });

  it("shows latency and tokens for success rows", async () => {
    mockedApi.list.mockResolvedValue({ data: [makeExecution()] } as never);
    renderHistory();
    await waitFor(() => screen.getByText("200ms"));
    expect(screen.getByText("5 in / 10 out tokens")).toBeInTheDocument();
  });

  it("does not show latency or tokens for error rows", async () => {
    mockedApi.list.mockResolvedValue({
      data: [makeExecution({ status: "error", latency_ms: null, input_tokens: null, output_tokens: null })],
    } as never);
    renderHistory();
    await waitFor(() => screen.getByText("error"));
    expect(screen.queryByText(/ms/)).not.toBeInTheDocument();
    expect(screen.queryByText(/tokens/)).not.toBeInTheDocument();
  });

  it("shows truncated result_text snippet for long text", async () => {
    const longText = "a".repeat(200);
    mockedApi.list.mockResolvedValue({ data: [makeExecution({ result_text: longText })] } as never);
    renderHistory();
    await waitFor(() => screen.getByText("Execution History"));
    expect(screen.getByText(/a{120}…/)).toBeInTheDocument();
  });

  it("re-fetches when refreshTick changes", async () => {
    mockedApi.list.mockResolvedValue({ data: [makeExecution()] } as never);
    const { rerender } = render(<ExecutionHistory promptId={1} refreshTick={0} />);
    await waitFor(() => expect(mockedApi.list).toHaveBeenCalledTimes(1));
    rerender(<ExecutionHistory promptId={1} refreshTick={1} />);
    await waitFor(() => expect(mockedApi.list).toHaveBeenCalledTimes(2));
  });
});
