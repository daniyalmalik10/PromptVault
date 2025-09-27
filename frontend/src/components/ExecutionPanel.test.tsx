import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

vi.mock("../api/executions");

import { executionsApi } from "../api/executions";
import ExecutionPanel from "./ExecutionPanel";

const mockedApi = vi.mocked(executionsApi);

const successExecution = {
  id: 1,
  prompt: 1,
  provider: "groq" as const,
  model: "llama-3.1-8b-instant",
  status: "success" as const,
  result_text: "The answer.",
  input_tokens: 5,
  output_tokens: 10,
  latency_ms: 200,
  created_at: new Date().toISOString(),
};

const errorExecution = {
  ...successExecution,
  id: 2,
  status: "error" as const,
  result_text: "Rate limit exceeded",
  input_tokens: null,
  output_tokens: null,
  latency_ms: null,
};

beforeEach(() => vi.clearAllMocks());

const renderPanel = (onDone = vi.fn()) =>
  render(<ExecutionPanel promptId={1} onExecutionComplete={onDone} />);

describe("ExecutionPanel", () => {
  it("renders provider select, model input, and Run button", () => {
    renderPanel();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /run/i })).toBeInTheDocument();
  });

  it("defaults to groq provider and llama-3.1-8b-instant model", () => {
    renderPanel();
    expect(screen.getByRole("combobox")).toHaveValue("groq");
    expect(screen.getByRole("textbox")).toHaveValue("llama-3.1-8b-instant");
  });

  it("changing provider to openrouter resets model to openai/gpt-4o-mini", async () => {
    renderPanel();
    await userEvent.selectOptions(screen.getByRole("combobox"), "openrouter");
    expect(screen.getByRole("textbox")).toHaveValue("openai/gpt-4o-mini");
  });

  it("clicking Run calls executionsApi.create with correct payload", async () => {
    mockedApi.create.mockResolvedValue({ data: successExecution } as never);
    renderPanel();
    await userEvent.click(screen.getByRole("button", { name: /run/i }));
    await waitFor(() =>
      expect(mockedApi.create).toHaveBeenCalledWith({
        prompt_id: 1,
        provider: "groq",
        model: "llama-3.1-8b-instant",
      })
    );
  });

  it("Run button is disabled and shows Running… while in progress", async () => {
    let resolve!: (v: unknown) => void;
    mockedApi.create.mockReturnValue(new Promise((r) => (resolve = r)) as never);
    renderPanel();
    await userEvent.click(screen.getByRole("button", { name: /run/i }));
    expect(screen.getByRole("button", { name: /running/i })).toBeDisabled();
    resolve({ data: successExecution });
  });

  it("shows success result text and badge after successful execution", async () => {
    mockedApi.create.mockResolvedValue({ data: successExecution } as never);
    renderPanel();
    await userEvent.click(screen.getByRole("button", { name: /run/i }));
    await waitFor(() => expect(screen.getByText("The answer.")).toBeInTheDocument());
    expect(screen.getByText("Success")).toBeInTheDocument();
  });

  it("shows latency and token counts on success", async () => {
    mockedApi.create.mockResolvedValue({ data: successExecution } as never);
    renderPanel();
    await userEvent.click(screen.getByRole("button", { name: /run/i }));
    await waitFor(() => screen.getByText("200ms"));
    expect(screen.getByText("5 in / 10 out tokens")).toBeInTheDocument();
  });

  it("shows Error badge when result status is error", async () => {
    mockedApi.create.mockResolvedValue({ data: errorExecution } as never);
    renderPanel();
    await userEvent.click(screen.getByRole("button", { name: /run/i }));
    await waitFor(() => expect(screen.getByText("Error")).toBeInTheDocument());
    expect(screen.getByText("Rate limit exceeded")).toBeInTheDocument();
  });

  it("shows network error message if create throws", async () => {
    mockedApi.create.mockRejectedValue(new Error("Network error"));
    renderPanel();
    await userEvent.click(screen.getByRole("button", { name: /run/i }));
    await waitFor(() =>
      expect(
        screen.getByText(/failed to reach the server/i)
      ).toBeInTheDocument()
    );
  });

  it("calls onExecutionComplete after successful execution", async () => {
    const onDone = vi.fn();
    mockedApi.create.mockResolvedValue({ data: successExecution } as never);
    renderPanel(onDone);
    await userEvent.click(screen.getByRole("button", { name: /run/i }));
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
  });

  it("calls onExecutionComplete even when execution status is error", async () => {
    const onDone = vi.fn();
    mockedApi.create.mockResolvedValue({ data: errorExecution } as never);
    renderPanel(onDone);
    await userEvent.click(screen.getByRole("button", { name: /run/i }));
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
  });
});
