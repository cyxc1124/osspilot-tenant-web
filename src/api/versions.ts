import { apiRequest } from './client';
import type {
  FileVersionDownloadResponse,
  FileVersionListResponse,
  FileVersionRestoreResponse,
  FileVersionSummary,
} from '../types/version';

export interface ListVersionsParams {
  bucketName: string;
  objectKey: string;
  limit?: number;
  offset?: number;
}

export function listVersions(params: ListVersionsParams): Promise<FileVersionListResponse> {
  const search = new URLSearchParams({
    bucket_name: params.bucketName,
    object_key: params.objectKey,
  });
  if (params.limit !== undefined) {
    search.set('limit', String(params.limit));
  }
  if (params.offset !== undefined) {
    search.set('offset', String(params.offset));
  }
  return apiRequest<FileVersionListResponse>(`/api/versions?${search.toString()}`);
}

export function getVersion(versionId: number): Promise<FileVersionSummary> {
  return apiRequest<FileVersionSummary>(`/api/versions/${versionId}`);
}

export function downloadVersion(versionId: number): Promise<FileVersionDownloadResponse> {
  return apiRequest<FileVersionDownloadResponse>(
    `/api/versions/${versionId}/download`,
    { method: 'POST' },
  );
}

export function restoreVersion(versionId: number): Promise<FileVersionRestoreResponse> {
  return apiRequest<FileVersionRestoreResponse>(
    `/api/versions/${versionId}/restore`,
    { method: 'POST' },
  );
}

export function deleteVersion(versionId: number): Promise<{ deleted: boolean; id: number }> {
  return apiRequest<{ deleted: boolean; id: number }>(
    `/api/versions/${versionId}`,
    { method: 'DELETE' },
  );
}
