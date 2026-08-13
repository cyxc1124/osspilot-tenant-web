import { PlusOutlined } from '@ant-design/icons';
import { Button, Card, Form, Select } from 'antd';
import type { FormInstance } from 'antd';
import { useT } from '../../i18n';
import PolicyStatementFields from './PolicyStatementFields';
import {
  POLICY_VERSION_OPTIONS,
  defaultStatement,
  type PolicyFormValues,
} from './policyForm';
import styles from './BucketPolicyPage.module.css';

interface BucketPolicyFormProps {
  form: FormInstance<PolicyFormValues>;
  bucketName: string;
  loading?: boolean;
  onFinish: (values: PolicyFormValues) => void;
  onDirty: () => void;
}

export default function BucketPolicyForm({
  form,
  bucketName,
  loading = false,
  onFinish,
  onDirty,
}: BucketPolicyFormProps) {
  const t = useT();

  return (
    <Card className={styles.rulesCard} loading={loading}>
      <Form<PolicyFormValues>
        form={form}
        layout="vertical"
        initialValues={{
          version: '2012-10-17',
          statements: [defaultStatement(bucketName)],
        }}
        onValuesChange={onDirty}
        onFinish={onFinish}
      >
        <Form.Item
          label={t('bucketPolicy.version')}
          name="version"
          rules={[{ required: true, message: t('bucketPolicy.versionRequired') }]}
        >
          <Select options={POLICY_VERSION_OPTIONS.map((value) => ({ label: value, value }))} />
        </Form.Item>

        <Form.List name="statements">
          {(fields, { add, remove }) => (
            <>
              {fields.map((field, index) => (
                <PolicyStatementFields
                  key={field.key}
                  form={form}
                  field={field}
                  index={index}
                  bucketName={bucketName}
                  onDirty={onDirty}
                  removable={fields.length > 1}
                  onRemove={() => remove(field.name)}
                />
              ))}

              <Button
                type="dashed"
                block
                icon={<PlusOutlined />}
                onClick={() => {
                  add(defaultStatement(bucketName));
                  onDirty();
                }}
              >
                {t('bucketPolicy.addStatement')}
              </Button>
            </>
          )}
        </Form.List>
      </Form>
    </Card>
  );
}
