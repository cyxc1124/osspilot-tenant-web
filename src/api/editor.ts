import { apiRequest } from './client';

export type EditorOpenRequest = {
  bucket_name: string;
  object_key: string;
  mode?: 'edit' | 'view';
};

export type EditorUserConfig = {
  id: string;
  name: string;
};

export type EditorConfigSection = {
  callbackUrl: string;
  mode: string;
  user: EditorUserConfig;
};

export type EditorDocumentConfig = {
  fileType: string;
  key: string;
  title: string;
  url: string;
};

export type OnlyOfficeConfig = {
  document: EditorDocumentConfig;
  documentType: string;
  editorConfig: EditorConfigSection;
  token?: string;
};

export type EditorOpenResponse = {
  session_id: string;
  office_url: string;
  config: OnlyOfficeConfig;
  locked: boolean;
  readonly: boolean;
  expires_at: string;
};

export type EditorSaveResponse = {
  saved: boolean;
  etag: string | null;
  saved_at: string | null;
};

export async function openOfficeEditor(
  payload: EditorOpenRequest,
): Promise<EditorOpenResponse> {
  return apiRequest<EditorOpenResponse>('/api/editor/open', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function saveOfficeEditor(sessionId: string): Promise<EditorSaveResponse> {
  return apiRequest<EditorSaveResponse>('/api/editor/save', {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId }),
  });
}

export async function unlockOfficeEditor(payload: {
  bucket_name: string;
  object_key: string;
  lock_token?: string;
}): Promise<{ unlocked: boolean }> {
  return apiRequest<{ unlocked: boolean }>('/api/editor/unlock', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
