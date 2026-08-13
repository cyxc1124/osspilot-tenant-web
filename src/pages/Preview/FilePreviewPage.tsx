import { useCallback } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeftOutlined, DownloadOutlined } from '@ant-design/icons';
import { Breadcrumb, Button, Space, Typography, message } from 'antd';
import { presignDownload } from '../../api/downloads';
import { ApiError } from '../../api/client';
import FilePreviewContent from '../../components/preview/FilePreviewContent';
import { useT } from '../../i18n';
import styles from './FilePreviewPage.module.css';

const { Title, Text } = Typography;

export default function FilePreviewPage() {
  const t = useT();
  const { bucketName: rawBucketName } = useParams<{ bucketName: string }>();
  const [searchParams] = useSearchParams();
  const bucketName = rawBucketName ? decodeURIComponent(rawBucketName) : '';
  const objectKey = searchParams.get('key') ?? '';
  const filename = objectKey.split('/').pop() ?? objectKey;

  const handleDownload = useCallback(async () => {
    if (!bucketName || !objectKey) {
      return;
    }
    try {
      const result = await presignDownload({
        bucket_name: bucketName,
        object_key: objectKey,
      });
      const anchor = document.createElement('a');
      anchor.href = result.download_url;
      anchor.download = filename;
      anchor.rel = 'noopener';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } catch (err) {
      const text = err instanceof ApiError ? err.message : t('common.getDownloadUrlFailed');
      message.error(text);
    }
  }, [bucketName, objectKey, filename, t]);

  if (!bucketName || !objectKey) {
    return (
      <div className={styles.page}>
        <Text type="danger">{t('preview.missingParams')}</Text>
      </div>
    );
  }

  const target = {
    bucketName,
    objectKey,
  };

  return (
    <div className={styles.page}>
      <Breadcrumb
        className={styles.breadcrumb}
        items={[
          { title: <Link to="/buckets">{t('nav.buckets')}</Link> },
          {
            title: (
              <Link to={`/buckets/${encodeURIComponent(bucketName)}`}>{bucketName}</Link>
            ),
          },
          { title: filename },
        ]}
      />

      <div className={styles.header}>
        <Space>
          <Link to={`/buckets/${encodeURIComponent(bucketName)}`}>
            <Button type="text" icon={<ArrowLeftOutlined />} />
          </Link>
          <Title level={4} className={styles.title}>
            {filename}
          </Title>
        </Space>
        <Button icon={<DownloadOutlined />} onClick={() => void handleDownload()}>
          {t('common.download')}
        </Button>
      </div>

      <Text type="secondary" className={styles.meta}>
        {objectKey}
      </Text>

      <div className={styles.previewPane}>
        <FilePreviewContent target={target} />
      </div>
    </div>
  );
}
