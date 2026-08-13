export interface FileVersionSummary {
  id: number;
  bucket_name: string;
  object_key: string;
  version_no: number;
  size: number;
  etag: string | null;
  created_by: number;
  created_by_username: string | null;
  created_at: string;
  source: string;
  remark: string | null;
}

export interface FileVersionListResponse {
  items: FileVersionSummary[];
  total: number;
}

export interface FileVersionDownloadResponse {
  download_url: string;
  expires_in: number;
  filename: string;
}

export interface FileVersionRestoreResponse {
  restored: boolean;
  bucket_name: string;
  object_key: string;
  version_no: number;
  etag: string | null;
}

export interface FileVersionTarget {
  bucketName: string;
  objectKey: string;
}
