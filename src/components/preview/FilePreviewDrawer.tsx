import { Link } from 'react-router-dom';
import { DownloadOutlined, ExportOutlined } from '@ant-design/icons';
import { Button, Drawer, Space, Typography, message } from 'antd';
import { presignDownload } from '../../api/downloads';
import { ApiError } from '../../api/client';
import { useT } from '../../i18n';
import { previewPagePath } from '../../lib/preview';
import type { PreviewTarget } from '../../types/preview';
import FilePreviewContent from './FilePreviewContent';
import styles from './FilePreviewDrawer.module.css';

const { Text } = Typography;

interface FilePreviewDrawerProps {
  open: boolean;
  target: PreviewTarget | null;
  onClose: () => void;
}

export default function FilePreviewDrawer({ open, target, onClose }: FilePreviewDrawerProps) {
  const t = useT();
  const filename = target?.objectKey.split('/').pop() ?? '';

  const handleDownload = async () => {
    if (!target) {
      return;
    }
    try {
      const result = await presignDownload({
        bucket_name: target.bucketName,
        object_key: target.objectKey,
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
  };

  return (
    <Drawer
      title={filename || t('preview.title')}
      open={open}
      onClose={onClose}
      width="min(960px, 92vw)"
      destroyOnClose
      extra={
        target ? (
          <Space>
            <Link to={previewPagePath(target.bucketName, target.objectKey)}>
              <Button type="text" icon={<ExportOutlined />}>
                {t('preview.openInNewTab')}
              </Button>
            </Link>
            <Button type="text" icon={<DownloadOutlined />} onClick={() => void handleDownload()}>
              {t('common.download')}
            </Button>
          </Space>
        ) : null
      }
    >
      {target ? (
        <div className={styles.body}>
          <Text type="secondary" className={styles.meta}>
            {target.objectKey}
          </Text>
          <FilePreviewContent target={target} />
        </div>
      ) : null}
    </Drawer>
  );
}
