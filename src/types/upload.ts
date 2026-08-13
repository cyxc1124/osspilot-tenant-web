export interface UploadPresignRequest {
  bucket_name: string;
  object_key: string;
  size: number;
  content_type?: string | null;
  }

export interface UploadPresignResponse {
  task_id: number;
  upload_url: string;
  headers: Record<string, string>;
  expires_in: number;
}

export interface MultipartInitRequest {
  bucket_name: string;
  object_key: string;
  size: number;
  content_type?: string | null;
  }

export interface MultipartInitResponse {
  task_id: number;
  upload_id: string;
}

export interface MultipartPartsRequest {
  bucket_name: string;
  object_key: string;
  upload_id: string;
  task_id: number;
  part_numbers: number[];
}

export interface PartPresignUrl {
  part_number: number;
  url: string;
}

export interface MultipartPartsResponse {
  parts: PartPresignUrl[];
  expires_in: number;
}

export interface CompletedPart {
  part_number: number;
  etag: string;
}

export interface MultipartCompleteRequest {
  bucket_name: string;
  object_key: string;
  upload_id: string;
  task_id: number;
  parts: CompletedPart[];
}

export interface UploadCompleteRequest {
  bucket_name: string;
  object_key: string;
  task_id: number;
  }

export interface UploadCompleteResponse {
  bucket_name: string;
  object_key: string;
  size: number;
  content_type: string | null;
  etag: string | null;
}

export interface MultipartAbortRequest {
  bucket_name: string;
  object_key: string;
  upload_id: string;
  task_id: number;
}

export interface MultipartAbortResponse {
  task_id: number;
  status: string;
}
