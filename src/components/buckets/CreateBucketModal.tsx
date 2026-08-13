import { Form, Input, Modal, message } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createBucket } from '../../api/buckets';
import { ApiError } from '../../api/client';
import { useT } from '../../i18n';
import type { BucketCreateRequest } from '../../types/bucket';

const BUCKET_NAME_PATTERN = /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/;

interface CreateBucketModalProps {
  open: boolean;
    onClose: () => void;
}

interface CreateBucketFormValues {
  bucket_name: string;
  display_name?: string;
}

export default function CreateBucketModal({ open, onClose }: CreateBucketModalProps) {
  const t = useT();
  const [form] = Form.useForm<CreateBucketFormValues>();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (values: CreateBucketFormValues) => {
      const body: BucketCreateRequest = {
        bucket_name: values.bucket_name.trim(),
        display_name: values.display_name?.trim() || null,
      };
      return createBucket(body);
    },
    onSuccess: () => {
      message.success(t('buckets.createSuccess'));
      void queryClient.invalidateQueries({ queryKey: ['buckets'] });
      form.resetFields();
      onClose();
    },
    onError: (error) => {
      const text = error instanceof ApiError ? error.message : t('buckets.createFailed');
      message.error(text);
    },
  });

  const handleOk = async () => {
    const values = await form.validateFields();
    await mutation.mutateAsync(values);
  };

  return (
    <Modal
      title={t('buckets.createTitle')}
      open={open}
      onCancel={() => {
        form.resetFields();
        onClose();
      }}
      onOk={() => void handleOk()}
      confirmLoading={mutation.isPending}
      destroyOnClose
      okText={t('common.create')}
      cancelText={t('common.cancel')}
    >
      <Form form={form} layout="vertical" requiredMark={false}>
        <Form.Item
          name="bucket_name"
          label={t('buckets.bucketName')}
          rules={[
            { required: true, message: t('buckets.bucketNameRequired') },
            { min: 3, max: 63, message: t('buckets.bucketNameLength') },
            {
              pattern: BUCKET_NAME_PATTERN,
              message: t('buckets.bucketNamePattern'),
            },
          ]}
        >
          <Input placeholder={t('buckets.bucketNamePlaceholder')} autoComplete="off" />
        </Form.Item>
        <Form.Item name="display_name" label={t('buckets.displayName')}>
          <Input placeholder={t('buckets.displayNamePlaceholder')} maxLength={128} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
