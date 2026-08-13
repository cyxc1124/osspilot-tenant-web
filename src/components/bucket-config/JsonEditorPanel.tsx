import Editor from '@monaco-editor/react';
import { Spin } from 'antd';
import { useT } from '../../i18n';
import styles from './JsonEditorPanel.module.css';

interface JsonEditorPanelProps {
  value: string;
  loading?: boolean;
  loadingTip?: string;
  onChange: (value: string) => void;
}

export default function JsonEditorPanel({
  value,
  loading = false,
  loadingTip,
  onChange,
}: JsonEditorPanelProps) {
  const t = useT();

  return (
    <div className={styles.shell}>
      {loading ? (
        <div className={styles.loading}>
          <Spin tip={loadingTip ?? t('common.loading')} />
        </div>
      ) : (
        <Editor
          height="100%"
          defaultLanguage="json"
          value={value}
          onChange={(next) => onChange(next ?? '')}
          options={{
            minimap: { enabled: false },
            wordWrap: 'on',
            fontSize: 14,
            automaticLayout: true,
          }}
        />
      )}
    </div>
  );
}
