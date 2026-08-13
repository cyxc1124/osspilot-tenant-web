import { useState } from 'react';
import { DownloadOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import {
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
import { exportAuditLogs, listAuditLogs } from '../../api/audit';
import { ApiError } from '../../api/client';
import { useT } from '../../i18n';
import { formatDateTime } from '../../lib/format';
import type { AuditLogEntry, AuditLogFilters } from '../../types/audit';
import styles from './AuditPage.module.css';

const { Title, Paragraph } = Typography;
const { RangePicker } = DatePicker;

interface FilterFormValues {
  user_id?: number;
  bucket_name?: string;
  object_key?: string;
  action?: string;
  source_ip?: string;
  date_range?: [Dayjs, Dayjs];
}

function formToFilters(
  values: FilterFormValues,
  page: number,
  pageSize: number,
): AuditLogFilters {
  const filters: AuditLogFilters = { page, page_size: pageSize };
  if (values.user_id) {
    filters.user_id = values.user_id;
  }
  if (values.bucket_name?.trim()) {
    filters.bucket_name = values.bucket_name.trim();
  }
  if (values.object_key?.trim()) {
    filters.object_key = values.object_key.trim();
  }
  if (values.action?.trim()) {
    filters.action = values.action.trim();
  }
  if (values.source_ip?.trim()) {
    filters.source_ip = values.source_ip.trim();
  }
  if (values.date_range?.[0]) {
    filters.created_from = values.date_range[0].startOf('day').toISOString();
  }
  if (values.date_range?.[1]) {
    filters.created_to = values.date_range[1].endOf('day').toISOString();
  }
  return filters;
}

export default function AuditPage() {
  const t = useT();
  const [form] = Form.useForm<FilterFormValues>();
  const [filters, setFilters] = useState<AuditLogFilters>({
    page: 1,
    page_size: 20,
  });
  const [exporting, setExporting] = useState(false);

  const { data, isLoading, isFetching, refetch, error } = useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: () => listAuditLogs(filters),
  });

  const handleSearch = (values: FilterFormValues) => {
    setFilters(formToFilters(values, 1, filters.page_size ?? 20));
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const exportFilters = { ...filters };
      delete exportFilters.page;
      delete exportFilters.page_size;
      const blob = await exportAuditLogs(exportFilters);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const stamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
      link.download = `audit-logs-${stamp}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      message.success(t('audit.exportSuccess'));
    } catch (err) {
      message.error(err instanceof ApiError ? err.message : t('audit.exportFailed'));
    } finally {
      setExporting(false);
    }
  };

  const columns: ColumnsType<AuditLogEntry> = [
    { title: t('audit.columnTime'), dataIndex: 'created_at', width: 170, render: formatDateTime },
    { title: t('audit.columnUser'), dataIndex: 'username', render: (v) => v ?? t('common.emDash') },
    { title: t('audit.columnAction'), dataIndex: 'action' },
    { title: t('audit.columnBucket'), dataIndex: 'bucket_name', render: (v) => v ?? t('common.emDash') },
    {
      title: t('audit.columnObject'),
      dataIndex: 'object_key',
      ellipsis: true,
      render: (v) => v ?? t('common.emDash'),
    },
    { title: t('audit.columnSourceIp'), dataIndex: 'source_ip', render: (v) => v ?? t('common.emDash') },
    {
      title: t('common.status'),
      dataIndex: 'status',
      width: 90,
      render: (status: string) => (
        <Tag color={status === 'success' ? 'success' : 'error'}>{status}</Tag>
      ),
    },
  ];

  const loadError = error instanceof ApiError ? error.message : error ? t('common.loadFailed') : null;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <Title level={4} className={styles.title}>
            {t('audit.title')}
          </Title>
          <Paragraph type="secondary" className={styles.subtitle}>
            {t('audit.subtitle')}
          </Paragraph>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => void refetch()} loading={isFetching}>
            {t('common.refresh')}
          </Button>
          <Button
            icon={<DownloadOutlined />}
            loading={exporting}
            onClick={() => void handleExport()}
          >
            {t('audit.exportCsv')}
          </Button>
        </Space>
      </div>

      <Form
        form={form}
        layout="inline"
        className={styles.filters}
        onFinish={handleSearch}
      >
        <Form.Item name="user_id" label={t('audit.userId')}>
          <InputNumber min={1} placeholder="ID" style={{ width: 100 }} />
        </Form.Item>
        <Form.Item name="bucket_name" label={t('audit.bucket')}>
          <Input allowClear placeholder={t('audit.bucketPlaceholder')} style={{ width: 140 }} />
        </Form.Item>
        <Form.Item name="object_key" label={t('audit.objectKey')}>
          <Input allowClear placeholder={t('audit.objectKeyPlaceholder')} style={{ width: 160 }} />
        </Form.Item>
        <Form.Item name="action" label={t('audit.actionType')}>
          <Input allowClear placeholder={t('audit.actionPlaceholder')} style={{ width: 140 }} />
        </Form.Item>
        <Form.Item name="source_ip" label={t('audit.sourceIp')}>
          <Input allowClear placeholder="IP" style={{ width: 120 }} />
        </Form.Item>
        <Form.Item name="date_range" label={t('audit.dateRange')}>
          <RangePicker />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
            {t('audit.search')}
          </Button>
        </Form.Item>
      </Form>

      <Table
        rowKey="id"
        loading={isLoading}
        columns={columns}
        dataSource={data?.items ?? []}
        locale={{ emptyText: loadError ?? t('audit.empty') }}
        scroll={{ x: 1000 }}
        pagination={{
          current: filters.page ?? 1,
          pageSize: filters.page_size ?? 20,
          total: data?.total ?? 0,
          showTotal: (total) => t('common.totalCount', { total }),
          onChange: (page, pageSize) => {
            const values = form.getFieldsValue();
            setFilters(formToFilters(values, page, pageSize));
          },
        }}
      />
    </div>
  );
}
