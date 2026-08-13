export interface TrashObjectSummary {
  key: string;
  size: number;
  content_type: string | null;
  last_modified: string | null;
}

export interface TrashListResponse {
  items: TrashObjectSummary[];
  is_truncated: boolean;
  continuation_token: string | null;
}

export interface TrashOperationFailure {
  key: string;
  error: string;
}

export interface TrashOperationResponse {
  succeeded: string[];
  failed: TrashOperationFailure[];
}
