import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("../api/prompts");

import { promptsApi } from "../api/prompts";
import PromptNewPage from "./PromptNewPage";

const mockedPromptsApi = vi.mocked(promptsApi);

beforeEach(() => vi.clearAllMocks());

const renderPage = () =>
  render(
    <MemoryRouter>
      <PromptNewPage />
    </MemoryRouter>
  );

describe("PromptNewPage", () => {
  it("renders title, content and tags fields", () => {
    renderPage();
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/content/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/tags/i)).toBeInTheDocument();
  });

  it("submits with correct payload (tags parsed from comma string)", async () => {
    mockedPromptsApi.create.mockResolvedValue({ data: {} } as never);
    renderPage();

    await userEvent.type(screen.getByLabelText(/title/i), "My Prompt");
    await userEvent.type(screen.getByLabelText(/content/i), "Do something.");
    await userEvent.type(screen.getByLabelText(/tags/i), "ai, coding");
    await userEvent.click(screen.getByRole("button", { name: /create prompt/i }));

    await waitFor(() =>
      expect(mockedPromptsApi.create).toHaveBeenCalledWith({
        title: "My Prompt",
        content: "Do something.",
        tags: ["ai", "coding"],
      })
    );
  });

  it("navigates to /prompts on success", async () => {
    mockedPromptsApi.create.mockResolvedValue({ data: {} } as never);
    renderPage();

    await userEvent.type(screen.getByLabelText(/title/i), "T");
    await userEvent.type(screen.getByLabelText(/content/i), "C");
    await userEvent.click(screen.getByRole("button", { name: /create prompt/i }));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/prompts"));
  });

  it("shows error on API failure", async () => {
    mockedPromptsApi.create.mockRejectedValue({
      response: { data: { title: ["Title too long."] } },
    });
    renderPage();

    await userEvent.type(screen.getByLabelText(/title/i), "T");
    await userEvent.type(screen.getByLabelText(/content/i), "C");
    await userEvent.click(screen.getByRole("button", { name: /create prompt/i }));

    await waitFor(() =>
      expect(screen.getByText("Title too long.")).toBeInTheDocument()
    );
  });
});
