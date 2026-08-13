import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  CopyOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  HistoryOutlined,
  FolderAddOutlined,
  FolderOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
  ShareAltOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Breadcrumb,
  Button,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tooltip,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { getBucket, listBuckets } from '../../api/buckets';
import { batchPresignDownload, presignDownload } from '../../api/downloads';
import {
  copyObjects,
  createDirectory,
  deleteObjects,
  listObjects,
  moveObjects,
} from '../../api/objects';
import { ApiError } from '../../api/client';
import { useT } from '../../i18n';
import FileUploadPanel from '../../components/files/FileUploadPanel';
import ShareLinkModal from '../../components/files/ShareLinkModal';
import FileVersionDrawer from '../../components/files/FileVersionDrawer';
import FileDetailDrawer from '../../components/files/FileDetailDrawer';
import FilePreviewDrawer from '../../components/preview/FilePreviewDrawer';
import { isOfficeFile, isTextEditable } from '../../lib/edit';
import { bucketPrimaryLabel, bucketSelectLabel } from '../../lib/bucket';
import { isPreviewable } from '../../lib/preview';
import type { PreviewTarget } from '../../types/preview';
import type { FileVersionTarget } from '../../types/version';
import {
  folderDisplayName,
  formatBytes,
  formatDateTime,
  prefixBreadcrumbSegments,
} from '../../lib/format';
import { isTenantAdmin } from '../../lib/roles';
import { useAuthStore } from '../../stores/authStore';
import type { FileDetailTarget, ObjectSummary } from '../../types/object';
import styles from './FilesPage.module.css';

const PAGE_SIZE = 50;
type FileRow = ObjectSummary & { kind: 'file' };
type FolderRow = { kind: 'folder'; key: string; name: string };
type BrowseRow = FileRow | FolderRow;

