import { apiRequest } from './client';

export type TextEditOpenRequest = {
  bucket_name: string;
  object_key: string;
};

export type TextEditOpenResponse = {
  session_id: string;
  lock_token: string;
  bucket_name: string;
  object_key: string;
  content: string;
  language: string;
  content_type: string | null;
  size: number;
  locked: boolean;
  readonly: boolean;
  expires_at: string;
};

export type TextEditSaveResponse = {
  saved: boolean;
  version_no: number;
  etag: string | null;
  saved_at: string;
};

export async function openTextEditor(
  payload: TextEditOpenRequest,
): Promise<TextEditOpenResponse> {
  return apiRequest<TextEditOpenResponse>('/api/text-edit/open', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function saveTextEditor(
  sessionId: string,
  content: string,
): Promise<TextEditSaveResponse> {
  return apiRequest<TextEditSaveResponse>(`/api/text-edit/${encodeURIComponent(sessionId)}/save`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
}

export async function unlockTextEditor(payload: {
  bucket_name: string;
  object_key: string;
  lock_token?: string;
}): Promise<{ unlocked: boolean }> {
  return apiRequest<{ unlocked: boolean }>('/api/text-edit/unlock', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function closeTextEditor(sessionId: string): Promise<{ closed: boolean }> {
  return apiRequest<{ closed: boolean }>('/api/text-edit/close', {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId }),
  });
}
