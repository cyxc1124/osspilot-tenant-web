import { Space } from 'antd';
import { bucketPrimaryLabel, bucketSecondaryLabel } from '../../lib/bucket';
import styles from './BucketLabel.module.css';

interface BucketLabelProps {
  bucket_name: string;
  display_name?: string | null;
  display_alias_only?: boolean;
  /** When set, overrides the per-bucket「仅显示别名」setting. */
  showSecondary?: boolean;
}

export default function BucketLabel({
  bucket_name,
  display_name,
  display_alias_only = false,
  showSecondary,
}: BucketLabelProps) {
  const showSecondaryResolved = showSecondary ?? !display_alias_only;
  const primary = bucketPrimaryLabel({ bucket_name, display_name });
  const secondary = showSecondaryResolved ? bucketSecondaryLabel({ bucket_name, display_name }) : null;

  if (!secondary) {
    return <span>{primary}</span>;
  }

  return (
    <Space direction="vertical" size={0}>
      <span>{primary}</span>
      <span className={styles.subText}>{secondary}</span>
    </Space>
  );
}
