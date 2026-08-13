import type { PreviewKind } from '../types/preview';

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg']);
const VIDEO_EXTENSIONS = new Set(['mp4', 'webm', 'mov', 'mkv']);
const AUDIO_EXTENSIONS = new Set(['mp3', 'wav', 'flac', 'aac', 'ogg']);
const PDF_EXTENSIONS = new Set(['pdf']);
const TEXT_EXTENSIONS = new Set([
  'txt',
  'md',
  'json',
  'yaml',
  'yml',
  'xml',
  'csv',
  'log',
  'conf',
  'ini',
  'sh',
  'py',
  'js',
  'ts',
  'java',
  'go',
  'sql',
]);

function fileExtension(key: string): string {
  const basename = key.split('/').pop() ?? key;
  const dot = basename.lastIndexOf('.');
  if (dot < 0) {
    return '';
  }
  return basename.slice(dot + 1).toLowerCase();
}

function isTextContentType(contentType: string | null | undefined): boolean {
  if (!contentType) {
    return false;
  }
  const lower = contentType.toLowerCase();
  return (
    lower.startsWith('text/') ||
    lower === 'application/json' ||
    lower === 'application/xml' ||
    lower === 'application/yaml' ||
    lower === 'application/x-yaml'
  );
}

export function detectPreviewKind(
  objectKey: string,
  contentType?: string | null,
): PreviewKind {
  const ext = fileExtension(objectKey);
  if (IMAGE_EXTENSIONS.has(ext)) {
    return 'image';
  }
  if (VIDEO_EXTENSIONS.has(ext)) {
    return 'video';
  }
  if (AUDIO_EXTENSIONS.has(ext)) {
    return 'audio';
  }
  if (PDF_EXTENSIONS.has(ext)) {
    return 'pdf';
  }
  if (TEXT_EXTENSIONS.has(ext) || isTextContentType(contentType)) {
    return 'text';
  }
  return 'unsupported';
}

export function isPreviewable(objectKey: string, contentType?: string | null): boolean {
  return detectPreviewKind(objectKey, contentType) !== 'unsupported';
}

export function previewPagePath(bucketName: string, objectKey: string): string {
  const encodedBucket = encodeURIComponent(bucketName);
  const params = new URLSearchParams({ key: objectKey });
  return `/buckets/${encodedBucket}/preview?${params.toString()}`;
}
