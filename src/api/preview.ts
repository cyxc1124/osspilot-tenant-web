import { apiRequest } from './client';
import type { PreviewMediaResponse, PreviewTextResponse } from '../types/preview';

export interface PreviewQueryParams {
  bucket_name: string;
  object_key: string;
}

function buildQuery(params: PreviewQueryParams): string {
  const search = new URLSearchParams({
    bucket_name: params.bucket_name,
    object_key: params.object_key,
  });
  return search.toString();
}

export function fetchTextPreview(params: PreviewQueryParams): Promise<PreviewTextResponse> {
  return apiRequest<PreviewTextResponse>(`/api/preview/text?${buildQuery(params)}`);
}

export function fetchImagePreview(params: PreviewQueryParams): Promise<PreviewMediaResponse> {
  return apiRequest<PreviewMediaResponse>(`/api/preview/image?${buildQuery(params)}`);
}

export function fetchVideoPreview(params: PreviewQueryParams): Promise<PreviewMediaResponse> {
  return apiRequest<PreviewMediaResponse>(`/api/preview/video?${buildQuery(params)}`);
}

export function fetchAudioPreview(params: PreviewQueryParams): Promise<PreviewMediaResponse> {
  return apiRequest<PreviewMediaResponse>(`/api/preview/audio?${buildQuery(params)}`);
}

export function fetchPdfPreview(params: PreviewQueryParams): Promise<PreviewMediaResponse> {
  return apiRequest<PreviewMediaResponse>(`/api/preview/pdf?${buildQuery(params)}`);
}
