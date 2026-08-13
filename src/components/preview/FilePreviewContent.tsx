import { useQuery } from '@tanstack/react-query';
import { Alert, Spin } from 'antd';
import {
  fetchAudioPreview,
  fetchImagePreview,
  fetchPdfPreview,
  fetchTextPreview,
  fetchVideoPreview,
} from '../../api/preview';
import { ApiError } from '../../api/client';
import { t, useT } from '../../i18n';
import { detectPreviewKind } from '../../lib/preview';
import type { PreviewKind, PreviewTarget } from '../../types/preview';
import AudioPreview from './AudioPreview';
import ImagePreview from './ImagePreview';
import PdfPreview from './PdfPreview';
import TextPreview from './TextPreview';
import VideoPreview from './VideoPreview';

interface FilePreviewContentProps {
  target: PreviewTarget;
}

async function loadPreview(target: PreviewTarget, kind: PreviewKind) {
  const params = {
    bucket_name: target.bucketName,
    object_key: target.objectKey,
  };

  switch (kind) {
    case 'text':
      return { kind, data: await fetchTextPreview(params) };
    case 'image':
      return { kind, data: await fetchImagePreview(params) };
    case 'video':
      return { kind, data: await fetchVideoPreview(params) };
    case 'audio':
      return { kind, data: await fetchAudioPreview(params) };
    case 'pdf':
      return { kind, data: await fetchPdfPreview(params) };
    default:
      throw new ApiError(400, t('preview.unsupportedType'));
  }
}

export default function FilePreviewContent({ target }: FilePreviewContentProps) {
  const tr = useT();
  const kind = detectPreviewKind(target.objectKey, target.contentType);

  const { data, isLoading, error } = useQuery({
    queryKey: ['preview', kind, target.bucketName, target.objectKey],
    queryFn: () => loadPreview(target, kind),
    enabled: kind !== 'unsupported',
    retry: false,
  });

  if (kind === 'unsupported') {
    return (
      <Alert
        type="info"
        showIcon
        message={tr('preview.unsupportedTitle')}
        description={tr('preview.unsupportedDesc')}
      />
    );
  }

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <Spin size="large" tip={tr('preview.loading')} />
      </div>
    );
  }

  if (error) {
    const message = error instanceof ApiError ? error.message : tr('preview.loadFailed');
    return <Alert type="error" showIcon message={message} />;
  }

  if (!data) {
    return null;
  }

  switch (data.kind) {
    case 'text':
      return (
        <TextPreview
          content={data.data.content}
          language={data.data.language}
          truncated={data.data.truncated}
        />
      );
    case 'image':
      return <ImagePreview url={data.data.preview_url} filename={data.data.filename} />;
    case 'video':
      return (
        <VideoPreview url={data.data.preview_url} contentType={data.data.content_type} />
      );
    case 'audio':
      return (
        <AudioPreview url={data.data.preview_url} contentType={data.data.content_type} />
      );
    case 'pdf':
      return <PdfPreview url={data.data.preview_url} filename={data.data.filename} />;
    default:
      return null;
  }
}
