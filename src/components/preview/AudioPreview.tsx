import { useT } from '../../i18n';
import styles from './MediaPreview.module.css';

interface AudioPreviewProps {
  url: string;
  contentType?: string | null;
}

export default function AudioPreview({ url, contentType }: AudioPreviewProps) {
  const t = useT();
  return (
    <div className={styles.wrapper}>
      <audio className={styles.player} src={url} controls preload="metadata">
        {contentType ? <source src={url} type={contentType} /> : null}
        {t('preview.audioUnsupported')}
      </audio>
    </div>
  );
}
