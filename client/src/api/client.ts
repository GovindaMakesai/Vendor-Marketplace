export class ApiError extends Error {
  status: number;
  code: string;
  details: Array<{ path: string; message: string }>;

  constructor(status: number, code: string, message: string, details: Array<{ path: string; message: string }> = []) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const TOKEN_KEY = "vrp_token";

export function getApiUrl() {
  const configured = import.meta.env.VITE_API_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  if (import.meta.env.DEV) return "http://localhost:5000/api";
  throw new Error("VITE_API_URL is not configured");
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${getApiUrl()}${path}`, { ...options, headers });
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", "The API could not be reached");
  }

  const text = await response.text();
  const payload = text ? (JSON.parse(text) as { success?: boolean; data?: T; error?: { code?: string; message?: string; details?: Array<{ path: string; message: string }> } }) : null;

  if (!response.ok || !payload?.success) {
    throw new ApiError(
      response.status,
      payload?.error?.code ?? "REQUEST_FAILED",
      payload?.error?.message ?? "Request failed",
      payload?.error?.details ?? [],
    );
  }

  return payload.data as T;
}
