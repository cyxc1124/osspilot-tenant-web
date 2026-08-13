import { Alert, Button, Form, Input, Select, Typography } from 'antd';
import type { FormInstance } from 'antd';
import { useMemo } from 'react';
import { useT } from '../../i18n';
import BucketResourceInput from './BucketResourceInput';
import {
  S3_ACTION_OPTIONS,
  missingSuggestedResources,
  parsePrincipalFromForm,
  type PolicyFormValues,
} from './policyForm';
import styles from './BucketPolicyPage.module.css';

const { Text } = Typography;

interface PolicyStatementFieldsProps {
  form: FormInstance<PolicyFormValues>;
  field: { name: number; key: number };
  index: number;
  bucketName: string;
  onDirty: () => void;
  onRemove?: () => void;
  removable?: boolean;
}

export default function PolicyStatementFields({
  form,
  field,
  index,
  bucketName,
  onDirty,
  onRemove,
  removable = false,
}: PolicyStatementFieldsProps) {
  const t = useT();
  const actions = Form.useWatch(['statements', field.name, 'action'], form) as string[] | undefined;
  const resources = Form.useWatch(['statements', field.name, 'resource'], form) as string[] | undefined;

  const missingResources = useMemo(
    () => missingSuggestedResources(bucketName, actions ?? [], resources ?? []),
    [actions, bucketName, resources],
  );

  const handleActionChange = (nextActions: string[]) => {
    onDirty();
    const currentResources = (form.getFieldValue(['statements', field.name, 'resource']) as string[]) ?? [];
    if (currentResources.length > 0) {
      return;
    }
    const suggested = missingSuggestedResources(bucketName, nextActions, currentResources);
    if (suggested.length === 0) {
      return;
    }
    form.setFieldValue(['statements', field.name, 'resource'], suggested);
  };

  const applySuggestedResources = () => {
    const currentResources = (form.getFieldValue(['statements', field.name, 'resource']) as string[]) ?? [];
    form.setFieldValue(
      ['statements', field.name, 'resource'],
      [...currentResources, ...missingResources],
    );
    onDirty();
  };

  return (
    <div className={styles.ruleBlock}>
      <div className={styles.ruleHeader}>
        <Text strong>{t('bucketPolicy.statement', { index: index + 1 })}</Text>
        {removable && onRemove ? (
          <Button type="link" danger onClick={onRemove}>
            {t('bucketPolicy.deleteStatement')}
          </Button>
        ) : null}
      </div>

      <Form.Item
        label={t('bucketPolicy.sid')}
        name={[field.name, 'sid']}
        extra={t('bucketPolicy.sidExtra')}
      >
        <Input placeholder={t('bucketPolicy.sidPlaceholder')} />
      </Form.Item>

      <Form.Item
        label={t('bucketPolicy.effect')}
        name={[field.name, 'effect']}
        rules={[{ required: true, message: t('bucketPolicy.effectRequired') }]}
        extra={t('bucketPolicy.effectExtra')}
      >
        <Select
          options={[
            { label: t('bucketPolicy.effectAllow'), value: 'Allow' },
            { label: t('bucketPolicy.effectDeny'), value: 'Deny' },
          ]}
        />
      </Form.Item>

      <Form.Item
        label={t('bucketPolicy.principal')}
        name={[field.name, 'principal']}
        rules={[
          { required: true, message: t('bucketPolicy.principalRequired') },
          {
            validator: async (_, value: string | undefined) => {
              try {
                parsePrincipalFromForm(value ?? '');
                return Promise.resolve();
              } catch {
                return Promise.reject(new Error(t('bucketPolicy.invalidPrincipalJson')));
              }
            },
          },
        ]}
        extra={t('bucketPolicy.principalExtra')}
      >
        <Input placeholder={t('bucketPolicy.principalPlaceholder')} />
      </Form.Item>

      <Form.Item
        label={t('bucketPolicy.action')}
        name={[field.name, 'action']}
        rules={[{ required: true, message: t('bucketPolicy.actionRequired') }]}
        extra={t('bucketPolicy.actionExtra')}
      >
        <Select
          mode="tags"
          tokenSeparators={[',', ' ']}
          options={S3_ACTION_OPTIONS.map((action) => ({ label: action, value: action }))}
          onChange={handleActionChange}
        />
      </Form.Item>

      {missingResources.length > 0 ? (
        <Alert
          type="info"
          showIcon
          className={styles.resourceSuggestAlert}
          message={t('bucketPolicy.resourceSuggestHint')}
          description={
            <ul className={styles.resourceSuggestList}>
              {missingResources.map((arn) => (
                <li key={arn}>
                  <code>{arn}</code>
                </li>
              ))}
            </ul>
          }
          action={
            <Button size="small" type="primary" onClick={applySuggestedResources}>
              {t('bucketPolicy.resourceSuggestApply')}
            </Button>
          }
        />
      ) : null}

      <Form.Item
        label={t('bucketPolicy.resource')}
        name={[field.name, 'resource']}
        rules={[{ required: true, message: t('bucketPolicy.resourceRequired') }]}
        extra={t('bucketPolicy.resourceExtra', { bucket: bucketName })}
      >
        <BucketResourceInput bucketName={bucketName} />
      </Form.Item>
    </div>
  );
}
