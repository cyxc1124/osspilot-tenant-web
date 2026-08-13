import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, Col, Progress, Row, Statistic, Table, Tag, Typography } from 'antd';
import {
  DatabaseOutlined,
  DeleteOutlined,
  FileOutlined,
  HddOutlined,
} from '@ant-design/icons';
import BucketLabel from '../../components/buckets/BucketLabel';
import { getBucketRequestStats, getBucketStats, getAccountStats, getAccountTrafficStats } from '../../api/stats';
import { getPlatformConfig } from '../../api/platformConfig';
import { listAccountAlertNotifications } from '../../api/alerts';
import { formatDateTime, useT } from '../../i18n';
import { formatBytes } from '../../lib/format';
import { useAuthStore } from '../../stores/authStore';
import styles from './DashboardPage.module.css';

const { Title, Paragraph, Text } = Typography;

export default function DashboardPage() {
  const t = useT();
  const user = useAuthStore((s) => s.user);
  const statsQuery = useQuery({
    queryKey: ['account-stats'],
    queryFn: () => getAccountStats(),
  });

  const bucketStatsQuery = useQuery({
    queryKey: ['bucket-stats'],
    queryFn: () => getBucketStats(),
  });

  const alertsQuery = useQuery({
    queryKey: ['account-alerts'],
    queryFn: () => listAccountAlertNotifications(5),
  });

  const trafficQuery = useQuery({
    queryKey: ['account-traffic'],
    queryFn: () => getAccountTrafficStats('24h'),
  });

  const bucketRequestQuery = useQuery({
    queryKey: ['bucket-requests'],
    queryFn: () => getBucketRequestStats('24h'),
  });

  const platformConfigQuery = useQuery({
    queryKey: ['platform-config'],
    queryFn: () => getPlatformConfig(),
  });

  const stats = statsQuery.data;
  const usagePercent = stats?.usage_percent != null ? Math.round(stats.usage_percent * 100) : null;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Title level={4} className={styles.title}>
          {t('dashboard.title')}
        </Title>
        <Paragraph type="secondary" className={styles.subtitle}>
          {t('dashboard.welcome', { name: user?.display_name || user?.username || '' })}
          {stats?.collected_at ? (
            <>
              {' '}
              {t('dashboard.statsUpdatedAt', { time: formatDateTime(stats.collected_at) })}
            </>
          ) : null}
        </Paragraph>
      </div>

      {platformConfigQuery.data &&
      (platformConfigQuery.data.storage_region ||
        platformConfigQuery.data.download_cdn_url ||
        platformConfigQuery.data.preview_cdn_url) ? (
        <Card bordered={false} className={styles.sectionCard} style={{ marginBottom: 16 }}>
          <Text type="secondary">{t('dashboard.storageConfig')}</Text>
          <div style={{ marginTop: 8 }}>
            {platformConfigQuery.data.storage_region ? (
              <div>
                {t('dashboard.region', {
                  name: platformConfigQuery.data.storage_region.name,
                  code: platformConfigQuery.data.storage_region.code,
                })}
              </div>
            ) : null}
            {platformConfigQuery.data.download_cdn_url ? (
              <div>{t('dashboard.downloadCdn', { url: platformConfigQuery.data.download_cdn_url })}</div>
            ) : null}
            {platformConfigQuery.data.preview_cdn_url ? (
              <div>{t('dashboard.previewCdn', { url: platformConfigQuery.data.preview_cdn_url })}</div>
            ) : null}
          </div>
        </Card>
      ) : null}

      <Row gutter={[16, 16]} className={styles.stats}>
        <Col xs={24} sm={12} lg={12}>
          <Card bordered={false} className={styles.statCard} loading={statsQuery.isLoading}>
            <Statistic
              title={t('dashboard.usedCapacity')}
              value={formatBytes(stats?.used_bytes ?? 0)}
              prefix={<HddOutlined />}
              valueStyle={{ color: '#006eff' }}
            />
            {stats?.quota_bytes != null ? (
              <Text type="secondary">{t('dashboard.quota', { size: formatBytes(stats.quota_bytes) })}</Text>
            ) : (
              <Text type="secondary">{t('dashboard.noQuota')}</Text>
            )}
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={12}>
          <Card bordered={false} className={styles.statCard} loading={statsQuery.isLoading}>
            <Statistic
              title={t('dashboard.objectCount')}
              value={stats?.object_count ?? 0}
              prefix={<FileOutlined />}
              suffix={t('dashboard.objectUnit') ? <Text type="secondary">{t('dashboard.objectUnit')}</Text> : undefined}
            />
          </Card>
        </Col>
      </Row>

      {(trafficQuery.data?.request_count ?? 0) > 0 ? (
        <Row gutter={[16, 16]} className={styles.stats}>
          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false} className={styles.statCard} loading={trafficQuery.isLoading}>
              <Statistic title={t('dashboard.requests24h')} value={trafficQuery.data?.request_count ?? 0} />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false} className={styles.statCard} loading={trafficQuery.isLoading}>
              <Statistic
                title={t('dashboard.uploadDownload')}
                value={formatBytes(trafficQuery.data?.upload_bytes ?? 0)}
                suffix={
                  <Text type="secondary">↓ {formatBytes(trafficQuery.data?.download_bytes ?? 0)}</Text>
                }
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false} className={styles.statCard} loading={trafficQuery.isLoading}>
              <Statistic title={t('dashboard.activeUsers')} value={trafficQuery.data?.active_users ?? 0} />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false} className={styles.statCard} loading={trafficQuery.isLoading}>
              <Statistic
                title={t('dashboard.getPutDel')}
                value={trafficQuery.data?.get_count ?? 0}
                suffix={
                  <Text type="secondary">
                    {trafficQuery.data?.put_count ?? 0} / {trafficQuery.data?.delete_count ?? 0}
                  </Text>
                }
              />
            </Card>
          </Col>
        </Row>
      ) : null}

      <Row gutter={[16, 16]} className={styles.stats}>
        <Col xs={24} lg={12}>
          <Card title={t('dashboard.capacityUsage')} bordered={false} className={styles.sectionCard} loading={statsQuery.isLoading}>
            {usagePercent != null ? (
              <Progress
                percent={usagePercent}
                status={usagePercent >= 90 ? 'exception' : usagePercent >= 80 ? 'active' : 'normal'}
                format={(percent) => `${percent}%`}
              />
            ) : (
              <Paragraph type="secondary">
                {t('dashboard.noQuotaHint', { size: formatBytes(stats?.used_bytes ?? 0) })}
              </Paragraph>
            )}
            <Row gutter={16} style={{ marginTop: 16 }}>
              <Col span={8}>
                <Statistic title={t('dashboard.remaining')} value={formatBytes(stats?.remaining_bytes ?? 0)} />
              </Col>
              <Col span={8}>
                <Statistic
                  title={t('dashboard.trash')}
                  value={formatBytes(stats?.trash_bytes ?? 0)}
                  prefix={<DeleteOutlined />}
                  suffix={
                    <Text type="secondary">
                      {t('dashboard.trashObjects', { count: stats?.trash_object_count ?? 0 })}
                    </Text>
                  }
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title={t('dashboard.versions')}
                  value={formatBytes(stats?.version_bytes ?? 0)}
                  suffix={
                    <Text type="secondary">
                      {t('dashboard.versionCount', { count: stats?.version_object_count ?? 0 })}
                    </Text>
                  }
                />
              </Col>
            </Row>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            title={t('dashboard.bucketCapacity')}
            bordered={false}
            className={styles.sectionCard}
            loading={bucketStatsQuery.isLoading}
            extra={<DatabaseOutlined />}
          >
            <Table
              size="small"
              pagination={false}
              rowKey="bucket_id"
              dataSource={bucketStatsQuery.data?.items ?? []}
              locale={{ emptyText: t('dashboard.emptyBuckets') }}
              columns={[
                {
                  title: t('dashboard.columnBucket'),
                  dataIndex: 'bucket_name',
                  render: (name: string, row) => (
                    <BucketLabel
                      bucket_name={name}
                      display_name={row.display_name}
                      display_alias_only={row.display_alias_only}
                    />
                  ),
                },
                {
                  title: t('dashboard.columnUsed'),
                  dataIndex: 'used_bytes',
                  render: (value: number) => formatBytes(value),
                },
                {
                  title: t('dashboard.columnObjectCount'),
                  dataIndex: 'object_count',
                },
                {
                  title: t('dashboard.columnUsage'),
                  dataIndex: 'usage_percent',
                  render: (value: number | null) =>
                    value != null ? `${Math.round(value * 100)}%` : t('common.emDash'),
                },
              ]}
            />
          </Card>
        </Col>
      </Row>

      {(bucketRequestQuery.data?.items.some((item) => item.request_count > 0) ?? false) ? (
        <Card
          title={t('dashboard.bucketRequests24h')}
          bordered={false}
          loading={bucketRequestQuery.isLoading}
          className={`${styles.stats} ${styles.sectionCard}`}
        >
          <Table
            size="small"
            pagination={false}
            rowKey="bucket_id"
            dataSource={bucketRequestQuery.data?.items.filter((item) => item.request_count > 0) ?? []}
            locale={{ emptyText: t('dashboard.emptyRequests') }}
            columns={[
              {
                title: t('dashboard.columnBucket'),
                dataIndex: 'bucket_name',
                render: (name: string, row) => (
                  <BucketLabel
                    bucket_name={name}
                    display_name={row.display_name}
                    display_alias_only={row.display_alias_only}
                  />
                ),
              },
              { title: t('dashboard.columnRequests'), dataIndex: 'request_count' },
              { title: 'GET', dataIndex: 'get_count' },
              { title: 'PUT', dataIndex: 'put_count' },
              { title: 'DEL', dataIndex: 'delete_count' },
            ]}
          />
        </Card>
      ) : null}

      {(alertsQuery.data?.items.length ?? 0) > 0 ? (
        <Card title={t('dashboard.alerts')} bordered={false} loading={alertsQuery.isLoading} className={`${styles.stats} ${styles.sectionCard}`}>
          <Table
            size="small"
            pagination={false}
            rowKey="id"
            dataSource={alertsQuery.data?.items ?? []}
            columns={[
              {
                title: t('dashboard.columnSeverity'),
                dataIndex: 'severity',
                width: 90,
                render: (value: string) => (
                  <Tag color={value === 'critical' ? 'error' : 'warning'}>{value}</Tag>
                ),
              },
              { title: t('dashboard.columnAlertTitle'), dataIndex: 'title', ellipsis: true },
              { title: t('dashboard.columnMessage'), dataIndex: 'message', ellipsis: true },
              {
                title: t('dashboard.columnAlertTime'),
                dataIndex: 'fired_at',
                width: 180,
                render: (value: string) => formatDateTime(value),
              },
            ]}
          />
        </Card>
      ) : null}

      <Card className={styles.actionCard} bordered={false}>
        <SpaceBetween>
          <div>
            <Title level={5} className={styles.actionTitle}>
              {t('dashboard.quickStart')}
            </Title>
            <Paragraph type="secondary" className={styles.actionDesc}>
              {t('dashboard.quickStartDesc')}
            </Paragraph>
          </div>
          <Link to="/buckets">
            <Button type="primary">{t('dashboard.enterBuckets')}</Button>
          </Link>
        </SpaceBetween>
      </Card>
    </div>
  );
}

function SpaceBetween({ children }: { children: ReactNode }) {
  return <div className={styles.actionRow}>{children}</div>;
}
