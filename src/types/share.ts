export interface ShareLinkCreateRequest {
  bucket_name: string;
  object_key: string;
    expires_at?: string | null;
  password?: string | null;
  max_access_count?: number | null;
  allow_download?: boolean;
  allow_preview?: boolean;
}

export interface ShareLinkItem {
  id: number;
  tenant_id: number;
  bucket_name: string;
  object_key: string;
  created_by: number;
  token: string;
  share_path: string;
  expires_at: string | null;
  max_access_count: number | null;
  access_count: number;
  allow_download: boolean;
  allow_preview: boolean;
  has_password: boolean;
  status: string;
  created_at: string;
}

export interface ShareLinkCreateResponse {
  item: ShareLinkItem;
}

export interface ShareLinkListResponse {
  items: ShareLinkItem[];
}

export interface PublicShareAccessResponse {
  bucket_name: string;
  object_key: string;
  allow_download: boolean;
  allow_preview: boolean;
  download_url: string | null;
  preview_url: string | null;
  expires_at: string | null;
  access_count: number;
  max_access_count: number | null;
  expires_in: number | null;
}
