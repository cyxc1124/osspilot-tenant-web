import { useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { DownloadOutlined, EyeOutlined, LockOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Form, Input, Space, Spin, Typography } from 'antd';
import { accessPublicShare } from '../../api/share';
import { ApiError } from '../../api/client';
import LocaleSwitcher from '../../components/LocaleSwitcher';
import { useT } from '../../i18n';
import { formatDateTime } from '../../lib/format';
import styles from './ShareLandingPage.module.css';

const { Title, Text, Paragraph } = Typography;

export default function ShareLandingPage() {
  const t = useT();
  const { token: rawToken } = useParams<{ token: string }>();
  const token = rawToken ? decodeURIComponent(rawToken) : '';
  const [searchParams] = useSearchParams();
  const initialPassword = searchParams.get('password') ?? undefined;
  const [submittedPassword, setSubmittedPassword] = useState<string | undefined>(initialPassword);

  const { data, error, isLoading, isFetching } = useQuery({
    queryKey: ['public-share', token, submittedPassword ?? ''],
    queryFn: () => accessPublicShare(token, submittedPassword || undefined),
    enabled: Boolean(token),
    retry: false,
  });

  const needsPassword = error instanceof ApiError && error.status === 401;
  const filename = useMemo(() => {
    if (!data?.object_key) {
      return '';
    }
    return data.object_key.split('/').pop() || data.object_key;
  }, [data?.object_key]);

  const handlePasswordSubmit = (values: { password: string }) => {
    setSubmittedPassword(values.password);
  };

  const handleDownload = () => {
    if (!data?.download_url) {
      return;
    }
    const anchor = document.createElement('a');
    anchor.href = data.download_url;
    anchor.download = filename;
    anchor.rel = 'noopener';
    anchor.target = '_blank';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  const handlePreview = () => {
    if (!data?.preview_url) {
      return;
    }
    window.open(data.preview_url, '_blank', 'noopener,noreferrer');
  };

  if (!token) {
    return (
      <div className={styles.page}>
        <Alert type="error" message={t('sharePage.invalidLink')} />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <LocaleSwitcher />
      </div>

      <div className={styles.card}>
        <div className={styles.header}>
          <Title level={3} style={{ margin: 0 }}>
            {t('sharePage.title')}
          </Title>
          {data ? (
            <Paragraph className={styles.filename} type="secondary">
              {filename}
            </Paragraph>
          ) : null}
        </div>

        {isLoading || (isFetching && !needsPassword) ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <Spin />
          </div>
        ) : null}

        {needsPassword ? (
          <Form
            layout="vertical"
            onFinish={handlePasswordSubmit}
            initialValues={{ password: initialPassword ?? '' }}
          >
            <Alert
              type="info"
              showIcon
              message={t('sharePage.passwordRequired')}
              style={{ marginBottom: 16 }}
            />
            <Form.Item
              name="password"
              label={t('sharePage.passwordLabel')}
              rules={[{ required: true, message: t('sharePage.passwordRequired') }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder={t('sharePage.passwordPlaceholder')}
                autoComplete="current-password"
              />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={isFetching} block>
                {t('sharePage.unlock')}
              </Button>
            </Form.Item>
            {error instanceof ApiError && submittedPassword !== undefined ? (
              <Alert type="error" showIcon message={error.message} style={{ marginTop: 8 }} />
            ) : null}
          </Form>
        ) : null}

        {error && !needsPassword ? (
          <Alert type="error" showIcon message={error instanceof ApiError ? error.message : t('sharePage.loadFailed')} />
        ) : null}

        {data ? (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Text type="secondary">{data.object_key}</Text>

            <div className={styles.actions}>
              {data.allow_download && data.download_url ? (
                <Button type="primary" icon={<DownloadOutlined />} onClick={handleDownload}>
                  {t('sharePage.download')}
                </Button>
              ) : null}
              {data.allow_preview && data.preview_url ? (
                <Button icon={<EyeOutlined />} onClick={handlePreview}>
                  {t('sharePage.preview')}
                </Button>
              ) : null}
            </div>

            <div className={styles.meta}>
              {data.expires_at ? (
                <div>
                  <Text type="secondary">{t('sharePage.expiresAt', { time: formatDateTime(data.expires_at) })}</Text>
                </div>
              ) : null}
              {data.max_access_count != null ? (
                <div>
                  <Text type="secondary">
                    {t('sharePage.accessCount', {
                      current: data.access_count,
                      max: data.max_access_count,
                    })}
                  </Text>
                </div>
              ) : null}
            </div>
          </Space>
        ) : null}
      </div>
    </div>
  );
}
