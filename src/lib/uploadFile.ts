import * as uploadsApi from '../api/uploads';
import { ApiError } from '../api/client';
import { t } from '../i18n';
import type { CompletedPart } from '../types/upload';

/** S3 multipart minimum part size; files at or above this use multipart upload. */
export const MULTIPART_THRESHOLD = 5 * 1024 * 1024;
const PART_SIZE = 5 * 1024 * 1024;
const MAX_CONCURRENT_PARTS = 4;
const PRESIGN_BATCH_SIZE = 100;

export interface UploadFileOptions {
  bucketName: string;
  objectKey: string;
  file: File;
  onProgress?: (percent: number) => void;
}

export interface UploadFileResult {
  objectKey: string;
  size: number;
}

function putBlob(
  url: string,
  blob: Blob,
  headers: Record<string, string>,
  onChunkProgress?: (loaded: number, total: number) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onChunkProgress) {
        onChunkProgress(event.loaded, event.total);
      }
    });
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.getResponseHeader('ETag') ?? '');
        return;
      }
      if (xhr.status === 403) {
        reject(new ApiError(403, t('common.permissionDenied')));
        return;
      }
      reject(new ApiError(xhr.status, t('common.uploadFailedHttp', { status: xhr.status })));
    });
    xhr.addEventListener('error', () => reject(new Error(t('common.networkError'))));
    xhr.addEventListener('abort', () => reject(new Error(t('common.uploadCancelled'))));
    xhr.open('PUT', url);
    for (const [key, value] of Object.entries(headers)) {
      xhr.setRequestHeader(key, value);
    }
    xhr.send(blob);
  });
}

async function uploadSimple(options: UploadFileOptions): Promise<UploadFileResult> {
  const { bucketName, objectKey, file, onProgress } = options;
  const presign = await uploadsApi.presignUpload({
    bucket_name: bucketName,
    object_key: objectKey,
    size: file.size,
    content_type: file.type || undefined,
  });

  await putBlob(presign.upload_url, file, presign.headers, (loaded, total) => {
    onProgress?.(Math.round((loaded / total) * 100));
  });

  await uploadsApi.completeUpload({
    bucket_name: bucketName,
    object_key: objectKey,
    task_id: presign.task_id,
  });

  onProgress?.(100);
  return { objectKey, size: file.size };
}

async function runConcurrent<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;

  async function runNext(): Promise<void> {
    const current = index;
    index += 1;
    if (current >= items.length) {
      return;
    }
    results[current] = await worker(items[current]);
    await runNext();
  }

  const runners = Array.from({ length: Math.min(concurrency, items.length) }, () => runNext());
  await Promise.all(runners);
  return results;
}

async function uploadMultipart(options: UploadFileOptions): Promise<UploadFileResult> {
  const { bucketName, objectKey, file, onProgress } = options;
  const init = await uploadsApi.initMultipartUpload({
    bucket_name: bucketName,
    object_key: objectKey,
    size: file.size,
    content_type: file.type || undefined,
  });

  const partCount = Math.ceil(file.size / PART_SIZE);
  const partNumbers = Array.from({ length: partCount }, (_, i) => i + 1);
  const partUrls = new Map<number, string>();

  for (let offset = 0; offset < partNumbers.length; offset += PRESIGN_BATCH_SIZE) {
    const batch = partNumbers.slice(offset, offset + PRESIGN_BATCH_SIZE);
    const presigned = await uploadsApi.presignMultipartParts({
      bucket_name: bucketName,
      object_key: objectKey,
      upload_id: init.upload_id,
      task_id: init.task_id,
      part_numbers: batch,
    });
    for (const part of presigned.parts) {
      partUrls.set(part.part_number, part.url);
    }
  }

  const uploadedBytes = new Array(partCount).fill(0);

  const updateOverallProgress = () => {
    const loaded = uploadedBytes.reduce((sum, value) => sum + value, 0);
    onProgress?.(Math.min(99, Math.round((loaded / file.size) * 100)));
  };

  try {
    const completedParts = await runConcurrent(partNumbers, MAX_CONCURRENT_PARTS, async (partNumber) => {
      const start = (partNumber - 1) * PART_SIZE;
      const end = Math.min(start + PART_SIZE, file.size);
      const blob = file.slice(start, end);
      const url = partUrls.get(partNumber);
      if (!url) {
        throw new Error(t('common.partMissingUrl', { part: partNumber }));
      }

      const etag = await putBlob(url, blob, {}, (loaded) => {
        uploadedBytes[partNumber - 1] = loaded;
        updateOverallProgress();
      });
      uploadedBytes[partNumber - 1] = blob.size;
      updateOverallProgress();

      return { part_number: partNumber, etag } satisfies CompletedPart;
    });

    completedParts.sort((a, b) => a.part_number - b.part_number);

    await uploadsApi.completeMultipartUpload({
      bucket_name: bucketName,
      object_key: objectKey,
      upload_id: init.upload_id,
      task_id: init.task_id,
      parts: completedParts,
    });

    onProgress?.(100);
    return { objectKey, size: file.size };
  } catch (error) {
    try {
      await uploadsApi.abortMultipartUpload({
        bucket_name: bucketName,
        object_key: objectKey,
        upload_id: init.upload_id,
        task_id: init.task_id,
      });
    } catch {
      // best-effort abort
    }
    throw error;
  }
}

export async function uploadFile(options: UploadFileOptions): Promise<UploadFileResult> {
  if (options.file.size <= 0) {
    throw new Error(t('common.fileEmpty'));
  }
  if (options.file.size < MULTIPART_THRESHOLD) {
    return uploadSimple(options);
  }
  return uploadMultipart(options);
}
