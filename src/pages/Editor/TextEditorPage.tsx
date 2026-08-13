import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons';
import Editor from '@monaco-editor/react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Alert, Button, Space, Spin, Typography, message } from 'antd';
import {
  closeTextEditor,
  openTextEditor,
  saveTextEditor,
  unlockTextEditor,
} from '../../api/textEdit';
import { ApiError } from '../../api/client';
import { formatDateTime, useT } from '../../i18n';
import { isTextEditable, monacoLanguage } from '../../lib/edit';
import styles from './TextEditorPage.module.css';

const { Title, Text } = Typography;

type EditorStatus =
  | { kind: 'editing' }
  | { kind: 'readonly' }
  | { kind: 'saved'; version: number };

export default function TextEditorPage() {
  const t = useT();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const bucketName = searchParams.get('bucket') ?? '';
  const objectKey = searchParams.get('key') ?? '';

  const [editorValue, setEditorValue] = useState('');
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<EditorStatus | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const lockTokenRef = useRef<string | null>(null);

  const backPath = bucketName ? `/buckets/${encodeURIComponent(bucketName)}` : '/buckets';

  const {
    data: session,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['text-edit-open', bucketName, objectKey],
    queryFn: () =>
      openTextEditor({
        bucket_name: bucketName,
        object_key: objectKey,
      }),
    enabled: Boolean(bucketName && objectKey && isTextEditable(objectKey)),
    retry: false,
  });

  const isReadonly = session?.readonly ?? false;

  useEffect(() => {
    if (!session) {
      return;
    }
    setEditorValue(session.content);
    lockTokenRef.current = session.lock_token || null;
    setDirty(false);
    setStatus(session.readonly ? { kind: 'readonly' } : { kind: 'editing' });
  }, [session]);

  const statusText =
    status?.kind === 'readonly'
      ? t('editor.readonlyOtherUser')
      : status?.kind === 'saved'
        ? t('editor.savedVersion', { version: status.version })
        : status?.kind === 'editing'
          ? t('editor.editing')
          : '';

  const saveMutation = useMutation({
    mutationFn: ({ sessionId, content }: { sessionId: string; content: string }) =>
      saveTextEditor(sessionId, content),
    onSuccess: (result) => {
      if (result.saved) {
        setLastSavedAt(result.saved_at);
        setDirty(false);
        setStatus({ kind: 'saved', version: result.version_no });
        message.success(t('editor.fileSaved'));
      }
    },
    onError: (err: unknown) => {
      const detail = err instanceof ApiError ? err.message : t('common.saveFailed');
      message.error(detail);
    },
  });

  const releaseLock = useCallback(async () => {
    if (!bucketName || !objectKey || isReadonly) {
      return;
    }
    if (session?.session_id) {
      try {
        await closeTextEditor(session.session_id);
      } catch {
        // best-effort close
      }
    }
    try {
      await unlockTextEditor({
        bucket_name: bucketName,
        object_key: objectKey,
        lock_token: lockTokenRef.current ?? undefined,
      });
    } catch {
      // best-effort unlock on page leave
    }
  }, [bucketName, objectKey, isReadonly, session?.session_id]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      void releaseLock();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      void releaseLock();
    };
  }, [releaseLock]);

  const loadError =
    !bucketName || !objectKey
      ? t('editor.missingParams')
      : !isTextEditable(objectKey)
        ? t('editor.unsupportedText')
        : error instanceof ApiError
          ? error.message
          : error
            ? t('editor.openFailed')
            : null;

  if (loadError) {
    return (
      <div className={styles.page}>
        <div className={styles.error}>
          <Alert
            type="error"
            showIcon
            message={t('editor.cannotOpenText')}
            description={String(loadError)}
            action={
              <Button type="primary" onClick={() => navigate(backPath)}>
                {t('editor.backToFiles')}
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  if (isLoading || !session) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>
          <Spin tip={t('editor.loadingContent')} />
        </div>
      </div>
    );
  }

  const fileName = objectKey.split('/').pop() ?? objectKey;
  const language = monacoLanguage(objectKey, session.language);

  return (
    <div className={styles.page}>
      {isReadonly ? (
        <Alert
          type="info"
          showIcon
          message={t('editor.readonlyTitle')}
          description={t('editor.readonlyTextDesc')}
          className={styles.readonlyBanner}
        />
      ) : null}
      <div className={styles.toolbar}>
        <Space>
          <Link to={backPath}>
            <Button type="text" icon={<ArrowLeftOutlined />} style={{ color: '#ccc' }} />
          </Link>
          <Title level={5} className={styles.title}>
            {fileName}
          </Title>
        </Space>
        <Space>
          <Text className={styles.status}>
            {statusText}
            {dirty ? ` · ${t('editor.unsavedChanges')}` : ''}
            {lastSavedAt ? ` · ${t('editor.lastSaved', { time: formatDateTime(lastSavedAt) })}` : ''}
          </Text>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={saveMutation.isPending}
            disabled={isReadonly || !dirty}
            onClick={() => {
              if (!session?.session_id) {
                return;
              }
              saveMutation.mutate({ sessionId: session.session_id, content: editorValue });
            }}
          >
            {t('common.save')}
          </Button>
        </Space>
      </div>
      <div className={styles.editorWrap}>
        <Editor
          height="100%"
          language={language}
          value={editorValue}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            wordWrap: 'on',
            automaticLayout: true,
            readOnly: isReadonly,
          }}
          onChange={(value) => {
            setEditorValue(value ?? '');
            setDirty(true);
            setStatus({ kind: 'editing' });
          }}
        />
      </div>
    </div>
  );
}
