/**
 * Typed HTTP client for the Go backend.
 *
 * Requests are relative ("/api/v1/..."), never absolute: in development the
 * local reverse proxy forwards /api to the Go service, and in Azure the same
 * origin does the same thing. That means no CORS and no environment-specific
 * base URLs.
 */

const BASE_PATH = '/api/v1';

/** The error envelope every backend endpoint returns on failure. */
interface ErrorEnvelope {
  error: {
    code: string;
    message: string;
    requestId?: string;
  };
}

/** A failed API call. Carries the backend's stable error code and request id. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId: string | undefined;

  constructor(status: number, code: string, message: string, requestId?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }

  /** True for errors that will not be fixed by retrying the same request. */
  get isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Serialised as a JSON request body. */
  body?: unknown;
  /** Appended as a query string; undefined and null values are dropped. */
  query?: Record<string, string | number | boolean | undefined | null>;
  signal?: AbortSignal;
}

/**
 * Calls the API and returns the parsed JSON body.
 *
 * Throws ApiError for any non-2xx response, so callers (and React Query) only
 * ever deal with one error type.
 */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, signal } = options;

  const url = new URL(`${BASE_PATH}${path}`, window.location.origin);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
  }

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
      credentials: 'same-origin',
    });
  } catch (cause) {
    // Network-level failure: offline, proxy down, request aborted.
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause;
    throw new ApiError(0, 'network_error', 'Could not reach the server.', undefined);
  }

  if (response.status === 204) return undefined as T;

  const payload: unknown = await parseJson(response);

  if (!response.ok) {
    const envelope = payload as Partial<ErrorEnvelope> | null;
    throw new ApiError(
      response.status,
      envelope?.error?.code ?? 'unknown_error',
      envelope?.error?.message ?? `Request failed with status ${response.status}.`,
      envelope?.error?.requestId ?? response.headers.get('X-Request-Id') ?? undefined,
    );
  }

  return payload as T;
}

async function parseJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text === '') return null;
  try {
    return JSON.parse(text);
  } catch {
    // A non-JSON body means something other than our API answered - most
    // likely the reverse proxy's own error page.
    throw new ApiError(response.status, 'invalid_response', 'The server returned a malformed response.');
  }
}
