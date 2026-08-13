import { getApiBaseUrl } from '../lib/apiBase';
import { APP_LOCALE_HEADER, getAppLocale, requestFailedMessage } from '../lib/locale';
import { getStoredToken } from '../lib/tokenStorage';
import type { ApiErrorBody } from '../types/auth';

type UnauthorizedHandler = () => void;

let unauthorizedHandler: UnauthorizedHandler | null = null;

export function registerUnauthorizedHandler(handler: UnauthorizedHandler): void {
  unauthorizedHandler = handler;
}

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as ApiErrorBody;
    if (typeof body.detail === 'string') {
      return body.detail;
    }
    if (Array.isArray(body.detail) && body.detail.length > 0) {
      return body.detail.map((item) => item.msg).join('; ');
    }
  } catch {
    // ignore JSON parse errors
  }
  return response.statusText || requestFailedMessage();
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  { skipAuth = false }: { skipAuth?: boolean } = {},
): Promise<T> {
  const headers = new Headers(options.headers);

  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  headers.set(APP_LOCALE_HEADER, getAppLocale());

  if (!skipAuth) {
    const token = getStoredToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401 && !skipAuth) {
    unauthorizedHandler?.();
    throw new ApiError(401, await parseErrorMessage(response));
  }

  if (!response.ok) {
    throw new ApiError(response.status, await parseErrorMessage(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function apiDownload(path: string): Promise<Blob> {
  const headers = new Headers();
  headers.set(APP_LOCALE_HEADER, getAppLocale());
  const token = getStoredToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, { headers });

  if (response.status === 401) {
    unauthorizedHandler?.();
    throw new ApiError(401, await parseErrorMessage(response));
  }

  if (!response.ok) {
    throw new ApiError(response.status, await parseErrorMessage(response));
  }

  return response.blob();
}
