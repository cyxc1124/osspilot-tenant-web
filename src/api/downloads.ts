import { apiRequest } from './client';
import type { DownloadPresignRequest, DownloadPresignResponse } from '../types/download';

export interface DownloadBatchRequest {
  bucket_name: string;
  keys: string[];
}

export interface DownloadBatchItem {
  key: string;
  download_url: string | null;
  error: string | null;
}

export interface DownloadBatchResponse {
  items: DownloadBatchItem[];
  expires_in: number;
}

export function presignDownload(body: DownloadPresignRequest): Promise<DownloadPresignResponse> {
  return apiRequest<DownloadPresignResponse>('/api/downloads/presign', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function batchPresignDownload(body: DownloadBatchRequest): Promise<DownloadBatchResponse> {
  return apiRequest<DownloadBatchResponse>('/api/downloads/batch', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
