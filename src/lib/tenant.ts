/**
 * @deprecated Account-centric model: API calls no longer require tenant_id.
 * Kept for backward compatibility during migration.
 */
import type { MeResponse } from '../types/auth';

/** @deprecated Use authenticated user.id as account scope; omit tenant_id from API calls. */
export function resolveTenantId(user: MeResponse | null): number | undefined {
  return user?.id;
}
