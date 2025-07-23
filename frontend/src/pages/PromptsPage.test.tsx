import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";

const mockSetSearch = vi.fn();
const mockSetPage = vi.fn();
const mockUsePrompts = vi.fn();

vi.mock("../hooks/usePrompts", () => ({
  usePrompts: () => mockUsePrompts(),
}));

import PromptsPage from "./PromptsPage";

const defaultData = {
  count: 2,
  next: null,
  previous: null,
  results: [
    {
      id: 1,
      title: "Alpha",
      content: "Content A",
      tags: ["ai"],
      created_at: "",
      updated_at: new Date().toISOString(),
    },
    {
      id: 2,
      title: "Beta",
      content: "Content B",
      tags: ["test"],
      created_at: "",
      updated_at: new Date().toISOString(),
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockUsePrompts.mockReturnValue({
    data: defaultData,
    isLoading: false,
    error: null,
    page: 1,
    setPage: mockSetPage,
    search: "",
    setSearch: mockSetSearch,
    refetch: vi.fn(),
  });
});

const renderPage = () =>
  render(
    <MemoryRouter>
      <PromptsPage />
    </MemoryRouter>
  );

describe("PromptsPage", () => {
  it("renders list of prompts", () => {
    renderPage();
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
  });

  it("renders new prompt link", () => {
    renderPage();
    expect(screen.getByRole("link", { name: /new prompt/i })).toBeInTheDocument();
  });

  it("renders tag filter badges", () => {
    renderPage();
    expect(screen.getByRole("button", { name: "ai" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "test" })).toBeInTheDocument();
  });

  it("clicking a tag filters the displayed prompts", async () => {
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: "ai" }));
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.queryByText("Beta")).not.toBeInTheDocument();
  });

  it("hides pagination when no next/previous", () => {
    renderPage();
    expect(screen.queryByRole("button", { name: /previous/i })).not.toBeInTheDocument();
  });

  it("shows loading text", () => {
    mockUsePrompts.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
      page: 1,
      setPage: vi.fn(),
      search: "",
      setSearch: vi.fn(),
      refetch: vi.fn(),
    });
    renderPage();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("shows error text", () => {
    mockUsePrompts.mockReturnValue({
      data: null,
      isLoading: false,
      error: "Failed to load prompts.",
      page: 1,
      setPage: vi.fn(),
      search: "",
      setSearch: vi.fn(),
      refetch: vi.fn(),
    });
    renderPage();
    expect(screen.getByText("Failed to load prompts.")).toBeInTheDocument();
  });

  it("shows pagination when next is present", () => {
    mockUsePrompts.mockReturnValue({
      data: { ...defaultData, next: "http://api/prompts/?page=2" },
      isLoading: false,
      error: null,
      page: 1,
      setPage: mockSetPage,
      search: "",
      setSearch: mockSetSearch,
      refetch: vi.fn(),
    });
    renderPage();
    expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /previous/i })).toBeInTheDocument();
  });
});
