import { useT } from '../../i18n';
import styles from './PdfPreview.module.css';

interface PdfPreviewProps {
  url: string;
  filename: string;
}

export default function PdfPreview({ url, filename }: PdfPreviewProps) {
  const t = useT();
  return (
    <div className={styles.wrapper}>
      <iframe
        className={styles.frame}
        src={url}
        title={t('preview.pdfTitle', { filename })}
      />
    </div>
  );
}
