import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { DeleteOutlined, SaveOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Form, Popconfirm, Space, Spin, Typography, message } from 'antd';
import {
  deleteBucketCors,
  getBucketCors,
  putBucketCors,
  type BucketCorsResponse,
  type CorsRule,
} from '../../api/bucketCors';
import { ApiError } from '../../api/client';
import { confirmUnsavedSwitch } from '../../components/bucket-config/confirmUnsavedSwitch';
import EditorViewModeToggle from '../../components/bucket-config/EditorViewModeToggle';
import JsonEditorPanel from '../../components/bucket-config/JsonEditorPanel';
import type { EditorViewMode } from '../../components/bucket-config/EditorViewModeToggle';
import { useT } from '../../i18n';
import BucketCorsForm from './BucketCorsForm';
import {
  defaultCorsRule,
  formatCorsRules,
  parseCorsRules,
  type CorsFormValues,
} from './corsForm';
import styles from './BucketCorsPage.module.css';

const { Title, Paragraph } = Typography;

export default function BucketCorsPage() {
  const t = useT();
  const { bucketName: rawBucketName } = useParams();
  const bucketName = rawBucketName ? decodeURIComponent(rawBucketName) : '';
  const queryClient = useQueryClient();
  const [form] = Form.useForm<CorsFormValues>();
  const [viewMode, setViewMode] = useState<EditorViewMode>('visual');
  const [editorValue, setEditorValue] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const markDirty = () => setDirty(true);

  const { data, isLoading, error } = useQuery({
    queryKey: ['bucket-cors', bucketName],
    queryFn: () => getBucketCors(bucketName),
    enabled: Boolean(bucketName),
  });

  useEffect(() => {
    if (!data || dirty) {
      return;
    }
    const rules = data.cors_rules.length > 0 ? data.cors_rules : [defaultCorsRule()];
    form.setFieldsValue({ cors_rules: rules });
    setEditorValue(formatCorsRules(rules));
    setParseError(null);
  }, [data, dirty, form]);

  const saveMutation = useMutation({
    mutationFn: async ({
      bucketName: targetBucket,
      corsRules,
    }: {
      bucketName: string;
      corsRules: CorsRule[];
    }) => putBucketCors(targetBucket, corsRules),
    onSuccess: (saved, { bucketName: targetBucket }) => {
      message.success(t('bucketCors.saved'));
      queryClient.setQueryData<BucketCorsResponse>(['bucket-cors', targetBucket], saved);
      if (targetBucket === bucketName) {
        setDirty(false);
      }
      void queryClient.invalidateQueries({ queryKey: ['bucket-cors', targetBucket] });
    },
    onError: (err) => {
      const text = err instanceof ApiError ? err.message : t('common.saveFailed');
      message.error(text);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (targetBucket: string) => deleteBucketCors(targetBucket),
    onSuccess: (_result, targetBucket) => {
      message.success(t('bucketCors.cleared'));
      queryClient.setQueryData<BucketCorsResponse>(['bucket-cors', targetBucket], {
        bucket_name: targetBucket,
        cors_rules: [],
        has_cors: false,
      });
      if (targetBucket === bucketName) {
        setDirty(false);
      }
      void queryClient.invalidateQueries({ queryKey: ['bucket-cors', targetBucket] });
    },
    onError: (err) => {
      const text = err instanceof ApiError ? err.message : t('common.deleteFailed');
      message.error(text);
    },
  });

  const loadError = error instanceof ApiError ? error.message : error ? t('common.loadFailed') : null;

  const handleEditorChange = (value: string) => {
    setEditorValue(value);
    markDirty();
    try {
      parseCorsRules(value, t('bucketCors.mustBeArray'));
      setParseError(null);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : t('bucketCors.invalidJson'));
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
    saveMutation.mutate({
      bucketName,
      corsRules: parseCorsRules(editorValue, t('bucketCors.mustBeArray')),
    });
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
        const values = await form.validateFields();
        setEditorValue(formatCorsRules((values as CorsFormValues).cors_rules ?? [defaultCorsRule()]));
        setParseError(null);
        setViewMode('json');
      } catch {
        message.error(t('common.formInvalid'));
      }
      return;
    }

    try {
      const rules = parseCorsRules(editorValue, t('bucketCors.mustBeArray'));
      form.setFieldsValue({ cors_rules: rules.length > 0 ? rules : [defaultCorsRule()] });
      setParseError(null);
      setViewMode('visual');
    } catch (err) {
      message.error(err instanceof Error ? err.message : t('bucketCors.invalidJson'));
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
            {t('bucketCors.title')}
          </Title>
          <Paragraph type="secondary" className={styles.subtitle}>
            {t('bucketCors.subtitle', { bucket: bucketName })}
          </Paragraph>
        </div>
        <Space wrap className={styles.headerActions}>
          <EditorViewModeToggle mode={viewMode} onToggle={() => void handleToggleViewMode()} />
          <Popconfirm
            title={t('bucketCors.confirmClearTitle')}
            description={t('bucketCors.confirmClearDesc')}
            okText={t('bucketCors.clear')}
            cancelText={t('common.cancel')}
            okButtonProps={{ danger: true, loading: deleteMutation.isPending }}
            onConfirm={() => deleteMutation.mutate(bucketName)}
            disabled={!data?.has_cors}
          >
            <Button danger icon={<DeleteOutlined />} disabled={!data?.has_cors}>
              {t('bucketCors.clearConfig')}
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
      {viewMode === 'json' && !parseError ? (
        <Alert type="info" message={t('bucketCors.jsonFormatHint')} showIcon className={styles.alert} />
      ) : null}
      {viewMode === 'json' && parseError ? (
        <Alert type="warning" message={parseError} showIcon className={styles.alert} />
      ) : null}

      {viewMode === 'visual' ? (
        isLoading && !data ? (
          <div className={styles.emptyHint}>
            <Spin tip={t('bucketCors.loading')} />
          </div>
        ) : (
          <BucketCorsForm
            form={form}
            onFinish={(values) =>
              saveMutation.mutate({ bucketName, corsRules: values.cors_rules })
            }
            onDirty={markDirty}
          />
        )
      ) : (
        <div className={styles.jsonPanel}>
          <JsonEditorPanel
            value={editorValue}
            loading={isLoading && !data}
            loadingTip={t('bucketCors.loading')}
            onChange={handleEditorChange}
          />
        </div>
      )}
    </div>
  );
}
