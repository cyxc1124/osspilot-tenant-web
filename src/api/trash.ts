import { apiRequest } from './client';
import type {
  TrashListResponse,
  TrashOperationResponse,
} from '../types/trash';

export interface ListTrashParams {
  prefix?: string;
  maxKeys?: number;
  continuationToken?: string | null;
}

export function listTrash(
  bucketName: string,
  params: ListTrashParams = {},
): Promise<TrashListResponse> {
  const search = new URLSearchParams();
  if (params.prefix) {
    search.set('prefix', params.prefix);
  }
  if (params.maxKeys !== undefined) {
    search.set('max_keys', String(params.maxKeys));
  }
  if (params.continuationToken) {
    search.set('continuation_token', params.continuationToken);
  }
  const query = search.toString();
  const suffix = query ? `?${query}` : '';
  return apiRequest<TrashListResponse>(
    `/api/buckets/${encodeURIComponent(bucketName)}/trash${suffix}`,
  );
}

export function restoreTrash(
  bucketName: string,
  keys: string[],
): Promise<TrashOperationResponse> {
  return apiRequest<TrashOperationResponse>(
    `/api/buckets/${encodeURIComponent(bucketName)}/trash/restore`,
    {
      method: 'POST',
      body: JSON.stringify({ keys }),
    },
  );
}

export function purgeTrash(
  bucketName: string,
  keys: string[],
): Promise<TrashOperationResponse> {
  return apiRequest<TrashOperationResponse>(
    `/api/buckets/${encodeURIComponent(bucketName)}/trash`,
    {
      method: 'DELETE',
      body: JSON.stringify({ keys }),
    },
  );
}
