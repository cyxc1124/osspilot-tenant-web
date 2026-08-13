import { useMemo, useState } from 'react';
import { CopyOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, Input, Space, Typography, message } from 'antd';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useT } from '../../i18n';
import styles from './TextPreview.module.css';

const { Text } = Typography;

interface TextPreviewProps {
  content: string;
  language: string;
  truncated?: boolean;
}

export default function TextPreview({ content, language, truncated = false }: TextPreviewProps) {
  const t = useT();
  const [search, setSearch] = useState('');

  const highlightedContent = useMemo(() => {
    if (!search.trim()) {
      return content;
    }
    return content;
  }, [content, search]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      message.success(t('preview.copied'));
    } catch {
      message.error(t('common.copyFailed'));
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.toolbar}>
        <Space wrap>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder={t('preview.searchText')}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className={styles.search}
          />
          <Button icon={<CopyOutlined />} onClick={() => void handleCopy()}>
            {t('common.copy')}
          </Button>
        </Space>
        {truncated ? (
          <Text type="warning" className={styles.truncatedHint}>
            {t('preview.truncatedHint')}
          </Text>
        ) : null}
      </div>
      <div className={styles.codePane}>
        <SyntaxHighlighter
          language={language === 'text' ? 'plaintext' : language}
          style={oneLight}
          showLineNumbers
          wrapLongLines
          customStyle={{
            margin: 0,
            borderRadius: 8,
            minHeight: 280,
            fontSize: 13,
          }}
        >
          {highlightedContent}
        </SyntaxHighlighter>
        {search.trim() ? (
          <Text type="secondary" className={styles.searchHint}>
            {t('preview.searchHint', { query: search })}
          </Text>
        ) : null}
      </div>
    </div>
  );
}
