import { API_URL } from './config';
import { tokenStore } from './tokenStore';
import type { ApiUser } from './types';

// HTTP client for the MediOS backend. Responses are wrapped as
// { success, statusCode, data }; this unwraps `data` and turns failures into
// ApiError with the server's message.
//
// Sessions: a 15-minute access token in memory plus a rotating refresh token in
// secure storage. The app identifies itself as a native client, so the API hands
// the refresh token over in the body instead of a cookie. On a 401 the client
// refreshes once (concurrent requests share one refresh) and retries.

const CLIENT_HEADERS = { 'X-MediOS-Client': 'mobile' };
const TIMEOUT_MS = 15_000;
const AUTH_PATHS = ['/auth/login', '/auth/refresh', '/auth/logout'];

export class ApiError extends Error {
  /** HTTP status; 0 when the server could not be reached. */
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const errorMessage = (err: unknown) => (err instanceof Error ? err.message : 'Something went wrong');

interface SessionPayload {
  accessToken: string;
  expiresIn: number;
  user: ApiUser;
  refreshToken: string;
}

let accessToken: string | null = null;
let sessionLostHandler: (() => void) | null = null;

/** Called when the session cannot be renewed (signed out elsewhere, expired, revoked). */
export const onSessionLost = (handler: (() => void) | null) => {
  sessionLostHandler = handler;
};

type Query = Record<string, string | number | undefined>;

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Query;
}

async function send(path: string, { method = 'GET', body, query }: RequestOptions): Promise<Response> {
  const params = Object.entries(query ?? {})
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(`${API_URL}${path}${params ? `?${params}` : ''}`, {
      method,
      headers: {
        ...CLIENT_HEADERS,
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch {
    throw new ApiError(0, `Cannot reach the MediOS server at ${API_URL}. Check the connection and that the server is running.`);
  } finally {
    clearTimeout(timer);
  }
}

async function unwrap<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T;
  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    const message = payload?.message;
    throw new ApiError(res.status, Array.isArray(message) ? message.join('; ') : message || `Request failed (${res.status})`);
  }
  return payload?.data as T;
}

async function startSession(payload: SessionPayload): Promise<ApiUser> {
  accessToken = payload.accessToken;
  await tokenStore.set(payload.refreshToken);
  return payload.user;
}

let refreshing: Promise<ApiUser | null> | null = null;

/** Exchanges the stored refresh token for a new session; null when there is none or it was refused. */
export function refreshSession(): Promise<ApiUser | null> {
  refreshing ??= (async () => {
    const refreshToken = await tokenStore.get();
    if (!refreshToken) return null;
    const res = await send('/auth/refresh', { method: 'POST', body: { refreshToken } });
    if (res.status === 401 || res.status === 403) {
      accessToken = null;
      await tokenStore.clear();
      return null;
    }
    return startSession(await unwrap<SessionPayload>(res));
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

export async function api<T>(path: string, options: RequestOptions = {}, retried = false): Promise<T> {
  const res = await send(path, options);
  if (res.status === 401 && !AUTH_PATHS.includes(path)) {
    if (!retried && (await refreshSession().catch(() => null))) return api<T>(path, options, true);
    accessToken = null;
    sessionLostHandler?.();
  }
  return unwrap<T>(res);
}

export const auth = {
  async signIn(email: string, password: string): Promise<ApiUser> {
    const res = await send('/auth/login', { method: 'POST', body: { email: email.trim(), password } });
    return startSession(await unwrap<SessionPayload>(res));
  },
  /** Resumes the session saved on this device (app start). */
  restore: () => refreshSession(),
  /** Ends this device's session; local credentials are cleared even when offline. */
  async signOut(): Promise<void> {
    const refreshToken = await tokenStore.get();
    if (refreshToken) await send('/auth/logout', { method: 'POST', body: { refreshToken } }).catch(() => undefined);
    accessToken = null;
    await tokenStore.clear();
  },
};
