import { apiDownload, apiRequest } from './client';
import { buildQueryString } from '../lib/queryString';
import type { AuditLogFilters, AuditLogListResponse } from '../types/audit';

export function listAuditLogs(filters: AuditLogFilters = {}): Promise<AuditLogListResponse> {
  const query = buildQueryString(filters);
  return apiRequest<AuditLogListResponse>(`/api/audit-logs${query}`);
}

export function exportAuditLogs(filters: AuditLogFilters = {}): Promise<Blob> {
  const query = buildQueryString(filters);
  return apiDownload(`/api/audit-logs/export${query}`);
}
