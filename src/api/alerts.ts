import { apiRequest } from './client';

export interface TenantAlertNotification {
  id: number;
  rule_type: string;
  severity: string;
  status: string;
  title: string;
  message: string;
  bucket_name: string | null;
  fired_at: string;
  resolved_at: string | null;
}

export interface TenantAlertNotificationList {
  items: TenantAlertNotification[];
}

export async function listAccountAlertNotifications(
  limit = 10,
): Promise<TenantAlertNotificationList> {
  return apiRequest<TenantAlertNotificationList>(`/api/alerts/notifications?limit=${limit}`);
}

/** @deprecated Use listAccountAlertNotifications */
export async function listTenantAlertNotifications(
  _tenantId?: number,
  limit = 10,
): Promise<TenantAlertNotificationList> {
  return listAccountAlertNotifications(limit);
}
