import { useT } from '../../i18n';
import styles from './MediaPreview.module.css';

interface VideoPreviewProps {
  url: string;
  contentType?: string | null;
}

export default function VideoPreview({ url, contentType }: VideoPreviewProps) {
  const t = useT();
  return (
    <div className={styles.wrapper}>
      <video
        className={styles.player}
        src={url}
        controls
        playsInline
        preload="metadata"
      >
        {contentType ? <source src={url} type={contentType} /> : null}
        {t('preview.videoUnsupported')}
      </video>
    </div>
  );
}
