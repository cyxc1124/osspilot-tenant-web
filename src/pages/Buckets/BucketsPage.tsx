import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { DeleteOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Popconfirm, Space, Table, Tag, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { deleteBucket, listBuckets } from '../../api/buckets';
import { ApiError } from '../../api/client';
import BucketLabel from '../../components/buckets/BucketLabel';
import CreateBucketModal from '../../components/buckets/CreateBucketModal';
import { useT } from '../../i18n';
import { formatBytes, formatDateTime } from '../../lib/format';
import type { BucketSummary } from '../../types/bucket';
import styles from './BucketsPage.module.css';

const { Title, Paragraph } = Typography;

export default function BucketsPage() {
  const t = useT();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading, isFetching, refetch, error } = useQuery({
    queryKey: ['buckets'],
    queryFn: () => listBuckets(),
  });

  const deleteMutation = useMutation({
    mutationFn: (bucketName: string) => deleteBucket(bucketName),
    onSuccess: () => {
      message.success(t('buckets.deleted'));
      void queryClient.invalidateQueries({ queryKey: ['buckets'] });
    },
    onError: (err) => {
      const text = err instanceof ApiError ? err.message : t('common.deleteFailed');
      message.error(text);
    },
  });

  const columns: ColumnsType<BucketSummary> = useMemo(
    () => [
      {
        title: t('buckets.columnBucket'),
        dataIndex: 'bucket_name',
        render: (name: string, record) => (
          <Link to={`/buckets/${encodeURIComponent(name)}`}>
            <BucketLabel
              bucket_name={name}
              display_name={record.display_name}
              display_alias_only={record.display_alias_only}
            />
          </Link>
        ),
      },
      {
        title: t('buckets.columnObjectCount'),
        dataIndex: 'object_count',
        width: 100,
      },
      {
        title: t('buckets.columnUsedBytes'),
        dataIndex: 'used_bytes',
        width: 120,
        render: (value: number) => formatBytes(value),
      },
      {
        title: t('buckets.columnStatus'),
        dataIndex: 'status',
        width: 100,
        render: (status: string) => (
          <Tag color={status === 'active' ? 'success' : 'default'}>{status}</Tag>
        ),
      },
      {
        title: t('buckets.columnCreatedAt'),
        dataIndex: 'created_at',
        width: 170,
        render: (value: string) => formatDateTime(value),
      },
      {
        title: t('common.actions'),
        width: 180,
        render: (_: unknown, record) => (
          <Space className={styles.actions}>
            <Link to={`/buckets/${encodeURIComponent(record.bucket_name)}`}>{t('buckets.viewList')}</Link>
            <Popconfirm
              title={t('buckets.confirmDeleteTitle')}
              description={t('buckets.confirmDeleteDesc')}
              okText={t('common.delete')}
              cancelText={t('common.cancel')}
              okButtonProps={{ danger: true, loading: deleteMutation.isPending }}
              onConfirm={() => deleteMutation.mutate(record.bucket_name)}
            >
              <Button type="link" danger size="small" icon={<DeleteOutlined />}>
                {t('common.delete')}
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [deleteMutation, t],
  );

  const loadError = error instanceof ApiError ? error.message : error ? t('common.loadFailed') : null;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <Title level={4} className={styles.title}>
            {t('buckets.title')}
          </Title>
          <Paragraph type="secondary" className={styles.subtitle}>
            {t('buckets.subtitle')}
          </Paragraph>
        </div>
        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={() => void refetch()} loading={isFetching}>
            {t('common.refresh')}
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
            {t('buckets.create')}
          </Button>
        </Space>
      </div>

      <Table
        rowKey="bucket_name"
        loading={isLoading}
        columns={columns}
        dataSource={data?.items ?? []}
        locale={{ emptyText: loadError ?? t('buckets.empty') }}
        pagination={{ pageSize: 20, showSizeChanger: false }}
      />

      <CreateBucketModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
    </div>
  );
}
