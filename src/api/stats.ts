import { apiRequest } from './client';

export interface AccountStats {
  quota_bytes: number | null;
  used_bytes: number;
  remaining_bytes: number | null;
  object_count: number;
  trash_bytes: number;
  trash_object_count: number;
  version_bytes: number;
  version_object_count: number;
  usage_percent: number | null;
  collected_at: string | null;
}

export interface BucketStatsItem {
  bucket_id: number;
  bucket_name: string;
  display_name: string | null;
  display_alias_only: boolean;
  quota_bytes: number | null;
  used_bytes: number;
  object_count: number;
  trash_bytes: number;
  trash_object_count: number;
  usage_percent: number | null;
}

export interface BucketStatsList {
  items: BucketStatsItem[];
  collected_at: string | null;
}

export async function getAccountStats(): Promise<AccountStats> {
  return apiRequest<AccountStats>('/api/stats');
}

/** @deprecated Use getAccountStats */
export async function getTenantStats(): Promise<AccountStats> {
  return getAccountStats();
}

export async function getBucketStats(): Promise<BucketStatsList> {
  return apiRequest<BucketStatsList>('/api/stats/buckets');
}

export type StatPeriod = '24h' | '7d' | '30d';

export interface AccountTrafficStats {
  period: StatPeriod;
  upload_bytes: number;
  download_bytes: number;
  request_count: number;
  get_count: number;
  put_count: number;
  delete_count: number;
  error_count: number;
  active_users: number;
  collected_at: string | null;
}

export interface BucketRequestStatsItem {
  bucket_id: number;
  bucket_name: string;
  display_name: string | null;
  display_alias_only: boolean;
  request_count: number;
  upload_bytes: number;
  download_bytes: number;
  get_count: number;
  put_count: number;
  delete_count: number;
}

export interface BucketRequestStatsList {
  period: StatPeriod;
  items: BucketRequestStatsItem[];
  collected_at: string | null;
}

export async function getAccountTrafficStats(period: StatPeriod = '24h'): Promise<AccountTrafficStats> {
  return apiRequest<AccountTrafficStats>(`/api/stats/traffic?period=${period}`);
}

/** @deprecated Use getAccountTrafficStats */
export async function getTenantTrafficStats(period: StatPeriod = '24h'): Promise<AccountTrafficStats> {
  return getAccountTrafficStats(period);
}

export async function getBucketRequestStats(period: StatPeriod = '24h'): Promise<BucketRequestStatsList> {
  return apiRequest<BucketRequestStatsList>(`/api/stats/buckets/requests?period=${period}`);
}
