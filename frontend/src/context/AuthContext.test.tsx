import { renderHook, act, waitFor } from "@testing-library/react";
import { ReactNode } from "react";
import { vi } from "vitest";
import { authApi } from "../api/auth";
import { AuthProvider, useAuth } from "./AuthContext";

vi.mock("../api/auth");

const mockedAuthApi = vi.mocked(authApi);

const wrapper = ({ children }: { children: ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

const mockUser = { id: 1, email: "test@example.com", is_staff: false, date_joined: "" };
const mockTokens = { access: "acc", refresh: "ref" };

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe("AuthContext", () => {
  it("starts unauthenticated when no token in storage", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it("restores session when valid token exists in localStorage", async () => {
    localStorage.setItem("access_token", "valid");
    mockedAuthApi.me.mockResolvedValue({ data: mockUser } as never);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.email).toBe(mockUser.email);
  });

  it("clears session when me() fails", async () => {
    localStorage.setItem("access_token", "expired");
    mockedAuthApi.me.mockRejectedValue(new Error("401"));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAuthenticated).toBe(false);
    expect(localStorage.getItem("access_token")).toBeNull();
  });

  it("login stores tokens and sets user", async () => {
    mockedAuthApi.login.mockResolvedValue({ data: mockTokens } as never);
    mockedAuthApi.me.mockResolvedValue({ data: mockUser } as never);

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.login("test@example.com", "pass");
    });

    expect(localStorage.getItem("access_token")).toBe("acc");
    expect(localStorage.getItem("refresh_token")).toBe("ref");
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.email).toBe(mockUser.email);
  });

  it("logout clears tokens and user", async () => {
    localStorage.setItem("access_token", "acc");
    localStorage.setItem("refresh_token", "ref");
    mockedAuthApi.me.mockResolvedValue({ data: mockUser } as never);

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

    act(() => result.current.logout());

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(localStorage.getItem("access_token")).toBeNull();
    expect(localStorage.getItem("refresh_token")).toBeNull();
  });
});
