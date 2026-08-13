import { apiRequest } from './client';

export interface TenantLoginBranding {
  logo_text: string;
  title: string;
  subtitle: string;
}

export const DEFAULT_TENANT_LOGIN_BRANDING: TenantLoginBranding = {
  logo_text: 'O',
  title: 'OssPilot 对象存储',
  subtitle: '租户控制台',
};

export function getLoginBranding(): Promise<TenantLoginBranding> {
  return apiRequest<TenantLoginBranding>('/api/login-branding', {}, { skipAuth: true });
}
