export type PreviewKind = 'text' | 'image' | 'video' | 'audio' | 'pdf' | 'unsupported';

export interface PreviewMediaResponse {
  preview_url: string;
  expires_in: number;
  content_type: string | null;
  size: number;
  filename: string;
}

export interface PreviewTextResponse {
  content: string;
  language: string;
  content_type: string | null;
  size: number;
  filename: string;
  truncated: boolean;
}

export interface PreviewTarget {
  bucketName: string;
  objectKey: string;
  contentType?: string | null;
}
