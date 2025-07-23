import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: "1" }),
  };
});

vi.mock("../api/prompts");

import { promptsApi } from "../api/prompts";
import PromptDetailPage from "./PromptDetailPage";

const mockedPromptsApi = vi.mocked(promptsApi);

const mockPrompt = {
  id: 1,
  title: "Test Prompt",
  content: "Do something useful.",
  tags: ["ai", "test"],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockedPromptsApi.get.mockResolvedValue({ data: mockPrompt } as never);
});

const renderPage = () =>
  render(
    <MemoryRouter>
      <PromptDetailPage />
    </MemoryRouter>
  );

describe("PromptDetailPage", () => {
  it("renders prompt title and content", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Test Prompt")).toBeInTheDocument());
    expect(screen.getByText("Do something useful.")).toBeInTheDocument();
  });

  it("renders tags", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("ai")).toBeInTheDocument());
    expect(screen.getByText("test")).toBeInTheDocument();
  });

  it("clicking Edit shows the edit form", async () => {
    renderPage();
    await waitFor(() => screen.getByText("Test Prompt"));
    await userEvent.click(screen.getByRole("button", { name: /edit/i }));
    expect(screen.getByDisplayValue("Test Prompt")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Do something useful.")).toBeInTheDocument();
  });

  it("clicking Cancel reverts to view mode", async () => {
    renderPage();
    await waitFor(() => screen.getByText("Test Prompt"));
    await userEvent.click(screen.getByRole("button", { name: /edit/i }));
    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(screen.getByText("Test Prompt")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("Test Prompt")).not.toBeInTheDocument();
  });

  it("Save calls promptsApi.update", async () => {
    mockedPromptsApi.update.mockResolvedValue({
      data: { ...mockPrompt, title: "Updated" },
    } as never);
    renderPage();
    await waitFor(() => screen.getByText("Test Prompt"));
    await userEvent.click(screen.getByRole("button", { name: /edit/i }));

    const titleInput = screen.getByLabelText("Title");
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, "Updated");
    await userEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() =>
      expect(mockedPromptsApi.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ title: "Updated" })
      )
    );
  });

  it("Delete button shows confirm state, confirm calls remove and navigates", async () => {
    mockedPromptsApi.remove.mockResolvedValue({} as never);
    renderPage();
    await waitFor(() => screen.getByText("Test Prompt"));

    await userEvent.click(screen.getByRole("button", { name: /delete/i }));
    expect(screen.getByText(/delete\?/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /confirm/i }));
    await waitFor(() => expect(mockedPromptsApi.remove).toHaveBeenCalledWith(1));
    expect(mockNavigate).toHaveBeenCalledWith("/prompts");
  });

  it("Cancel on delete confirm reverts to view mode", async () => {
    renderPage();
    await waitFor(() => screen.getByText("Test Prompt"));
    await userEvent.click(screen.getByRole("button", { name: /delete/i }));
    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(screen.queryByText(/delete\?/i)).not.toBeInTheDocument();
  });
});
