import {
  CopyOutlined,
  DownloadOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Button, Descriptions, Drawer, Input, Segmented, Space, Spin, Typography, message } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getObjectDetail } from '../../api/objects';
import { getPlatformConfig } from '../../api/platformConfig';
import { presignDownload } from '../../api/downloads';
import { ApiError } from '../../api/client';
import { useT } from '../../i18n';
import { formatBytes, formatDateTime } from '../../lib/format';
import {
  availableObjectAddressProtocols,
  buildObjectAddress,
  resolveObjectAddressDomain,
  type ObjectAddressProtocol,
} from '../../lib/objectAddress';
import type { FileDetailTarget } from '../../types/object';
import styles from './FileDetailDrawer.module.css';

const { Text } = Typography;

interface FileDetailDrawerProps {
  open: boolean;
  target: FileDetailTarget | null;
  onClose: () => void;
}

interface TempLinkState {
  url: string;
  expiresAt: number;
  bucketName: string;
  objectKey: string;
}

function formatEncryption(
  value: string | null,
  t: ReturnType<typeof useT>,
): string {
  if (!value) {
    return t('files.detailEncryptionNone');
  }
  if (value === 'AES256') {
    return t('files.detailEncryptionAes256');
  }
  if (value === 'aws:kms') {
    return t('files.detailEncryptionKms');
  }
  return value;
}

function formatAccessPermission(
  value: string,
  t: ReturnType<typeof useT>,
): string {
  if (value === 'private') {
    return t('files.detailAccessPrivate');
  }
  return value;
}

async function copyText(text: string, successKey: string, t: ReturnType<typeof useT>) {
  try {
    await navigator.clipboard.writeText(text);
    message.success(t(successKey));
  } catch {
    message.error(t('files.copyLinkManual'));
  }
}

