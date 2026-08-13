import { PlusOutlined } from '@ant-design/icons';
import { Button, Card, Checkbox, Form, InputNumber, Select, Typography } from 'antd';
import type { FormInstance } from 'antd';
import { useT } from '../../i18n';
import { defaultCorsRule, type CorsFormValues } from './corsForm';
import styles from './BucketCorsPage.module.css';

const { Text } = Typography;

const METHOD_OPTIONS = ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'] as const;

interface BucketCorsFormProps {
  form: FormInstance<CorsFormValues>;
  loading?: boolean;
  onFinish: (values: CorsFormValues) => void;
  onDirty: () => void;
}

export default function BucketCorsForm({ form, loading = false, onFinish, onDirty }: BucketCorsFormProps) {
  const t = useT();

  return (
    <Card className={styles.rulesCard} loading={loading}>
      <Form<CorsFormValues>
        form={form}
        layout="vertical"
        initialValues={{ cors_rules: [defaultCorsRule()] }}
        onValuesChange={onDirty}
        onFinish={onFinish}
      >
        <Form.List name="cors_rules">
          {(fields, { add, remove }) => (
            <>
              {fields.map((field, index) => (
                <div key={field.key} className={styles.ruleBlock}>
                  <div className={styles.ruleHeader}>
                    <Text strong>{t('bucketCors.rule', { index: index + 1 })}</Text>
                    {fields.length > 1 ? (
                      <Button type="link" danger onClick={() => remove(field.name)}>
                        {t('bucketCors.deleteRule')}
                      </Button>
                    ) : null}
                  </div>

                  <Form.Item
                    label={t('bucketCors.allowedOrigins')}
                    name={[field.name, 'allowed_origins']}
                    rules={[{ required: true, message: t('bucketCors.originsRequired') }]}
                    extra={t('bucketCors.originsExtra')}
                  >
                    <Select
                      mode="tags"
                      tokenSeparators={[',', ' ']}
                      placeholder="https://console.example.com"
                    />
                  </Form.Item>

                  <Form.Item
                    label={t('bucketCors.allowedMethods')}
                    name={[field.name, 'allowed_methods']}
                    rules={[{ required: true, message: t('bucketCors.methodsRequired') }]}
                  >
                    <Checkbox.Group options={METHOD_OPTIONS.map((m) => ({ label: m, value: m }))} />
                  </Form.Item>

                  <Form.Item
                    label={t('bucketCors.allowedHeaders')}
                    name={[field.name, 'allowed_headers']}
                    rules={[{ required: true, message: t('bucketCors.headersRequired') }]}
                  >
                    <Select mode="tags" tokenSeparators={[',', ' ']} placeholder="*" />
                  </Form.Item>

                  <Form.Item label={t('bucketCors.exposeHeaders')} name={[field.name, 'expose_headers']}>
                    <Select mode="tags" tokenSeparators={[',', ' ']} placeholder="ETag" />
                  </Form.Item>

                  <Form.Item label={t('bucketCors.maxAge')} name={[field.name, 'max_age_seconds']}>
                    <InputNumber min={0} max={86400} style={{ width: 200 }} addonAfter={t('common.seconds')} />
                  </Form.Item>
                </div>
              ))}

              <Button
                type="dashed"
                block
                icon={<PlusOutlined />}
                onClick={() => {
                  add(defaultCorsRule());
                  onDirty();
                }}
              >
                {t('bucketCors.addRule')}
              </Button>
            </>
          )}
        </Form.List>
      </Form>
    </Card>
  );
}
