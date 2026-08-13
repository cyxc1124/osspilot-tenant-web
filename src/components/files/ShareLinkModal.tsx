import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CopyOutlined, LinkOutlined, PlusOutlined, StopOutlined } from '@ant-design/icons';
import {
  Badge,
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Space,
  Spin,
  Switch,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { createShareLink, listShareLinks, revokeShareLink } from '../../api/share';
import { ApiError } from '../../api/client';
import { formatDateTime, useT } from '../../i18n';
import type { ShareLinkItem } from '../../types/share';
import styles from './ShareLinkModal.module.css';

const { Text } = Typography;

type ShareTab = 'existing' | 'create';

interface ShareLinkModalProps {
  open: boolean;
  bucketName: string;
  objectKey: string;
  onClose: () => void;
}

interface ShareFormValues {
  expires_at?: Dayjs;
  password?: string;
  max_access_count?: number;
  allow_download: boolean;
  allow_preview: boolean;
}

function buildShareUrl(sharePath: string): string {
  return `${window.location.origin.replace(/\/$/, '')}${sharePath}`;
}

function shareLinksQueryKey(bucketName: string, objectKey: string) {
  return ['share-links', bucketName, objectKey] as const;
}

function ShareLinkCard({
  item,
  revoking,
  onCopy,
  onRevoke,
}: {
  item: ShareLinkItem;
  revoking: boolean;
  onCopy: (item: ShareLinkItem) => void;
  onRevoke: (linkId: number) => void;
}) {
  const t = useT();
  const shareUrl = buildShareUrl(item.share_path);

  const metaLines: string[] = [t('files.shareCreatedAt', { time: formatDateTime(item.created_at) })];
  if (item.expires_at) {
    metaLines.push(t('files.shareExpiresAt', { time: formatDateTime(item.expires_at) }));
  }
  if (item.max_access_count != null) {
    metaLines.push(
      t('files.shareAccessCount', {
        current: item.access_count,
        max: item.max_access_count,
      }),
    );
  } else if (item.access_count > 0) {
    metaLines.push(t('files.shareAccessCountUnlimited', { current: item.access_count }));
  }

  return (
    <Card size="small" className={styles.linkCard}>
      <div className={styles.linkToolbar}>
        <Input
          readOnly
          value={shareUrl}
          prefix={<LinkOutlined style={{ color: '#1677ff' }} />}
          className={styles.linkInput}
        />
        <Button type="primary" icon={<CopyOutlined />} onClick={() => void onCopy(item)}>
          {t('files.copyLink')}
        </Button>
        <Popconfirm
          title={t('files.revokeShareConfirm')}
          description={t('files.revokeShareDesc')}
          onConfirm={() => onRevoke(item.id)}
        >
          <Button danger icon={<StopOutlined />} loading={revoking}>
            {t('files.revokeShare')}
          </Button>
        </Popconfirm>
      </div>

      <div className={styles.linkMeta}>{metaLines.join(' · ')}</div>

      <div className={styles.linkTags}>
        <Space size={[4, 4]} wrap>
          {item.has_password ? <Tag>{t('files.shareHasPassword')}</Tag> : null}
          {item.allow_download ? <Tag color="blue">{t('files.allowDownload')}</Tag> : null}
          {item.allow_preview ? <Tag color="green">{t('files.allowPreview')}</Tag> : null}
        </Space>
      </div>
    </Card>
  );
}

export default function ShareLinkModal({
  open,
  bucketName,
  objectKey,
  onClose,
}: ShareLinkModalProps) {
  const t = useT();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<ShareFormValues>();
  const [activeTab, setActiveTab] = useState<ShareTab>('existing');
  const queryKey = shareLinksQueryKey(bucketName, objectKey);

  const linksQuery = useQuery({
    queryKey,
    queryFn: () =>
      listShareLinks({
        bucket_name: bucketName,
        object_key: objectKey,
      }),
    enabled: open && Boolean(bucketName && objectKey),
  });

  const existingLinks = linksQuery.data?.items ?? [];
  const existingCount = existingLinks.length;

  useEffect(() => {
    if (!open) {
      return;
    }
    setActiveTab('existing');
  }, [open, bucketName, objectKey]);

  useEffect(() => {
    if (!open || linksQuery.isLoading) {
      return;
    }
    if (existingCount === 0) {
      setActiveTab('create');
    }
  }, [open, linksQuery.isLoading, existingCount]);

  const createMutation = useMutation({
    mutationFn: ({
      bucketName: targetBucket,
      objectKey: targetKey,
      values,
    }: {
      bucketName: string;
      objectKey: string;
      values: ShareFormValues;
    }) =>
      createShareLink({
        bucket_name: targetBucket,
        object_key: targetKey,
        expires_at: values.expires_at?.toISOString() ?? null,
        password: values.password?.trim() || null,
        max_access_count: values.max_access_count ?? null,
        allow_download: values.allow_download,
        allow_preview: values.allow_preview,
      }),
    onSuccess: (_result, { bucketName: targetBucket, objectKey: targetKey }) => {
      message.success(t('files.shareCreated'));
      form.setFieldsValue({
        expires_at: dayjs().add(7, 'day'),
        password: undefined,
        max_access_count: undefined,
        allow_download: true,
        allow_preview: true,
      });
      void queryClient.invalidateQueries({
        queryKey: shareLinksQueryKey(targetBucket, targetKey),
      });
      if (targetBucket === bucketName && targetKey === objectKey) {
        setActiveTab('existing');
      }
    },
    onError: (err) => {
      const text = err instanceof ApiError ? err.message : t('files.shareCreateFailed');
      message.error(text);
    },
  });

  const revokeMutation = useMutation({
    mutationFn: ({
      linkId,
    }: {
      linkId: number;
      bucketName: string;
      objectKey: string;
    }) => revokeShareLink(linkId),
    onSuccess: (_result, { bucketName: targetBucket, objectKey: targetKey }) => {
      message.success(t('files.shareRevoked'));
      void queryClient.invalidateQueries({
        queryKey: shareLinksQueryKey(targetBucket, targetKey),
      });
    },
    onError: (err) => {
      const text = err instanceof ApiError ? err.message : t('files.shareRevokeFailed');
      message.error(text);
    },
  });

  const handleClose = () => {
    form.resetFields();
    onClose();
  };

  const handleCopy = async (item: ShareLinkItem) => {
    try {
      await navigator.clipboard.writeText(buildShareUrl(item.share_path));
      message.success(t('files.linkCopied'));
    } catch {
      message.error(t('files.copyLinkManual'));
    }
  };

  const tabItems = [
    {
      key: 'existing',
      label: (
        <Badge count={existingCount} size="small" offset={[6, 0]} color="#1677ff">
          <span>{t('files.shareTabExisting')}</span>
        </Badge>
      ),
      children: linksQuery.isLoading ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <Spin />
        </div>
      ) : existingCount === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={t('files.shareExistingEmpty')}
          style={{ padding: '24px 0' }}
        >
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setActiveTab('create')}>
            {t('files.shareEmptyCta')}
          </Button>
        </Empty>
      ) : (
        <div className={styles.linkList}>
          {existingLinks.map((item) => (
            <ShareLinkCard
              key={item.id}
              item={item}
              revoking={
                revokeMutation.isPending &&
                revokeMutation.variables?.linkId === item.id
              }
              onCopy={handleCopy}
              onRevoke={(linkId) =>
                revokeMutation.mutate({ linkId, bucketName, objectKey })
              }
            />
          ))}
        </div>
      ),
    },
    {
      key: 'create',
      label: t('files.shareTabCreate'),
      children: (
        <Form
          form={form}
          layout="vertical"
          className={styles.createForm}
          initialValues={{
            expires_at: dayjs().add(7, 'day'),
            allow_download: true,
            allow_preview: true,
          }}
          onFinish={() =>
            createMutation.mutate({
              bucketName,
              objectKey,
              values: form.getFieldsValue(),
            })
          }
        >
          <Form.Item label={t('files.expiresAt')} name="expires_at">
            <DatePicker
              showTime
              style={{ width: '100%' }}
              disabledDate={(current) => current != null && current < dayjs().startOf('day')}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item label={t('files.accessPassword')} name="password">
                <Input.Password placeholder={t('files.noPassword')} maxLength={128} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label={t('files.maxAccessCount')} name="max_access_count">
                <InputNumber min={1} style={{ width: '100%' }} placeholder={t('files.noLimit')} />
              </Form.Item>
            </Col>
          </Row>

          <div className={styles.switchRow}>
            <Form.Item label={t('files.allowDownload')} name="allow_download" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item label={t('files.allowPreview')} name="allow_preview" valuePropName="checked">
              <Switch />
            </Form.Item>
          </div>

          <Space style={{ marginTop: 8 }}>
            <Button onClick={handleClose}>{t('common.cancel')}</Button>
            <Button type="primary" htmlType="submit" loading={createMutation.isPending} icon={<PlusOutlined />}>
              {t('files.generateLink')}
            </Button>
          </Space>
        </Form>
      ),
    },
  ];

  return (
    <Modal
      title={t('files.shareTitle')}
      open={open}
      onCancel={handleClose}
      footer={null}
      destroyOnClose
      width={640}
    >
      <Text type="secondary" className={styles.objectKey}>
        {objectKey}
      </Text>

      <Tabs activeKey={activeTab} onChange={(key) => setActiveTab(key as ShareTab)} items={tabItems} />
    </Modal>
  );
}
