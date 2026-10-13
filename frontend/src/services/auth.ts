import axios from "axios";
import type { AuthFormValues, AuthMode, AuthResponse, AuthUser } from "../types";
import { api } from "./http";

function authorization(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export async function getCurrentUser(token: string, signal: AbortSignal): Promise<AuthUser> {
  const response = await api.get<AuthUser>("/auth/me", { signal, headers: authorization(token) });
  return response.data;
}

export async function authenticate(mode: AuthMode, values: AuthFormValues): Promise<AuthResponse> {
  const body = mode === "register"
    ? { display_name: values.name.trim(), email: values.email.trim(), password: values.password }
    : { email: values.email.trim(), password: values.password };
  const response = await api.post<AuthResponse>(`/auth/${mode}`, body);
  return response.data;
}

export async function revokeSession(token: string): Promise<void> {
  await api.post("/auth/logout", undefined, { headers: authorization(token) });
}

export function isUnauthorized(error: unknown): boolean {
  return axios.isAxiosError<unknown>(error) && error.response?.status === 401;
}
