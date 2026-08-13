import {
  DeleteOutlined,
  DownloadOutlined,
  HistoryOutlined,
  RollbackOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Drawer, Empty, Modal, Space, Table, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { deleteVersion, downloadVersion, listVersions, restoreVersion } from '../../api/versions';
import { ApiError } from '../../api/client';
import { useT } from '../../i18n';
import { formatBytes, formatDateTime } from '../../lib/format';
import type { FileVersionSummary, FileVersionTarget } from '../../types/version';
import styles from './FileVersionDrawer.module.css';

const { Text } = Typography;

interface FileVersionDrawerProps {
  open: boolean;
  target: FileVersionTarget | null;
  onClose: () => void;
}

const SOURCE_KEYS: Record<string, string> = {
  text_edit: 'files.sourceTextEdit',
  editor: 'files.sourceOfficeEdit',
  restore: 'files.sourceRestore',
};

export default function FileVersionDrawer({ open, target, onClose }: FileVersionDrawerProps) {
  const t = useT();
  const queryClient = useQueryClient();
  const filename = target?.objectKey.split('/').pop() ?? '';

  const { data, isLoading, error } = useQuery({
    queryKey: ['versions', target?.bucketName, target?.objectKey],
    queryFn: () =>
      listVersions({
        bucketName: target!.bucketName,
        objectKey: target!.objectKey,
      }),
    enabled: open && Boolean(target?.bucketName && target?.objectKey),
  });

  const restoreMutation = useMutation({
    mutationFn: ({ versionId }: { versionId: number; bucketName: string }) =>
      restoreVersion(versionId),
    onSuccess: (result, { bucketName: targetBucket }) => {
      message.success(t('files.versionRestored', { version: result.version_no }));
      void queryClient.invalidateQueries({ queryKey: ['versions', targetBucket] });
      void queryClient.invalidateQueries({ queryKey: ['objects', targetBucket] });
    },
    onError: (err: unknown) => {
      const text = err instanceof ApiError ? err.message : t('trash.restoreFailed');
      message.error(text);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({
      versionId,
    }: {
      versionId: number;
      bucketName: string;
      objectKey: string;
    }) => deleteVersion(versionId),
    onSuccess: (_result, { bucketName: targetBucket, objectKey: targetKey }) => {
      message.success(t('files.versionDeleted'));
      void queryClient.invalidateQueries({
        queryKey: ['versions', targetBucket, targetKey],
      });
    },
    onError: (err: unknown) => {
      const text = err instanceof ApiError ? err.message : t('common.deleteFailed');
      message.error(text);
    },
  });

  const handleDownload = async (record: FileVersionSummary) => {
    try {
      const result = await downloadVersion(record.id);
      const anchor = document.createElement('a');
      anchor.href = result.download_url;
      anchor.download = result.filename;
      anchor.rel = 'noopener';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } catch (err) {
      const text = err instanceof ApiError ? err.message : t('common.getDownloadUrlFailed');
      message.error(text);
    }
  };

  const confirmRestore = (record: FileVersionSummary) => {
    Modal.confirm({
      title: t('files.confirmRestoreVersion', { version: record.version_no }),
      content: t('files.confirmRestoreVersionDesc'),
      okText: t('common.restore'),
      cancelText: t('common.cancel'),
      onOk: () =>
        restoreMutation.mutateAsync({
          versionId: record.id,
          bucketName: target!.bucketName,
        }),
    });
  };

  const confirmDelete = (record: FileVersionSummary) => {
    Modal.confirm({
      title: t('files.confirmDeleteVersion', { version: record.version_no }),
      content: t('files.confirmDeleteVersionDesc'),
      okText: t('common.delete'),
      okType: 'danger',
      cancelText: t('common.cancel'),
      onOk: () =>
        deleteMutation.mutateAsync({
          versionId: record.id,
          bucketName: target!.bucketName,
          objectKey: target!.objectKey,
        }),
    });
  };

  const sourceLabel = (source: string): string => {
    const key = SOURCE_KEYS[source];
    return key ? t(key) : source;
  };

  const columns: ColumnsType<FileVersionSummary> = [
    {
      title: t('files.versionNo'),
      dataIndex: 'version_no',
      width: 72,
      render: (value: number) => `v${value}`,
    },
    {
      title: t('files.savedBy'),
      dataIndex: 'created_by_username',
      width: 100,
      ellipsis: true,
      render: (value: string | null, record) => value ?? `#${record.created_by}`,
    },
    {
      title: t('common.time'),
      dataIndex: 'created_at',
      width: 160,
      render: (value: string) => formatDateTime(value),
    },
    {
      title: t('common.size'),
      dataIndex: 'size',
      width: 90,
      render: (value: number) => formatBytes(value),
    },
    {
      title: t('files.source'),
      dataIndex: 'source',
      width: 100,
      render: (value: string) => sourceLabel(value),
    },
    {
      title: t('common.actions'),
      width: 200,
      render: (_: unknown, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<DownloadOutlined />}
            onClick={() => void handleDownload(record)}
          >
            {t('common.download')}
          </Button>
          <Button
            type="link"
            size="small"
            icon={<RollbackOutlined />}
            onClick={() => confirmRestore(record)}
          >
            {t('common.restore')}
          </Button>
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => confirmDelete(record)}
          >
            {t('common.delete')}
          </Button>
        </Space>
      ),
    },
  ];

  const loadError = error instanceof ApiError ? error.message : error ? t('common.loadFailed') : null;

  return (
    <Drawer
      title={
        <Space>
          <HistoryOutlined />
          <span>{t('files.versionTitle', { filename: filename || t('files.versionFile') })}</span>
        </Space>
      }
      open={open}
      onClose={onClose}
      width="min(880px, 92vw)"
      destroyOnClose
    >
      {target ? (
        <div className={styles.body}>
          <Text type="secondary" className={styles.meta}>
            {target.objectKey}
          </Text>
          {loadError ? (
            <Text type="danger">{loadError}</Text>
          ) : (
            <Table
              rowKey="id"
              size="small"
              loading={isLoading}
              columns={columns}
              dataSource={data?.items ?? []}
              pagination={false}
              locale={{
                emptyText: (
                  <Empty
                    className={styles.empty}
                    description={t('files.versionEmpty')}
                  />
                ),
              }}
            />
          )}
        </div>
      ) : null}
    </Drawer>
  );
}
