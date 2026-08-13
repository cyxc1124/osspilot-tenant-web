export interface AuditLogEntry {
  id: number;
  user_id: number | null;
  username: string | null;
  tenant_id: number | null;
  tenant_name: string | null;
  bucket_name: string | null;
  object_key: string | null;
  action: string;
  source_ip: string | null;
  user_agent: string | null;
  status: string;
  error_message: string | null;
  created_at: string;
}

export interface AuditLogListResponse {
  items: AuditLogEntry[];
  page: number;
  page_size: number;
  total: number;
}

export interface AuditLogFilters {
    user_id?: number;
  bucket_name?: string;
  object_key?: string;
  action?: string;
  source_ip?: string;
  created_from?: string;
  created_to?: string;
  page?: number;
  page_size?: number;
}
