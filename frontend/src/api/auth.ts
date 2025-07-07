import apiClient from "./client";

export interface TokenResponse {
  access: string;
  refresh: string;
}

export interface UserInfo {
  id: number;
  email: string;
  is_staff: boolean;
  date_joined: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
}

export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post<TokenResponse>("/auth/token/", { email, password }),

  register: (payload: RegisterPayload) =>
    apiClient.post<UserInfo>("/auth/register/", payload),

  me: () => apiClient.get<UserInfo>("/auth/me/"),
};
