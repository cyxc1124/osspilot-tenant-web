import { apiRequest } from './client';

export interface CorsRule {
  allowed_origins: string[];
  allowed_methods: string[];
  allowed_headers: string[];
  expose_headers: string[];
  max_age_seconds?: number | null;
}

export interface BucketCorsResponse {
  bucket_name: string;
  cors_rules: CorsRule[];
  has_cors: boolean;
}

export function getBucketCors(bucketName: string): Promise<BucketCorsResponse> {
  return apiRequest<BucketCorsResponse>(
    `/api/buckets/${encodeURIComponent(bucketName)}/cors`,
  );
}

export function putBucketCors(
  bucketName: string,
  corsRules: CorsRule[],
): Promise<BucketCorsResponse> {
  return apiRequest<BucketCorsResponse>(
    `/api/buckets/${encodeURIComponent(bucketName)}/cors`,
    {
      method: 'PUT',
      body: JSON.stringify({ cors_rules: corsRules }),
    },
  );
}

export function deleteBucketCors(bucketName: string): Promise<void> {
  return apiRequest<void>(
    `/api/buckets/${encodeURIComponent(bucketName)}/cors`,
    { method: 'DELETE' },
  );
}
