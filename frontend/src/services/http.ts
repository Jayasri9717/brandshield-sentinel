import axios from "axios";

const apiUrl = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/+$/, "");
export const api = axios.create({ baseURL: `${apiUrl}/api` });

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError<unknown>(error)) {
    return error instanceof Error ? error.message : fallback;
  }
  if (!error.response && error.request) {
    return "Backend unreachable. Is it running at VITE_API_URL?";
  }

  const body: unknown = error.response?.data;
  const detail = typeof body === "object" && body !== null && "detail" in body ? body.detail : undefined;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item: unknown) => {
        if (typeof item !== "object" || item === null || !("msg" in item)) return "";
        return String(item.msg);
      })
      .filter(Boolean)
      .join(" ");
  }
  return fallback;
}

export function isNotFound(error: unknown): boolean {
  return axios.isAxiosError<unknown>(error) && error.response?.status === 404;
}
