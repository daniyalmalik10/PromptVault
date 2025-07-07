import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";

const mockRegister = vi.fn();
const mockNavigate = vi.fn();

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ register: mockRegister }),
}));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => mockNavigate };
});

import RegisterPage from "./RegisterPage";

beforeEach(() => {
  vi.clearAllMocks();
});

const renderPage = () =>
  render(
    <MemoryRouter>
      <RegisterPage />
    </MemoryRouter>
  );

const fillForm = async (email: string, password: string, confirm: string) => {
  await userEvent.type(screen.getByLabelText(/^email/i), email);
  await userEvent.type(screen.getByLabelText(/^password$/i), password);
  await userEvent.type(screen.getByLabelText(/confirm password/i), confirm);
};

describe("RegisterPage", () => {
  it("renders all form fields", () => {
    renderPage();
    expect(screen.getByLabelText(/^email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create account/i })).toBeInTheDocument();
  });

  it("shows error when passwords do not match — no API call", async () => {
    renderPage();
    await fillForm("a@b.com", "password123", "different");
    await userEvent.click(screen.getByRole("button", { name: /create account/i }));

    expect(screen.getByText("Passwords do not match.")).toBeInTheDocument();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it("calls register with email and password on valid submit", async () => {
    mockRegister.mockResolvedValue(undefined);
    renderPage();
    await fillForm("a@b.com", "password123", "password123");
    await userEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() =>
      expect(mockRegister).toHaveBeenCalledWith("a@b.com", "password123")
    );
  });

  it("navigates to / on success", async () => {
    mockRegister.mockResolvedValue(undefined);
    renderPage();
    await fillForm("a@b.com", "password123", "password123");
    await userEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/"));
  });

  it("shows DRF field error for duplicate email", async () => {
    mockRegister.mockRejectedValue({
      response: { data: { email: ["user with this email already exists."] } },
    });
    renderPage();
    await fillForm("dup@b.com", "password123", "password123");
    await userEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() =>
      expect(
        screen.getByText("user with this email already exists.")
      ).toBeInTheDocument()
    );
  });

  it("shows fallback error on unknown failure", async () => {
    mockRegister.mockRejectedValue({});
    renderPage();
    await fillForm("a@b.com", "password123", "password123");
    await userEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() =>
      expect(
        screen.getByText("Registration failed. Please try again.")
      ).toBeInTheDocument()
    );
  });
});
