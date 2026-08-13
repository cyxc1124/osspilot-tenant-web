import { apiRequest } from './client';
import type {
  CreateDirectoryRequest,
  CreateDirectoryResponse,
  ObjectCopyRequest,
  ObjectCopyResponse,
  ObjectDeleteResponse,
  ObjectDetail,
  ObjectListResponse,
  ObjectMoveRequest,
  ObjectMoveResponse,
  ObjectRenameRequest,
  ObjectRenameResponse,
} from '../types/object';

export interface ListObjectsParams {
  prefix?: string;
  maxKeys?: number;
  continuationToken?: string | null;
}

export function listObjects(
  bucketName: string,
  params: ListObjectsParams = {},
): Promise<ObjectListResponse> {
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
  return apiRequest<ObjectListResponse>(
    `/api/buckets/${encodeURIComponent(bucketName)}/objects${suffix}`,
  );
}

export function getObjectDetail(
  bucketName: string,
  key: string,
): Promise<ObjectDetail> {
  const search = new URLSearchParams({ key });
  return apiRequest<ObjectDetail>(
    `/api/buckets/${encodeURIComponent(bucketName)}/objects/detail?${search.toString()}`,
  );
}

export interface DeleteObjectsOptions {
  permanent?: boolean;
}

export function deleteObjects(
  bucketName: string,
  keys: string[],
  options: DeleteObjectsOptions = {},
): Promise<ObjectDeleteResponse> {
  const search = new URLSearchParams();
  if (options.permanent) {
    search.set('permanent', 'true');
  }
  const query = search.toString();
  const suffix = query ? `?${query}` : '';
  return apiRequest<ObjectDeleteResponse>(
    `/api/buckets/${encodeURIComponent(bucketName)}/objects${suffix}`,
    {
      method: 'DELETE',
      body: JSON.stringify({ keys }),
    },
  );
}

export function createDirectory(
  bucketName: string,
  body: CreateDirectoryRequest,
): Promise<CreateDirectoryResponse> {
  return apiRequest<CreateDirectoryResponse>(
    `/api/buckets/${encodeURIComponent(bucketName)}/objects/directories`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
  );
}

export function copyObjects(
  bucketName: string,
  body: ObjectCopyRequest,
): Promise<ObjectCopyResponse> {
  return apiRequest<ObjectCopyResponse>(
    `/api/buckets/${encodeURIComponent(bucketName)}/objects/copy`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
  );
}

export function moveObjects(
  bucketName: string,
  body: ObjectMoveRequest,
): Promise<ObjectMoveResponse> {
  return apiRequest<ObjectMoveResponse>(
    `/api/buckets/${encodeURIComponent(bucketName)}/objects/move`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
  );
}

export function renameObject(
  bucketName: string,
  body: ObjectRenameRequest,
): Promise<ObjectRenameResponse> {
  return apiRequest<ObjectRenameResponse>(
    `/api/buckets/${encodeURIComponent(bucketName)}/objects/rename`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
  );
}
