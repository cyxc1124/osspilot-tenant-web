import { apiRequest } from './client';
import type { LoginRequest, LoginResponse, LogoutResponse, MeResponse } from '../types/auth';

interface LegacyMeResponse extends MeResponse {
  tenants?: Array<{ id: number; name: string; display_name: string | null }>;
  roles?: Array<{ tenant_id: number; role: string }>;
}

function normalizeMeResponse(raw: LegacyMeResponse): MeResponse {
  const role = raw.role ?? raw.roles?.[0]?.role ?? null;
  return {
    id: raw.id,
    username: raw.username,
    display_name: raw.display_name,
    email: raw.email,
    phone: raw.phone,
    role,
    must_change_password: Boolean(raw.must_change_password),
  };
}

export function login(body: LoginRequest): Promise<LoginResponse> {
  return apiRequest<LoginResponse>(
    '/api/login',
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
    { skipAuth: true },
  );
}

export async function fetchMe(): Promise<MeResponse> {
  const raw = await apiRequest<LegacyMeResponse>('/api/me');
  return normalizeMeResponse(raw);
}

export function logout(): Promise<LogoutResponse> {
  return apiRequest<LogoutResponse>('/api/logout', { method: 'POST' });
}

export function changePassword(body: {
  old_password: string;
  new_password: string;
}): Promise<void> {
  return apiRequest<void>('/api/password/change', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
