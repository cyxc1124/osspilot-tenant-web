import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { DeleteOutlined, SaveOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Form, Popconfirm, Space, Typography, message } from 'antd';
import {
  deleteBucketPolicy,
  getBucketPolicy,
  putBucketPolicy,
  type BucketPolicyResponse,
} from '../../api/bucketPolicy';
import { ApiError } from '../../api/client';
import { confirmUnsavedSwitch } from '../../components/bucket-config/confirmUnsavedSwitch';
import EditorViewModeToggle from '../../components/bucket-config/EditorViewModeToggle';
import JsonEditorPanel from '../../components/bucket-config/JsonEditorPanel';
import type { EditorViewMode } from '../../components/bucket-config/EditorViewModeToggle';
import { useT } from '../../i18n';
import BucketPolicyForm from './BucketPolicyForm';
import {
  PolicyFormValidationError,
  formValuesHaveUnsupportedVisualFields,
  formValuesToPolicy,
  formatPolicyJson,
  policyHasUnsupportedVisualFields,
  policyToFormValues,
  type PolicyFormValues,
} from './policyForm';
import styles from './BucketPolicyPage.module.css';

const { Title, Paragraph } = Typography;

export default function BucketPolicyPage() {
  const t = useT();
  const { bucketName: rawBucketName } = useParams();
  const bucketName = rawBucketName ? decodeURIComponent(rawBucketName) : '';
  const queryClient = useQueryClient();
  const [form] = Form.useForm<PolicyFormValues>();
  const [viewMode, setViewMode] = useState<EditorViewMode>('visual');
  const [editorValue, setEditorValue] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const watchedValues = Form.useWatch([], form) as PolicyFormValues | undefined;

  const markDirty = () => setDirty(true);

  const parsePolicyText = (text: string): Record<string, unknown> => {
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error(t('bucketPolicy.mustBeObject'));
    }
    return parsed as Record<string, unknown>;
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ['bucket-policy', bucketName],
    queryFn: () => getBucketPolicy(bucketName),
    enabled: Boolean(bucketName),
  });

  useEffect(() => {
    if (!data || dirty) {
      return;
    }
    const formValues = policyToFormValues(data.policy, bucketName);
    form.setFieldsValue(formValues);
    setEditorValue(formatPolicyJson(data.policy, bucketName));
    setParseError(null);
    if (data.policy && policyHasUnsupportedVisualFields(data.policy)) {
      setViewMode('json');
    }
  }, [data, bucketName, dirty, form]);

  const unsupportedVisualFields = useMemo(() => {
    if (Array.isArray(watchedValues?.statements)) {
      return formValuesHaveUnsupportedVisualFields(watchedValues);
    }
    if (data?.policy) {
      return policyHasUnsupportedVisualFields(data.policy);
    }
    return false;
  }, [data?.policy, watchedValues]);

  const saveMutation = useMutation({
    mutationFn: async ({
      bucketName: targetBucket,
      policy,
    }: {
      bucketName: string;
      policy: Record<string, unknown>;
    }) => putBucketPolicy(targetBucket, policy),
    onSuccess: (saved, { bucketName: targetBucket }) => {
      message.success(t('bucketPolicy.saved'));
      queryClient.setQueryData<BucketPolicyResponse>(['bucket-policy', targetBucket], saved);
      if (targetBucket === bucketName) {
        setDirty(false);
      }
      void queryClient.invalidateQueries({ queryKey: ['bucket-policy', targetBucket] });
    },
    onError: (err) => {
      const text = err instanceof ApiError ? err.message : t('common.saveFailed');
      message.error(text);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (targetBucket: string) => deleteBucketPolicy(targetBucket),
    onSuccess: (_result, targetBucket) => {
      message.success(t('bucketPolicy.deleted'));
      queryClient.setQueryData<BucketPolicyResponse>(['bucket-policy', targetBucket], {
        bucket_name: targetBucket,
        policy: null,
        has_policy: false,
      });
      if (targetBucket === bucketName) {
        setDirty(false);
      }
      void queryClient.invalidateQueries({ queryKey: ['bucket-policy', targetBucket] });
    },
    onError: (err) => {
      const text = err instanceof ApiError ? err.message : t('common.deleteFailed');
      message.error(text);
    },
  });

  const loadError = useMemo(() => {
    if (!error) {
      return null;
    }
    return error instanceof ApiError ? error.message : t('common.loadFailed');
  }, [error, t]);

  const handleEditorChange = (value: string) => {
    setEditorValue(value);
    markDirty();
    try {
      parsePolicyText(value);
      setParseError(null);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : t('bucketPolicy.invalidJson'));
    }
  };

  const handleVisualFinish = () => {
    try {
      // ponytail: onFinish/validateFields omit setFieldsValue paths without Form.Item; getFieldsValue(true) keeps preservedFields.
      const values = form.getFieldsValue(true) as PolicyFormValues;
      saveMutation.mutate({ bucketName, policy: formValuesToPolicy(values) });
    } catch (err) {
      if (err instanceof PolicyFormValidationError && err.code === 'invalidPrincipalJson') {
        message.error(t('bucketPolicy.invalidPrincipalJson'));
        return;
      }
      message.error(t('common.saveFailed'));
    }
  };

  const handleSave = () => {
    if (viewMode === 'visual') {
      form.submit();
      return;
    }
    if (parseError) {
      return;
    }
    saveMutation.mutate({ bucketName, policy: parsePolicyText(editorValue) });
  };

  const handleToggleViewMode = async () => {
    if (dirty) {
      const confirmed = await confirmUnsavedSwitch(t);
      if (!confirmed) {
        return;
      }
    }

    if (viewMode === 'visual') {
      try {
        await form.validateFields();
        const values = form.getFieldsValue(true) as PolicyFormValues;
        setEditorValue(JSON.stringify(formValuesToPolicy(values), null, 2));
        setParseError(null);
        setViewMode('json');
      } catch (err) {
        if (err instanceof PolicyFormValidationError && err.code === 'invalidPrincipalJson') {
          message.error(t('bucketPolicy.invalidPrincipalJson'));
          return;
        }
        message.error(t('common.formInvalid'));
      }
      return;
    }

    try {
      const policy = parsePolicyText(editorValue);
      if (policyHasUnsupportedVisualFields(policy)) {
        message.warning(t('bucketPolicy.unsupportedVisualFields'));
        return;
      }
      form.setFieldsValue(policyToFormValues(policy, bucketName));
      setParseError(null);
      setViewMode('visual');
    } catch (err) {
      message.error(err instanceof Error ? err.message : t('bucketPolicy.invalidJson'));
    }
  };

  if (!bucketName) {
    return <Alert type="error" message={t('common.missingBucketName')} />;
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <Title level={4} className={styles.title}>
            {t('bucketPolicy.title')}
          </Title>
          <Paragraph type="secondary" className={styles.subtitle}>
            {t('bucketPolicy.subtitle', { bucket: bucketName })}
          </Paragraph>
        </div>
        <Space wrap className={styles.headerActions}>
          <EditorViewModeToggle mode={viewMode} onToggle={() => void handleToggleViewMode()} />
          <Popconfirm
            title={t('bucketPolicy.confirmDeleteTitle')}
            description={t('bucketPolicy.confirmDeleteDesc')}
            okText={t('common.delete')}
            cancelText={t('common.cancel')}
            okButtonProps={{ danger: true, loading: deleteMutation.isPending }}
            onConfirm={() => deleteMutation.mutate(bucketName)}
            disabled={!data?.has_policy}
          >
            <Button danger icon={<DeleteOutlined />} disabled={!data?.has_policy}>
              {t('bucketPolicy.deletePolicy')}
            </Button>
          </Popconfirm>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={saveMutation.isPending}
            disabled={viewMode === 'json' && Boolean(parseError)}
            onClick={handleSave}
          >
            {t('common.save')}
          </Button>
        </Space>
      </div>

      {loadError ? <Alert type="error" message={loadError} showIcon className={styles.alert} /> : null}
      {!isLoading && data && !data.has_policy ? (
        <Alert type="info" message={t('bucketPolicy.noPolicyTemplateHint')} showIcon className={styles.alert} />
      ) : null}
      {viewMode === 'visual' && unsupportedVisualFields ? (
        <Alert
          type="warning"
          message={t('bucketPolicy.unsupportedVisualFields')}
          showIcon
          className={styles.alert}
        />
      ) : null}
      {viewMode === 'json' && parseError ? (
        <Alert type="warning" message={parseError} showIcon className={styles.alert} />
      ) : null}

      {viewMode === 'visual' ? (
        <BucketPolicyForm
          form={form}
          bucketName={bucketName}
          loading={isLoading && !data}
          onFinish={handleVisualFinish}
          onDirty={markDirty}
        />
      ) : (
        <JsonEditorPanel
          value={editorValue}
          loading={isLoading && !data}
          loadingTip={t('bucketPolicy.loading')}
          onChange={handleEditorChange}
        />
      )}
    </div>
  );
}
