import { useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Form, Input, Modal, Switch, Typography, message } from 'antd';
import { updateBucket } from '../../api/buckets';
import { ApiError } from '../../api/client';
import { useT } from '../../i18n';

interface EditBucketDisplayNameModalProps {
  open: boolean;
  bucketName: string;
  displayName: string | null;
  displayAliasOnly: boolean;
    onClose: () => void;
}

interface FormValues {
  display_name?: string;
  display_alias_only?: boolean;
}

export default function EditBucketDisplayNameModal({
  open,
  bucketName,
  displayName,
  displayAliasOnly,
  onClose,
}: EditBucketDisplayNameModalProps) {
  const t = useT();
  const [form] = Form.useForm<FormValues>();
  const queryClient = useQueryClient();
  const watchedDisplayName = Form.useWatch('display_name', form);

  useEffect(() => {
    if (open) {
      form.setFieldsValue({
        display_name: displayName ?? undefined,
        display_alias_only: displayAliasOnly,
      });
    }
  }, [open, displayName, displayAliasOnly, form]);

  const saveMutation = useMutation({
    mutationFn: ({
      bucketName: targetBucket,
      values,
    }: {
      bucketName: string;
      values: FormValues;
    }) => {
      const trimmedDisplayName = values.display_name?.trim() || null;
      return updateBucket(targetBucket, {
        display_name: trimmedDisplayName,
        display_alias_only: trimmedDisplayName ? Boolean(values.display_alias_only) : false,
      });
    },
    onSuccess: (_result, { bucketName: targetBucket }) => {
      message.success(t('buckets.displayNameUpdated'));
      void queryClient.invalidateQueries({ queryKey: ['buckets'] });
      void queryClient.invalidateQueries({ queryKey: ['bucket', targetBucket] });
      if (targetBucket === bucketName) {
        onClose();
      }
    },
    onError: (err: Error) => {
      message.error(err instanceof ApiError ? err.message : t('common.saveFailed'));
    },
  });

  const hasDisplayName = Boolean((watchedDisplayName ?? '').trim());

  useEffect(() => {
    if (!hasDisplayName) {
      form.setFieldValue('display_alias_only', false);
    }
  }, [hasDisplayName, form]);

  return (
    <Modal
      title={t('buckets.editDisplayNameTitle')}
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={saveMutation.isPending}
      destroyOnClose
      okText={t('common.save')}
      cancelText={t('common.cancel')}
    >
      <Typography.Paragraph type="secondary">
        {t('buckets.editDisplayNameHint', { bucketName })}
      </Typography.Paragraph>
      <Form
        form={form}
        layout="vertical"
        onFinish={(values) => saveMutation.mutate({ bucketName, values })}
      >
        <Form.Item
          name="display_name"
          label={t('buckets.displayName')}
          extra={t('buckets.editDisplayNameExtra')}
        >
          <Input placeholder={t('buckets.editDisplayNamePlaceholder')} maxLength={128} allowClear />
        </Form.Item>
        <Form.Item
          name="display_alias_only"
          label={t('buckets.aliasOnly')}
          valuePropName="checked"
          extra={t('buckets.aliasOnlyHint')}
        >
          <Switch disabled={!hasDisplayName} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
