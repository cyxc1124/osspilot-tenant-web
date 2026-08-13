import { apiRequest } from './client';
import type {
  PublicShareAccessResponse,
  ShareLinkCreateRequest,
  ShareLinkCreateResponse,
  ShareLinkListResponse,
} from '../types/share';

export interface ShareLinkListParams {
  bucket_name?: string;
  object_key?: string;
}

export function createShareLink(
  body: ShareLinkCreateRequest,
): Promise<ShareLinkCreateResponse> {
  return apiRequest<ShareLinkCreateResponse>('/api/share-links', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function listShareLinks(params: ShareLinkListParams = {}): Promise<ShareLinkListResponse> {
  const search = new URLSearchParams();
  if (params.bucket_name) {
    search.set('bucket_name', params.bucket_name);
  }
  if (params.object_key) {
    search.set('object_key', params.object_key);
  }
  const query = search.toString();
  return apiRequest<ShareLinkListResponse>(`/api/share-links${query ? `?${query}` : ''}`);
}

export function revokeShareLink(linkId: number): Promise<void> {
  return apiRequest<void>(`/api/share-links/${linkId}`, { method: 'DELETE' });
}

export function accessPublicShare(
  token: string,
  password?: string,
): Promise<PublicShareAccessResponse> {
  const params = new URLSearchParams();
  if (password) {
    params.set('password', password);
  }
  const query = params.toString();
  const path = `/s/${encodeURIComponent(token)}${query ? `?${query}` : ''}`;
  return apiRequest<PublicShareAccessResponse>(path, {}, { skipAuth: true });
}
