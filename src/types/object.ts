export interface ObjectSummary {
  key: string;
  size: number;
  content_type: string | null;
  last_modified: string | null;
  etag: string | null;
  uploaded_by: number | null;
}

export interface ObjectDetail {
  key: string;
  size: number;
  content_type: string | null;
  last_modified: string | null;
  etag: string | null;
  storage_class: string | null;
  uploaded_by: number | null;
  uploaded_by_username: string | null;
  created_at: string | null;
  updated_at: string | null;
  access_permission: string;
  server_side_encryption: string | null;
  user_metadata: Record<string, string>;
}

export interface ObjectListResponse {
  items: ObjectSummary[];
  prefixes: string[];
  is_truncated: boolean;
  continuation_token: string | null;
}

export interface CreateDirectoryRequest {
  name: string;
  parent_prefix?: string;
}

export interface CreateDirectoryResponse {
  key: string;
  size: number;
  last_modified: string | null;
}

export interface ObjectDeleteFailure {
  key: string;
  error: string;
}

export interface ObjectDeleteResponse {
  deleted: string[];
  failed: ObjectDeleteFailure[];
  status?: 'completed' | 'queued';
  job_id?: string | null;
  queued_count?: number | null;
}

export interface ObjectKeyPair {
  source_key: string;
  dest_key: string;
  dest_bucket_name?: string | null;
}

export interface ObjectCopyRequest {
  items: ObjectKeyPair[];
}

export interface ObjectCopyFailure {
  source_key: string;
  error: string;
}

export interface ObjectCopyResult {
  source_key: string;
  dest_key: string;
  dest_bucket_name?: string | null;
}

export interface ObjectCopyResponse {
  copied: ObjectCopyResult[];
  failed: ObjectCopyFailure[];
  status?: 'completed' | 'queued';
  job_id?: string | null;
  queued_count?: number | null;
}

export interface ObjectMoveRequest {
  items: ObjectKeyPair[];
}

export interface ObjectMoveFailure {
  source_key: string;
  error: string;
}

export interface ObjectMoveResult {
  source_key: string;
  dest_key: string;
}

export interface ObjectMoveResponse {
  moved: ObjectMoveResult[];
  failed: ObjectMoveFailure[];
  status?: 'completed' | 'queued';
  job_id?: string | null;
  queued_count?: number | null;
}

export interface ObjectRenameRequest {
  key: string;
  new_name: string;
}

export interface ObjectRenameResponse {
  source_key: string;
  dest_key: string;
}

export interface FileDetailTarget {
  bucketName: string;
  objectKey: string;
}
