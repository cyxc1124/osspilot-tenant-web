import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { Alert, Button, Checkbox, Form, Input, Typography } from 'antd';
import { ApiError } from '../../api/client';
import { DEFAULT_TENANT_LOGIN_BRANDING, getLoginBranding } from '../../api/loginBranding';
import LocaleSwitcher from '../../components/LocaleSwitcher';
import { useT } from '../../i18n';
import { isRememberMe } from '../../lib/tokenStorage';
import { useAuthStore } from '../../stores/authStore';
import styles from './LoginPage.module.css';

const { Title, Text } = Typography;

interface LoginFormValues {
  username: string;
  password: string;
  remember: boolean;
}

export default function LoginPage() {
  const t = useT();
  const navigate = useNavigate();
  const location = useLocation();
  const [form] = Form.useForm<LoginFormValues>();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);
  const hydrating = useAuthStore((s) => s.hydrating);
  const hydrate = useAuthStore((s) => s.hydrate);
  const login = useAuthStore((s) => s.login);

  const brandingQuery = useQuery({
    queryKey: ['login-branding'],
    queryFn: getLoginBranding,
    staleTime: 5 * 60 * 1000,
  });
  const branding = brandingQuery.data ?? {
    ...DEFAULT_TENANT_LOGIN_BRANDING,
    title: t('login.defaultTitle'),
    subtitle: t('login.defaultSubtitle'),
  };

  const from =
    (location.state as { from?: string } | null)?.from && (location.state as { from?: string }).from !== '/login'
      ? (location.state as { from: string }).from
      : '/';

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    form.setFieldsValue({ remember: isRememberMe() });
  }, [form]);

  if (initialized && !hydrating && token && user) {
    return <Navigate to={from} replace />;
  }

  const onFinish = async (values: LoginFormValues) => {
    setError(null);
    setSubmitting(true);
    try {
      await login(values.username, values.password, values.remember);
      navigate(from, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(t('login.failed'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.localeBar}>
        <LocaleSwitcher />
      </div>
      <div className={styles.panel}>
        <div className={styles.hero}>
          <div className={styles.logo}>{branding.logo_text}</div>
          <Title level={3} className={styles.heroTitle}>
            {branding.title}
          </Title>
          <Text type="secondary">{branding.subtitle}</Text>
        </div>

        <div className={styles.formWrap}>
          <Title level={4} className={styles.formTitle}>
            {t('login.title')}
          </Title>

          {error && (
            <Alert className={styles.alert} type="error" message={error} showIcon closable onClose={() => setError(null)} />
          )}

          <Form<LoginFormValues>
            form={form}
            layout="vertical"
            size="large"
            initialValues={{ remember: isRememberMe() }}
            onFinish={onFinish}
            requiredMark={false}
          >
            <Form.Item
              name="username"
              label={t('login.username')}
              rules={[{ required: true, message: t('login.usernameRequired') }]}
            >
              <Input prefix={<UserOutlined />} placeholder={t('login.usernamePlaceholder')} autoComplete="username" />
            </Form.Item>

            <Form.Item
              name="password"
              label={t('login.password')}
              rules={[{ required: true, message: t('login.passwordRequired') }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder={t('login.passwordPlaceholder')}
                autoComplete="current-password"
              />
            </Form.Item>

            <Form.Item name="remember" valuePropName="checked">
              <Checkbox>{t('login.remember')}</Checkbox>
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" block loading={submitting}>
                {t('login.submit')}
              </Button>
            </Form.Item>
          </Form>
        </div>
      </div>
    </div>
  );
}
