import { apiRequest } from './client';

export interface StorageRegionInfo {
  id: number;
  code: string;
  name: string;
  s3_endpoint: string;
}

export interface PlatformConfig {
  storage_region: StorageRegionInfo | null;
  s3_endpoint: string | null;
  download_cdn_url: string | null;
  preview_cdn_url: string | null;
  object_http_domain: string | null;
  object_https_domain: string | null;
  trash_retention_days: number;
  trash_cleanup_enabled: boolean;
}

export function getPlatformConfig(): Promise<PlatformConfig> {
  return apiRequest<PlatformConfig>('/api/platform-config');
}
