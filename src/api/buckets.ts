import { apiRequest } from './client';
import type {
  BucketCreateRequest,
  BucketDetailResponse,
  BucketListResponse,
  BucketUpdateRequest,
} from '../types/bucket';

export function listBuckets(): Promise<BucketListResponse> {
  return apiRequest<BucketListResponse>('/api/buckets');
}

export function createBucket(body: BucketCreateRequest): Promise<BucketDetailResponse> {
  return apiRequest<BucketDetailResponse>('/api/buckets', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function getBucket(bucketName: string): Promise<BucketDetailResponse> {
  return apiRequest<BucketDetailResponse>(`/api/buckets/${encodeURIComponent(bucketName)}`);
}

export function updateBucket(
  bucketName: string,
  body: BucketUpdateRequest,
): Promise<BucketDetailResponse> {
  return apiRequest<BucketDetailResponse>(`/api/buckets/${encodeURIComponent(bucketName)}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export function deleteBucket(bucketName: string): Promise<void> {
  return apiRequest<void>(`/api/buckets/${encodeURIComponent(bucketName)}`, {
    method: 'DELETE',
  });
}
