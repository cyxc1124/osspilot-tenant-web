import type { MeResponse } from '../types/auth';

export type TranslateFn = (key: string, params?: Record<string, string | number>) => string;

function roleKeyLabel(key: string, fallback: string, t: TranslateFn): string {
  const label = t(key);
  return label === key ? fallback : label;
}

export function tenantRoleLabel(role: string, t: TranslateFn): string {
  return roleKeyLabel(`roles.${role}`, role, t);
}

export function resolveAccountRole(user: MeResponse | null): string | null {
  return user?.role ?? null;
}

export function isTenantAdmin(user: MeResponse | null): boolean {
  return user?.role === 'tenant_admin';
}

export function canViewAudit(user: MeResponse | null): boolean {
  if (!user?.role) {
    return false;
  }
  return user.role === 'tenant_admin' || user.role === 'audit_user';
}
