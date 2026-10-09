export class ApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** Typed JSON request helper. Throws ApiError using the server-provided message. */
export async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, { cache: 'no-store', ...init });
  const data = (await response.json().catch(() => ({}))) as { error?: string } & Record<string, unknown>;
  if (!response.ok) throw new ApiError(data.error ?? `Request failed (${response.status})`, response.status);
  return data as T;
}

export function postJson<T>(url: string, body?: unknown): Promise<T> {
  return request<T>(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
