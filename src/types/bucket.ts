export interface BucketSummary {
  bucket_name: string;
  display_name: string | null;
  display_alias_only: boolean;
  quota_bytes: number | null;
  used_bytes: number;
  object_count: number;
  status: string;
  versioning_enabled: boolean;
  created_at: string;
}

export interface BucketListResponse {
  items: BucketSummary[];
}

export interface BucketCreateRequest {
  bucket_name: string;
  display_name?: string | null;
  quota_bytes?: number | null;
  object_limit?: number | null;
  versioning_enabled?: boolean;
}

export interface BucketUpdateRequest {
  display_name?: string | null;
  display_alias_only?: boolean | null;
  quota_bytes?: number | null;
  object_limit?: number | null;
  versioning_enabled?: boolean | null;
  access_logging_enabled?: boolean | null;
  access_log_target_bucket?: string | null;
  access_log_prefix?: string | null;
}

export interface BucketDetailResponse {
  id: number;
  bucket_name: string;
  display_name: string | null;
  display_alias_only: boolean;
  quota_bytes: number | null;
  object_limit: number | null;
  used_bytes: number;
  object_count: number;
  versioning_enabled: boolean;
  status: string;
  created_at: string;
  updated_at: string;
}
