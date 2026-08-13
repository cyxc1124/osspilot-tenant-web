import { useCallback, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  DeleteOutlined,
  ReloadOutlined,
  RollbackOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Modal,
  Space,
  Table,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { getPlatformConfig } from '../../api/platformConfig';
import { purgeTrash, restoreTrash, listTrash } from '../../api/trash';
import { ApiError } from '../../api/client';
import { useT } from '../../i18n';
import { formatBytes, formatDateTime } from '../../lib/format';
import type { TrashObjectSummary } from '../../types/trash';
import styles from './TrashPage.module.css';

const { Title, Paragraph } = Typography;
const PAGE_SIZE = 50;

export default function TrashPage() {
  const t = useT();
  const { bucketName: rawBucketName } = useParams<{ bucketName: string }>();
  const bucketName = rawBucketName ? decodeURIComponent(rawBucketName) : '';
  const queryClient = useQueryClient();

  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [tokenStack, setTokenStack] = useState<(string | null)[]>([null]);
  const [pageIndex, setPageIndex] = useState(0);

  const continuationToken = tokenStack[pageIndex] ?? null;

  const platformConfigQuery = useQuery({
    queryKey: ['platform-config'],
    queryFn: () => getPlatformConfig(),
  });

  const trashSubtitle = useMemo(() => {
    const config = platformConfigQuery.data;
    if (config?.trash_cleanup_enabled && config.trash_retention_days > 0) {
      return t('trash.bucketSubtitleWithRetention', {
        bucketName,
        days: config.trash_retention_days,
      });
    }
    return t('trash.bucketSubtitle', { bucketName });
  }, [bucketName, platformConfigQuery.data, t]);

  const { data, isLoading, isFetching, refetch, error } = useQuery({
    queryKey: ['trash', bucketName, pageIndex, continuationToken],
    queryFn: () =>
      listTrash(bucketName, {
        maxKeys: PAGE_SIZE,
        continuationToken,
      }),
    enabled: Boolean(bucketName),
  });

  const invalidateTrash = (targetBucket: string) => {
    void queryClient.invalidateQueries({ queryKey: ['trash', targetBucket] });
    void queryClient.invalidateQueries({ queryKey: ['objects', targetBucket] });
    void queryClient.invalidateQueries({ queryKey: ['buckets'] });
  };

  const restoreMutation = useMutation({
    mutationFn: ({ bucketName: targetBucket, keys }: { bucketName: string; keys: string[] }) =>
      restoreTrash(targetBucket, keys),
    onSuccess: (result, { bucketName: targetBucket }) => {
      if (result.succeeded.length > 0) {
        message.success(t('trash.restoredCount', { count: result.succeeded.length }));
      }
      if (result.failed.length > 0) {
        message.warning(t('trash.restoreFailedCount', { count: result.failed.length }));
      }
      setSelectedKeys([]);
      invalidateTrash(targetBucket);
    },
    onError: (err) => {
      const text = err instanceof ApiError ? err.message : t('trash.restoreFailed');
      message.error(text);
    },
  });

  const purgeMutation = useMutation({
    mutationFn: ({ bucketName: targetBucket, keys }: { bucketName: string; keys: string[] }) =>
      purgeTrash(targetBucket, keys),
    onSuccess: (result, { bucketName: targetBucket }) => {
      if (result.succeeded.length > 0) {
        message.success(t('trash.purgedCount', { count: result.succeeded.length }));
      }
      if (result.failed.length > 0) {
        message.warning(t('trash.purgeFailedCount', { count: result.failed.length }));
      }
      setSelectedKeys([]);
      invalidateTrash(targetBucket);
    },
    onError: (err) => {
      const text = err instanceof ApiError ? err.message : t('trash.purgeFailed');
      message.error(text);
    },
  });

  const confirmRestore = useCallback(
    (keys: string[]) => {
      Modal.confirm({
        title: keys.length === 1 ? t('trash.confirmRestoreOne') : t('trash.confirmRestoreMany', { count: keys.length }),
        okText: t('common.restore'),
        cancelText: t('common.cancel'),
        onOk: () => restoreMutation.mutateAsync({ bucketName, keys }),
      });
    },
    [bucketName, restoreMutation, t],
  );

  const confirmPurge = useCallback(
    (keys: string[]) => {
      Modal.confirm({
        title: keys.length === 1 ? t('trash.confirmPurgeOne') : t('trash.confirmPurgeMany', { count: keys.length }),
        content: t('trash.confirmPurgeDesc'),
        okText: t('common.permanentDelete'),
        okType: 'danger',
        cancelText: t('common.cancel'),
        onOk: () => purgeMutation.mutateAsync({ bucketName, keys }),
      });
    },
    [bucketName, purgeMutation, t],
  );

  const goNextPage = () => {
    if (!data?.is_truncated || !data.continuation_token) {
      return;
    }
    setTokenStack((prev) => {
      const next = [...prev];
      next[pageIndex + 1] = data.continuation_token;
      return next;
    });
    setPageIndex((value) => value + 1);
    setSelectedKeys([]);
  };

  const goPrevPage = () => {
    if (pageIndex === 0) {
      return;
    }
    setPageIndex((value) => value - 1);
    setSelectedKeys([]);
  };

  const columns: ColumnsType<TrashObjectSummary> = useMemo(
    () => [
      {
        title: t('trash.columnKey'),
        dataIndex: 'key',
        ellipsis: true,
      },
      {
        title: t('common.size'),
        dataIndex: 'size',
        width: 110,
        render: (value: number) => formatBytes(value),
      },
      {
        title: t('trash.columnDeletedAt'),
        dataIndex: 'last_modified',
        width: 170,
        render: (value: string | null) => formatDateTime(value),
      },
      {
        title: t('common.actions'),
        width: 200,
        render: (_: unknown, record) => (
          <Space>
            <Button
              type="link"
              size="small"
              icon={<RollbackOutlined />}
              onClick={() => confirmRestore([record.key])}
            >
              {t('common.restore')}
            </Button>
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => confirmPurge([record.key])}
            >
              {t('common.permanentDelete')}
            </Button>
          </Space>
        ),
      },
    ],
    [confirmPurge, confirmRestore, t],
  );

  const loadError = error instanceof ApiError ? error.message : error ? t('common.loadFailed') : null;

  if (!bucketName) {
    return <Alert type="error" message={t('common.missingBucketName')} />;
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <Title level={4} className={styles.title}>
            {t('trash.title')}
          </Title>
          <Paragraph type="secondary">{trashSubtitle}</Paragraph>
        </div>
        <Button icon={<ReloadOutlined />} onClick={() => void refetch()} loading={isFetching}>
          {t('common.refresh')}
        </Button>
      </div>

      <div className={styles.toolbar}>
        <Button
          icon={<RollbackOutlined />}
          disabled={selectedKeys.length === 0}
          onClick={() => confirmRestore(selectedKeys)}
        >
          {t('trash.batchRestore')}
        </Button>
        <Button
          danger
          icon={<DeleteOutlined />}
          disabled={selectedKeys.length === 0}
          onClick={() => confirmPurge(selectedKeys)}
        >
          {t('trash.batchPurge')}
        </Button>
      </div>

      <Table
        rowKey="key"
        loading={isLoading}
        columns={columns}
        dataSource={data?.items ?? []}
        locale={{ emptyText: loadError ?? t('trash.empty') }}
        rowSelection={{
          selectedRowKeys: selectedKeys,
          onChange: (keys) => setSelectedKeys(keys as string[]),
        }}
        pagination={false}
        footer={() => (
          <div className={styles.pager}>
            <Button disabled={pageIndex === 0} onClick={goPrevPage}>
              {t('common.previousPage')}
            </Button>
            <span className={styles.pageLabel}>{t('common.pageLabel', { page: pageIndex + 1 })}</span>
            <Button disabled={!data?.is_truncated} onClick={goNextPage}>
              {t('common.nextPage')}
            </Button>
          </div>
        )}
      />
    </div>
  );
}
