import { PlusOutlined } from '@ant-design/icons';
import { Button, Input, Space, Tag, Typography } from 'antd';
import { useState } from 'react';
import { useT } from '../../i18n';
import {
  allObjectsResourceArn,
  bucketObjectArnPrefix,
  bucketResourceArn,
  buildObjectResourceArn,
  resourceArnSuffix,
} from './policyForm';
import styles from './BucketResourceInput.module.css';

const { Text } = Typography;

interface BucketResourceInputProps {
  bucketName: string;
  value?: string[];
  onChange?: (value: string[]) => void;
}

function formatResourceLabel(bucketName: string, arn: string, t: ReturnType<typeof useT>): string {
  if (arn === bucketResourceArn(bucketName)) {
    return t('bucketPolicy.resourceBucketLabel');
  }
  if (arn === allObjectsResourceArn(bucketName)) {
    return t('bucketPolicy.resourceAllObjectsLabel');
  }
  const suffix = resourceArnSuffix(bucketName, arn);
  if (suffix !== null) {
    return suffix || t('bucketPolicy.resourceBucketLabel');
  }
  return arn;
}

export default function BucketResourceInput({
  bucketName,
  value = [],
  onChange,
}: BucketResourceInputProps) {
  const t = useT();
  const [suffix, setSuffix] = useState('*');
  const objectPrefix = bucketObjectArnPrefix(bucketName);

  const updateValue = (next: string[]) => {
    onChange?.(next);
  };

  const addResource = (arn: string) => {
    if (value.includes(arn)) {
      return;
    }
    updateValue([...value, arn]);
  };

  const removeResource = (arn: string) => {
    updateValue(value.filter((item) => item !== arn));
  };

  const handleAddPath = () => {
    addResource(buildObjectResourceArn(bucketName, suffix));
  };

  return (
    <div className={styles.root}>
      {value.length > 0 ? (
        <Space wrap className={styles.tags}>
          {value.map((arn) => (
            <Tag key={arn} closable onClose={() => removeResource(arn)}>
              {formatResourceLabel(bucketName, arn, t)}
            </Tag>
          ))}
        </Space>
      ) : null}

      <Space wrap className={styles.presets}>
        <Button size="small" onClick={() => addResource(bucketResourceArn(bucketName))}>
          {t('bucketPolicy.resourceBucket')}
        </Button>
        <Button size="small" onClick={() => addResource(allObjectsResourceArn(bucketName))}>
          {t('bucketPolicy.resourceAllObjects')}
        </Button>
      </Space>

      <div className={styles.pathRow}>
        <Text type="secondary" className={styles.prefix}>
          {objectPrefix}
        </Text>
        <Input
          className={styles.suffixInput}
          value={suffix}
          placeholder="*"
          onChange={(event) => setSuffix(event.target.value)}
          onPressEnter={handleAddPath}
        />
        <Button icon={<PlusOutlined />} onClick={handleAddPath}>
          {t('common.add')}
        </Button>
      </div>
    </div>
  );
}