export default function FileDetailDrawer({ open, target, onClose }: FileDetailDrawerProps) {
  const t = useT();
  const filename = target?.objectKey.split('/').pop() ?? '';
  const [addressProtocol, setAddressProtocol] = useState<ObjectAddressProtocol>('https');
  const [tempLink, setTempLink] = useState<TempLinkState | null>(null);
  const [tempLinkExpired, setTempLinkExpired] = useState(false);
  const [tempLinkLoading, setTempLinkLoading] = useState(false);
  const [tempLinkError, setTempLinkError] = useState<string | null>(null);
  const tempLinkRequestIdRef = useRef(0);

  const { data, isLoading, error } = useQuery({
    queryKey: ['object-detail', target?.bucketName, target?.objectKey],
    queryFn: () => getObjectDetail(target!.bucketName, target!.objectKey),
    enabled: open && Boolean(target?.bucketName && target?.objectKey),
  });

  const platformConfigQuery = useQuery({
    queryKey: ['platform-config'],
    queryFn: () => getPlatformConfig(),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    tempLinkRequestIdRef.current += 1;
    setTempLink(null);
    setTempLinkExpired(false);
    setTempLinkError(null);
    setTempLinkLoading(false);
  }, [open, target?.bucketName, target?.objectKey]);

  useEffect(() => {
    if (!tempLink) {
      setTempLinkExpired(false);
      return;
    }
    const remaining = tempLink.expiresAt - Date.now();
    if (remaining <= 0) {
      setTempLinkExpired(true);
      return;
    }
    setTempLinkExpired(false);
    const timer = window.setTimeout(() => setTempLinkExpired(true), remaining);
    return () => window.clearTimeout(timer);
  }, [tempLink]);

  const ensureTempLink = useCallback(
    async (force = false): Promise<string | null> => {
      if (!target) {
        return null;
      }
      if (
        !force &&
        tempLink &&
        tempLink.bucketName === target.bucketName &&
        tempLink.objectKey === target.objectKey &&
        tempLink.expiresAt > Date.now()
      ) {
        return tempLink.url;
      }
      const requestId = ++tempLinkRequestIdRef.current;
      const requestBucket = target.bucketName;
      const requestKey = target.objectKey;
      setTempLinkLoading(true);
      setTempLinkError(null);
      try {
        const result = await presignDownload({
          bucket_name: requestBucket,
          object_key: requestKey,
        });
        if (tempLinkRequestIdRef.current !== requestId) {
          return null;
        }
        const next: TempLinkState = {
          url: result.download_url,
          expiresAt: Date.now() + result.expires_in * 1000,
          bucketName: requestBucket,
          objectKey: requestKey,
        };
        setTempLink(next);
        setTempLinkExpired(false);
        return next.url;
      } catch (err) {
        if (tempLinkRequestIdRef.current !== requestId) {
          return null;
        }
        const text = err instanceof ApiError ? err.message : t('common.getDownloadUrlFailed');
        setTempLinkError(text);
        message.error(text);
        return null;
      } finally {
        if (tempLinkRequestIdRef.current === requestId) {
          setTempLinkLoading(false);
        }
      }
    },
    [t, target, tempLink],
  );

  const loadError = error instanceof ApiError ? error.message : error ? t('common.loadFailed') : null;
  const uploadedBy =
    data?.uploaded_by_username ??
    (data?.uploaded_by != null ? `#${data.uploaded_by}` : t('common.emDash'));
  const userMetadataEntries = Object.entries(data?.user_metadata ?? {});
  const tempLinkMatchesTarget =
    Boolean(tempLink && target) &&
    tempLink!.bucketName === target!.bucketName &&
    tempLink!.objectKey === target!.objectKey;
  const activeTempLinkUrl = tempLinkMatchesTarget && !tempLinkExpired ? tempLink!.url : '';
  const tempLinkExpiresAt =
    tempLinkMatchesTarget && !tempLinkExpired ? new Date(tempLink!.expiresAt).toISOString() : null;

  const availableProtocols = useMemo(
    () =>
      availableObjectAddressProtocols(
        platformConfigQuery.data?.object_http_domain,
        platformConfigQuery.data?.object_https_domain,
        platformConfigQuery.data?.s3_endpoint,
      ),
    [platformConfigQuery.data],
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    // Prefer https on open; snap below if that protocol is unavailable.
    setAddressProtocol('https');
  }, [open, target?.bucketName, target?.objectKey]);

  useEffect(() => {
    if (!open || availableProtocols.length === 0) {
      return;
    }
    if (!availableProtocols.includes(addressProtocol)) {
      setAddressProtocol(availableProtocols.includes('https') ? 'https' : availableProtocols[0]!);
    }
  }, [open, availableProtocols, addressProtocol]);

  const objectAddress = useMemo(() => {
    if (!target) {
      return '';
    }
    const domain = resolveObjectAddressDomain(
      addressProtocol,
      platformConfigQuery.data?.object_http_domain,
      platformConfigQuery.data?.object_https_domain,
      platformConfigQuery.data?.s3_endpoint,
    );
    if (!domain) {
      return '';
    }
    return buildObjectAddress(domain, addressProtocol, target.bucketName, target.objectKey);
  }, [addressProtocol, platformConfigQuery.data, target]);

  const handleCopyAddress = () => {
    if (!objectAddress) {
      return;
    }
    void copyText(objectAddress, 'files.objectAddressCopied', t);
  };

  const handleCopyTempLink = async () => {
    const url = await ensureTempLink();
    if (!url) {
      return;
    }
    void copyText(url, 'files.linkCopied', t);
  };

  const handleDownload = async () => {
    // Open synchronously under the user gesture; awaiting presign first can be
    // blocked as a popup once the activation expires.
    const popup = window.open('about:blank', '_blank');
    const url = await ensureTempLink();
    if (!url) {
      popup?.close();
      return;
    }
    if (!popup) {
      message.error(t('files.downloadPopupBlocked'));
      return;
    }
    popup.opener = null;
    popup.location.replace(url);
  };

  const handleRefreshTempLink = async () => {
    const url = await ensureTempLink(true);
    if (url) {
      message.success(t('files.tempLinkRefreshed'));
    }
  };

  return (
    <Drawer
      title={
        <span>
          <InfoCircleOutlined /> {t('files.detailTitle', { filename: filename || t('files.detailFile') })}
        </span>
      }
      open={open}
      onClose={onClose}
      width="min(560px, 92vw)"
      destroyOnClose
    >
      {target ? (
        <div className={styles.body}>
          <Text type="secondary" className={styles.meta}>
            {target.objectKey}
          </Text>

          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <Text className={styles.sectionLabel}>{t('files.objectAddress')}</Text>
              {availableProtocols.length > 1 ? (
                <Segmented
                  size="small"
                  value={addressProtocol}
                  onChange={(value) => setAddressProtocol(value as ObjectAddressProtocol)}
                  options={availableProtocols.map((protocol) => ({
                    label: protocol.toUpperCase(),
                    value: protocol,
                  }))}
                />
              ) : null}
            </div>
            <div className={styles.toolbar}>
              <Input
                readOnly
                value={objectAddress}
                placeholder={
                  platformConfigQuery.isLoading
                    ? t('files.tempLinkPlaceholder')
                    : t('files.objectAddressMissingDomain')
                }
                className={styles.linkInput}
              />
              <Button icon={<CopyOutlined />} disabled={!objectAddress} onClick={handleCopyAddress}>
                {t('common.copy')}
              </Button>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.tempLinkTitle}>
              <Text className={styles.sectionLabel}>{t('files.tempLink')}</Text>
              {tempLinkExpired ? (
                <Text type="warning" className={styles.expires}>
                  {t('files.tempLinkExpired')}
                </Text>
              ) : tempLinkExpiresAt ? (
                <Text type="secondary" className={styles.expires}>
                  {t('files.tempLinkExpiresAt', { time: formatDateTime(tempLinkExpiresAt) })}
                </Text>
              ) : null}
            </div>
            <Spin spinning={tempLinkLoading}>
              {tempLinkError ? <Text type="danger">{tempLinkError}</Text> : null}
              <div className={styles.toolbar}>
                <Input
                  readOnly
                  value={activeTempLinkUrl}
                  placeholder={
                    tempLinkExpired
                      ? t('files.tempLinkExpired')
                      : tempLinkLoading
                        ? t('files.tempLinkPlaceholder')
                        : t('files.tempLinkIdle')
                  }
                  className={styles.linkInput}
                />
              </div>
              <Space wrap className={styles.actions}>
                <Button
                  type="primary"
                  icon={<CopyOutlined />}
                  loading={tempLinkLoading}
                  onClick={() => void handleCopyTempLink()}
                >
                  {t('files.copyTempLink')}
                </Button>
                <Button
                  icon={<DownloadOutlined />}
                  loading={tempLinkLoading}
                  onClick={() => void handleDownload()}
                >
                  {t('files.downloadObject')}
                </Button>
                <Button
                  icon={<ReloadOutlined />}
                  loading={tempLinkLoading}
                  onClick={() => void handleRefreshTempLink()}
                >
                  {t('files.refreshTempLink')}
                </Button>
              </Space>
            </Spin>
          </div>

          {loadError ? (
            <Text type="danger">{loadError}</Text>
          ) : (
            <Spin spinning={isLoading}>
              <Descriptions column={1} bordered size="small">
                <Descriptions.Item label={t('files.columnSize')}>
                  {formatBytes(data?.size ?? 0)}
                </Descriptions.Item>
                <Descriptions.Item label={t('files.columnType')}>
                  {data?.content_type ?? t('common.emDash')}
                </Descriptions.Item>
                <Descriptions.Item label={t('files.columnModified')}>
                  {formatDateTime(data?.last_modified ?? null)}
                </Descriptions.Item>
                <Descriptions.Item label={t('files.detailAccessPermission')}>
                  {formatAccessPermission(data?.access_permission ?? 'private', t)}
                </Descriptions.Item>
                <Descriptions.Item label={t('files.detailEncryption')}>
                  {formatEncryption(data?.server_side_encryption ?? null, t)}
                </Descriptions.Item>
                <Descriptions.Item label="ETag">
                  {data?.etag ?? t('common.emDash')}
                </Descriptions.Item>
                <Descriptions.Item label={t('files.detailStorageClass')}>
                  {data?.storage_class ?? t('common.emDash')}
                </Descriptions.Item>
                <Descriptions.Item label={t('files.detailUploadedBy')}>
                  {uploadedBy}
                </Descriptions.Item>
                <Descriptions.Item label={t('files.detailCreatedAt')}>
                  {formatDateTime(data?.created_at ?? null)}
                </Descriptions.Item>
                <Descriptions.Item label={t('files.detailUpdatedAt')}>
                  {formatDateTime(data?.updated_at ?? null)}
                </Descriptions.Item>
                <Descriptions.Item label={t('files.detailUserMetadata')}>
                  {userMetadataEntries.length > 0 ? (
                    <Descriptions column={1} size="small" bordered>
                      {userMetadataEntries.map(([metaKey, metaValue]) => (
                        <Descriptions.Item key={metaKey} label={metaKey}>
                          {metaValue}
                        </Descriptions.Item>
                      ))}
                    </Descriptions>
                  ) : (
                    <span className={styles.emptyMeta}>{t('files.detailUserMetadataEmpty')}</span>
                  )}
                </Descriptions.Item>
              </Descriptions>
            </Spin>
          )}
        </div>
      ) : null}
    </Drawer>
  );
}