export default function FilesPage() {
  const t = useT();
  const navigate = useNavigate();
  const { bucketName: rawBucketName } = useParams<{ bucketName: string }>();
  const bucketName = rawBucketName ? decodeURIComponent(rawBucketName) : '';
  const user = useAuthStore((s) => s.user);
  const isAdmin = isTenantAdmin(user);
  const queryClient = useQueryClient();

  const [activePrefix, setActivePrefix] = useState('');
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [tokenStack, setTokenStack] = useState<(string | null)[]>([null]);
  const [pageIndex, setPageIndex] = useState(0);
  const [shareTarget, setShareTarget] = useState<string | null>(null);
  const [previewTarget, setPreviewTarget] = useState<PreviewTarget | null>(null);
  const [versionTarget, setVersionTarget] = useState<FileVersionTarget | null>(null);
  const [detailTarget, setDetailTarget] = useState<FileDetailTarget | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const bucketQuery = useQuery({
    queryKey: ['bucket', bucketName],
    queryFn: () => getBucket(bucketName),
    enabled: Boolean(bucketName),
  });
  const bucketMeta = bucketQuery.data;
  const [newFolderName, setNewFolderName] = useState('');
  const [targetPrefixModal, setTargetPrefixModal] = useState<'copy' | 'move' | null>(null);
  const [targetPrefix, setTargetPrefix] = useState('');
  const [targetBucketName, setTargetBucketName] = useState('');

  const bucketsQuery = useQuery({
    queryKey: ['buckets'],
    queryFn: () => listBuckets(),
    enabled: targetPrefixModal === 'copy',
  });

  const continuationToken = tokenStack[pageIndex] ?? null;

  const { data, isLoading, isFetching, refetch, error } = useQuery({
    queryKey: ['objects', bucketName, activePrefix, pageIndex, continuationToken],
    queryFn: () =>
      listObjects(bucketName, {
        prefix: activePrefix || undefined,
        maxKeys: PAGE_SIZE,
        continuationToken,
      }),
    enabled: Boolean(bucketName),
  });

  const resetPagination = useCallback(() => {
    setTokenStack([null]);
    setPageIndex(0);
  }, []);

  const navigateToPrefix = useCallback(
    (prefix: string) => {
      setActivePrefix(prefix);
      resetPagination();
      setSelectedKeys([]);
    },
    [resetPagination],
  );

  const invalidateList = (targetBucket: string) => {
    void queryClient.invalidateQueries({ queryKey: ['objects', targetBucket] });
    void queryClient.invalidateQueries({ queryKey: ['buckets'] });
  };

  const deleteMutation = useMutation({
    mutationFn: ({
      bucketName: targetBucket,
      keys,
      permanent,
    }: {
      bucketName: string;
      keys: string[];
      permanent?: boolean;
    }) => deleteObjects(targetBucket, keys, { permanent }),
    onSuccess: (result, { bucketName: targetBucket }) => {
      if (result.status === 'queued') {
        message.success(t('files.deleteQueued', { count: result.queued_count ?? selectedKeys.length }));
      } else if (result.deleted.length > 0) {
        message.success(t('files.deletedCount', { count: result.deleted.length }));
      }
      if (result.failed.length > 0) {
        message.warning(t('files.deleteFailedCount', { count: result.failed.length }));
      }
      setSelectedKeys([]);
      invalidateList(targetBucket);
    },
    onError: (err) => {
      const text = err instanceof ApiError ? err.message : t('common.deleteFailed');
      message.error(text);
    },
  });

  const createDirectoryMutation = useMutation({
    mutationFn: ({
      bucketName: targetBucket,
      name,
      parentPrefix,
    }: {
      bucketName: string;
      name: string;
      parentPrefix: string;
    }) =>
      createDirectory(targetBucket, {
        name,
        parent_prefix: parentPrefix,
      }),
    onSuccess: (_result, { bucketName: targetBucket }) => {
      message.success(t('files.dirCreated'));
      setCreateModalOpen(false);
      setNewFolderName('');
      invalidateList(targetBucket);
    },
    onError: (err) => {
      const text = err instanceof ApiError ? err.message : t('files.createDirFailed');
      message.error(text);
    },
  });

  const copyMutation = useMutation({
    mutationFn: ({
      bucketName: targetBucket,
      items,
    }: {
      bucketName: string;
      items: { source_key: string; dest_key: string; dest_bucket_name?: string }[];
    }) => copyObjects(targetBucket, { items }),
    onSuccess: (result, { bucketName: targetBucket }) => {
      if (result.status === 'queued') {
        message.success(t('files.copyQueued', { count: result.queued_count ?? 0 }));
      } else if (result.copied.length > 0) {
        message.success(t('files.copiedCount', { count: result.copied.length }));
      }
      if (result.failed.length > 0) {
        message.warning(t('files.copyFailedCount', { count: result.failed.length }));
      }
      setSelectedKeys([]);
      setTargetPrefixModal(null);
      setTargetPrefix('');
      setTargetBucketName('');
      invalidateList(targetBucket);
    },
    onError: (err) => {
      const text = err instanceof ApiError ? err.message : t('files.copyFailed');
      message.error(text);
    },
  });

  const moveMutation = useMutation({
    mutationFn: ({
      bucketName: targetBucket,
      items,
    }: {
      bucketName: string;
      items: { source_key: string; dest_key: string }[];
    }) => moveObjects(targetBucket, { items }),
    onSuccess: (result, { bucketName: targetBucket }) => {
      if (result.status === 'queued') {
        message.success(t('files.moveQueued', { count: result.queued_count ?? 0 }));
      } else if (result.moved.length > 0) {
        message.success(t('files.movedCount', { count: result.moved.length }));
      }
      if (result.failed.length > 0) {
        message.warning(t('files.moveFailedCount', { count: result.failed.length }));
      }
      setSelectedKeys([]);
      setTargetPrefixModal(null);
      setTargetPrefix('');
      setTargetBucketName('');
      invalidateList(targetBucket);
    },
    onError: (err) => {
      const text = err instanceof ApiError ? err.message : t('files.moveFailed');
      message.error(text);
    },
  });

  const handleBatchDownload = useCallback(async () => {
    if (selectedKeys.length === 0) {
      return;
    }
    try {
      const result = await batchPresignDownload({
        bucket_name: bucketName,
        keys: selectedKeys,
      });
      let started = 0;
      for (const item of result.items) {
        if (!item.download_url) {
          continue;
        }
        const anchor = document.createElement('a');
        anchor.href = item.download_url;
        anchor.download = item.key.split('/').pop() ?? item.key;
        anchor.rel = 'noopener';
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        started += 1;
      }
      const failed = result.items.filter((item) => item.error).length;
      if (started > 0) {
        message.success(t('files.downloadStarted', { count: started }));
      }
      if (failed > 0) {
        message.warning(t('files.downloadLinkFailedCount', { count: failed }));
      }
    } catch (err) {
      const text = err instanceof ApiError ? err.message : t('files.batchDownloadFailed');
      message.error(text);
    }
  }, [bucketName, selectedKeys, t]);

  const buildDestKeys = useCallback(
    (prefix: string, destBucketName?: string) => {
      const normalized = prefix.trim().replace(/^\/+/, '');
      const withSlash = normalized && !normalized.endsWith('/') ? `${normalized}/` : normalized;
      const crossBucket =
        destBucketName && destBucketName !== bucketName ? destBucketName : undefined;
      return selectedKeys.map((key) => {
        const basename = key.split('/').pop() ?? key;
        const item = {
          source_key: key,
          dest_key: withSlash ? `${withSlash}${basename}` : basename,
        };
        return crossBucket ? { ...item, dest_bucket_name: crossBucket } : item;
      });
    },
    [bucketName, selectedKeys],
  );

  const submitTargetPrefixAction = () => {
    if (!targetPrefixModal) {
      return;
    }
    const destBucket = targetPrefixModal === 'copy' ? targetBucketName || bucketName : bucketName;
    const items = buildDestKeys(targetPrefix, destBucket);
    if (targetPrefixModal === 'copy') {
      copyMutation.mutate({ bucketName, items });
      return;
    }
    moveMutation.mutate({ bucketName, items });
  };

  const handleDownload = useCallback(
    async (key: string) => {
      try {
        const result = await presignDownload({
          bucket_name: bucketName,
          object_key: key,
        });
        const anchor = document.createElement('a');
        anchor.href = result.download_url;
        anchor.download = key.split('/').pop() ?? key;
        anchor.rel = 'noopener';
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
      } catch (err) {
        const text = err instanceof ApiError ? err.message : t('common.getDownloadUrlFailed');
        message.error(text);
      }
    },
    [bucketName, t],
  );

  const isFolderKey = useCallback((key: string) => key.endsWith('/'), []);

  const selectionHasFolders = useMemo(
    () => selectedKeys.some((key) => isFolderKey(key)),
    [isFolderKey, selectedKeys],
  );

  const confirmDelete = useCallback(
    (keys: string[], permanent = false) => {
      const hasFolder = keys.some((key) => isFolderKey(key));
      const title = hasFolder
        ? keys.length === 1
          ? t('files.confirmDeleteFolderOne')
          : t('files.confirmDeleteFolderMany', { count: keys.length })
        : keys.length === 1
          ? t('files.confirmDeleteOne')
          : t('files.confirmDeleteMany', { count: keys.length });
      const hint = permanent ? t('files.deletePermanentHint') : t('files.deleteTrashHint');
      const content = hasFolder ? `${t('files.deleteFolderRecursiveHint')}\n${hint}` : hint;

      Modal.confirm({
        title,
        content,
        okText: permanent ? t('common.permanentDelete') : t('common.delete'),
        okType: 'danger',
        cancelText: t('common.cancel'),
        onOk: () => deleteMutation.mutateAsync({ bucketName, keys, permanent }),
      });
    },
    [bucketName, deleteMutation, isFolderKey, t],
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

  const tableRows: BrowseRow[] = useMemo(() => {
    const folders: FolderRow[] = (data?.prefixes ?? []).map((prefix) => ({
      kind: 'folder',
      key: prefix,
      name: folderDisplayName(prefix, activePrefix),
    }));
    const files: FileRow[] = (data?.items ?? []).map((item) => ({
      ...item,
      kind: 'file' as const,
    }));
    return [...folders, ...files];
  }, [activePrefix, data?.items, data?.prefixes]);

  const breadcrumbItems = useMemo(() => {
    const items = [
      {
        title: (
          <button
            type="button"
            className={styles.crumbButton}
            onClick={() => navigateToPrefix('')}
          >
            {bucketPrimaryLabel({
              bucket_name: bucketName,
              display_name: bucketMeta?.display_name,
            })}
          </button>
        ),
      },
    ];
    for (const segment of prefixBreadcrumbSegments(activePrefix)) {
      items.push({
        title: (
          <button
            type="button"
            className={styles.crumbButton}
            onClick={() => navigateToPrefix(segment.prefix)}
          >
            {segment.label}
          </button>
        ),
      });
    }
    return items;
  }, [activePrefix, bucketMeta?.display_name, bucketName, navigateToPrefix]);

  const columns: ColumnsType<BrowseRow> = useMemo(
    () => [
      {
        title: t('files.columnName'),
        dataIndex: 'key',
        ellipsis: true,
        render: (_: string, record) => {
          if (record.kind === 'folder') {
            return (
              <Button
                type="link"
                className={styles.folderLink}
                icon={<FolderOutlined />}
                onClick={() => navigateToPrefix(record.key)}
              >
                {record.name}
              </Button>
            );
          }
          const name = record.key.split('/').pop() ?? record.key;
          return (
            <Tooltip title={t('files.nameOpensDetail')}>
              <Button
                type="link"
                className={styles.fileLink}
                onClick={() =>
                  setDetailTarget({
                    bucketName,
                    objectKey: record.key,
                  })
                }
              >
                {name}
              </Button>
            </Tooltip>
          );
        },
      },
      {
        title: t('files.columnSize'),
        dataIndex: 'size',
        width: 110,
        render: (value: number | undefined, record) =>
          record.kind === 'folder' ? t('common.emDash') : formatBytes(value ?? 0),
      },
      {
        title: t('files.columnType'),
        dataIndex: 'content_type',
        width: 140,
        ellipsis: true,
        render: (value: string | null | undefined, record) =>
          record.kind === 'folder' ? t('common.folder') : (value ?? t('common.emDash')),
      },
      {
        title: t('files.columnModified'),
        dataIndex: 'last_modified',
        width: 170,
        render: (value: string | null | undefined, record) =>
          record.kind === 'folder' ? t('common.emDash') : formatDateTime(value ?? null),
      },
      {
        title: t('common.actions'),
        width: 380,
        fixed: 'right',
        render: (_: unknown, record) =>
          record.kind === 'folder' ? (
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => confirmDelete([record.key])}
            >
              {t('common.delete')}
            </Button>
          ) : record.kind === 'file' ? (
            <Space wrap>
              <Button
                type="link"
                size="small"
                icon={<InfoCircleOutlined />}
                onClick={() =>
                  setDetailTarget({
                    bucketName,
                    objectKey: record.key,
                  })
                }
              >
                {t('files.detail')}
              </Button>
              {isTextEditable(record.key, record.content_type) ? (
                <Button
                  type="link"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() =>
                    navigate(
                      `/editor/text?bucket=${encodeURIComponent(bucketName)}&key=${encodeURIComponent(record.key)}`,
                    )
                  }
                >
                  {t('files.textEdit')}
                </Button>
              ) : null}
              {isOfficeFile(record.key) ? (
                <Button
                  type="link"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() =>
                    navigate(
                      `/editor/office?bucket=${encodeURIComponent(bucketName)}&key=${encodeURIComponent(record.key)}`,
                    )
                  }
                >
                  {t('files.officeEdit')}
                </Button>
              ) : null}
              {isPreviewable(record.key, record.content_type) ? (
                <Button
                  type="link"
                  size="small"
                  icon={<EyeOutlined />}
                  onClick={() =>
                    setPreviewTarget({
                      bucketName,
                      objectKey: record.key,
                      contentType: record.content_type,
                    })
                  }
                >
                  {t('files.preview')}
                </Button>
              ) : null}
              <Button
                type="link"
                size="small"
                icon={<HistoryOutlined />}
                onClick={() =>
                  setVersionTarget({
                    bucketName,
                    objectKey: record.key,
                  })
                }
              >
                {t('files.versions')}
              </Button>
              <Button
                type="link"
                size="small"
                icon={<DownloadOutlined />}
                onClick={() => void handleDownload(record.key)}
              >
                {t('common.download')}
              </Button>
              <Button
                type="link"
                size="small"
                icon={<ShareAltOutlined />}
                onClick={() => setShareTarget(record.key)}
              >
                {t('roles.share')}
              </Button>
              <Button
                type="link"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={() => confirmDelete([record.key])}
              >
                {t('common.delete')}
              </Button>
            </Space>
          ) : null,
      },
    ],
    [bucketName, confirmDelete, handleDownload, navigate, navigateToPrefix, t],
  );

  const loadError = error instanceof ApiError ? error.message : error ? t('common.loadFailed') : null;

  const handleCreateDirectory = () => {
    const trimmed = newFolderName.trim();
    if (!trimmed) {
      message.warning(t('files.dirNameRequired'));
      return;
    }
    createDirectoryMutation.mutate({ bucketName, name: trimmed, parentPrefix: activePrefix });
  };

  if (!bucketName) {
    return null;
  }

  return (
    <div className={styles.page}>
      <Breadcrumb className={styles.breadcrumb} items={breadcrumbItems} />

      <div className={styles.header}>
        <Space wrap>
          <Button
            icon={<FolderAddOutlined />}
            onClick={() => setCreateModalOpen(true)}
          >
            {t('files.newFolder')}
          </Button>
          <Button
            disabled={selectedKeys.length === 0 || selectionHasFolders}
            icon={<DownloadOutlined />}
            onClick={() => void handleBatchDownload()}
          >
            {t('files.batchDownload')}
          </Button>
          <Button
            disabled={selectedKeys.length === 0 || selectionHasFolders}
            icon={<CopyOutlined />}
            onClick={() => {
              setTargetPrefix('');
              setTargetBucketName(bucketName);
              setTargetPrefixModal('copy');
            }}
          >
            {t('files.batchCopy')}
          </Button>
          <Button
            disabled={selectedKeys.length === 0 || selectionHasFolders}
            icon={<SwapOutlined />}
            onClick={() => {
              setTargetPrefix('');
              setTargetPrefixModal('move');
            }}
          >
            {t('files.batchMove')}
          </Button>
          {isAdmin ? (
            <Button
              danger
              disabled={selectedKeys.length === 0}
              onClick={() => confirmDelete(selectedKeys, true)}
            >
              {t('common.permanentDelete')}
            </Button>
          ) : null}
          <Button
            danger
            disabled={selectedKeys.length === 0}
            icon={<DeleteOutlined />}
            onClick={() => confirmDelete(selectedKeys)}
          >
            {t('files.batchDelete')}
          </Button>
          <Button icon={<ReloadOutlined />} onClick={() => void refetch()} loading={isFetching}>
            {t('common.refresh')}
          </Button>
        </Space>
      </div>

      <FileUploadPanel
        bucketName={bucketName}
        prefix={activePrefix}
        onUploaded={() => invalidateList(bucketName)}
      />

      <div className={styles.tableWrap}>
        <Table
          rowKey="key"
          loading={isLoading}
          columns={columns}
          dataSource={tableRows}
          scroll={{ x: 980 }}
          locale={{ emptyText: loadError ?? t('files.emptyDir') }}
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

      <ShareLinkModal
        open={shareTarget !== null}
        bucketName={bucketName}
        objectKey={shareTarget ?? ''}
        onClose={() => setShareTarget(null)}
      />

      <FilePreviewDrawer
        open={previewTarget !== null}
        target={previewTarget}
        onClose={() => setPreviewTarget(null)}
      />

      <FileVersionDrawer
        open={versionTarget !== null}
        target={versionTarget}
        onClose={() => setVersionTarget(null)}
      />

      <FileDetailDrawer
        open={detailTarget !== null}
        target={detailTarget}
        onClose={() => setDetailTarget(null)}
      />

      <Modal
        title={t('files.newFolderTitle')}
        open={createModalOpen}
        okText={t('common.create')}
        cancelText={t('common.cancel')}
        confirmLoading={createDirectoryMutation.isPending}
        onOk={handleCreateDirectory}
        onCancel={() => {
          setCreateModalOpen(false);
          setNewFolderName('');
        }}
      >
        <p className={styles.modalHint}>
          {t('files.newFolderHint')}
        </p>
        <Input
          value={newFolderName}
          onChange={(event) => setNewFolderName(event.target.value)}
          onPressEnter={handleCreateDirectory}
          placeholder={t('files.newFolderPlaceholder')}
          maxLength={255}
          autoFocus
        />
      </Modal>

      <Modal
        title={targetPrefixModal === 'copy' ? t('files.batchCopyTo') : t('files.batchMoveTo')}
        open={targetPrefixModal !== null}
        okText={targetPrefixModal === 'copy' ? t('files.copy') : t('files.move')}
        cancelText={t('common.cancel')}
        confirmLoading={copyMutation.isPending || moveMutation.isPending}
        onOk={submitTargetPrefixAction}
        onCancel={() => {
          setTargetPrefixModal(null);
          setTargetPrefix('');
          setTargetBucketName('');
        }}
      >
        {targetPrefixModal === 'copy' ? (
          <>
            <p className={styles.modalHint}>{t('files.destBucketHint')}</p>
            <Select
              value={targetBucketName || bucketName}
              onChange={setTargetBucketName}
              options={(bucketsQuery.data?.items ?? []).map((bucket) => ({
                value: bucket.bucket_name,
                label: bucketSelectLabel(bucket),
              }))}
              loading={bucketsQuery.isLoading}
              style={{ width: '100%', marginBottom: 12 }}
            />
          </>
        ) : null}
        <p className={styles.modalHint}>
          {t('files.targetPrefixHint', { count: selectedKeys.length })}
        </p>
        <Input
          value={targetPrefix}
          onChange={(event) => setTargetPrefix(event.target.value)}
          onPressEnter={submitTargetPrefixAction}
          placeholder={t('files.targetPrefixPlaceholder')}
          autoFocus
        />
      </Modal>

    </div>
  );
}
