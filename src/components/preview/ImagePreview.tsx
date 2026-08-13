import { useState } from 'react';
import { RedoOutlined, ZoomInOutlined, ZoomOutOutlined } from '@ant-design/icons';
import { Button, Space } from 'antd';
import { useT } from '../../i18n';
import styles from './ImagePreview.module.css';

interface ImagePreviewProps {
  url: string;
  filename: string;
}

const MIN_SCALE = 0.25;
const MAX_SCALE = 4;
const SCALE_STEP = 0.25;

export default function ImagePreview({ url, filename }: ImagePreviewProps) {
  const t = useT();
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);

  const zoomIn = () => setScale((value) => Math.min(MAX_SCALE, value + SCALE_STEP));
  const zoomOut = () => setScale((value) => Math.max(MIN_SCALE, value - SCALE_STEP));
  const rotate = () => setRotation((value) => (value + 90) % 360);

  return (
    <div className={styles.wrapper}>
      <div className={styles.toolbar}>
        <Space>
          <Button icon={<ZoomOutOutlined />} onClick={zoomOut} disabled={scale <= MIN_SCALE}>
            {t('preview.zoomOut')}
          </Button>
          <span className={styles.scaleLabel}>{Math.round(scale * 100)}%</span>
          <Button icon={<ZoomInOutlined />} onClick={zoomIn} disabled={scale >= MAX_SCALE}>
            {t('preview.zoomIn')}
          </Button>
          <Button icon={<RedoOutlined />} onClick={rotate}>
            {t('preview.rotate')}
          </Button>
        </Space>
      </div>
      <div className={styles.viewport}>
        <img
          className={styles.image}
          src={url}
          alt={filename}
          style={{
            transform: `scale(${scale}) rotate(${rotation}deg)`,
          }}
        />
      </div>
    </div>
  );
}
