import { apiRequest } from './client';
import type {
  MultipartAbortRequest,
  MultipartAbortResponse,
  MultipartCompleteRequest,
  MultipartInitRequest,
  MultipartInitResponse,
  MultipartPartsRequest,
  MultipartPartsResponse,
  UploadCompleteRequest,
  UploadCompleteResponse,
  UploadPresignRequest,
  UploadPresignResponse,
} from '../types/upload';

export function presignUpload(body: UploadPresignRequest): Promise<UploadPresignResponse> {
  return apiRequest<UploadPresignResponse>('/api/uploads/presign', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function completeUpload(body: UploadCompleteRequest): Promise<UploadCompleteResponse> {
  return apiRequest<UploadCompleteResponse>('/api/uploads/complete', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function initMultipartUpload(body: MultipartInitRequest): Promise<MultipartInitResponse> {
  return apiRequest<MultipartInitResponse>('/api/uploads/multipart/init', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function presignMultipartParts(body: MultipartPartsRequest): Promise<MultipartPartsResponse> {
  return apiRequest<MultipartPartsResponse>('/api/uploads/multipart/parts', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function completeMultipartUpload(
  body: MultipartCompleteRequest,
): Promise<UploadCompleteResponse> {
  return apiRequest<UploadCompleteResponse>('/api/uploads/multipart/complete', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function abortMultipartUpload(body: MultipartAbortRequest): Promise<MultipartAbortResponse> {
  return apiRequest<MultipartAbortResponse>('/api/uploads/multipart/abort', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
