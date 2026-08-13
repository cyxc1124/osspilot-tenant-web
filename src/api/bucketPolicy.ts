import { apiRequest } from './client';

export interface BucketPolicyResponse {
  bucket_name: string;
  policy: Record<string, unknown> | null;
  has_policy: boolean;
}

export function getBucketPolicy(bucketName: string): Promise<BucketPolicyResponse> {
  return apiRequest<BucketPolicyResponse>(
    `/api/buckets/${encodeURIComponent(bucketName)}/policy`,
  );
}

export function putBucketPolicy(
  bucketName: string,
  policy: Record<string, unknown>,
): Promise<BucketPolicyResponse> {
  return apiRequest<BucketPolicyResponse>(
    `/api/buckets/${encodeURIComponent(bucketName)}/policy`,
    {
      method: 'PUT',
      body: JSON.stringify({ policy }),
    },
  );
}

export function deleteBucketPolicy(bucketName: string): Promise<void> {
  return apiRequest<void>(
    `/api/buckets/${encodeURIComponent(bucketName)}/policy`,
    { method: 'DELETE' },
  );
}
