import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Alert, Button, Space, Spin, Typography, message } from 'antd';
import { openOfficeEditor, saveOfficeEditor, unlockOfficeEditor } from '../../api/editor';
import { ApiError } from '../../api/client';
import { formatDateTime, t as translate, useT } from '../../i18n';
import styles from './OfficeEditorPage.module.css';

const { Title, Text } = Typography;

type EditorStatus =
  | { kind: 'editing' }
  | { kind: 'readonly' }
  | { kind: 'unsaved' }
  | { kind: 'synced' }
  | { kind: 'saved' }
  | { kind: 'waiting' };

declare global {
  interface Window {
    DocsAPI?: {
      DocEditor: new (elementId: string, config: Record<string, unknown>) => {
        destroyEditor?: () => void;
      };
    };
  }
}

const OFFICE_EXTENSIONS = new Set(['docx', 'xlsx', 'pptx']);

function loadOnlyOfficeScript(officeUrl: string): Promise<void> {
  const src = `${officeUrl.replace(/\/$/, '')}/web-apps/apps/api/documents/api.js`;
  const existing = document.querySelector<HTMLScriptElement>(`script[data-onlyoffice="true"]`);
  if (existing?.src === src && window.DocsAPI) {
    return Promise.resolve();
  }
  if (existing) {
    existing.remove();
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.dataset.onlyoffice = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(translate('editor.onlyofficeLoadFailed')));
    document.body.appendChild(script);
  });
}

function isOfficeFile(objectKey: string): boolean {
  const ext = objectKey.split('.').pop()?.toLowerCase();
  return Boolean(ext && OFFICE_EXTENSIONS.has(ext));
}

export default function OfficeEditorPage() {
  const t = useT();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const bucketName = searchParams.get('bucket') ?? '';
  const objectKey = searchParams.get('key') ?? '';

  const editorRef = useRef<{ destroyEditor?: () => void } | null>(null);
  const tRef = useRef(t);
  tRef.current = t;
  const [status, setStatus] = useState<EditorStatus | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  const backPath = bucketName ? `/buckets/${encodeURIComponent(bucketName)}` : '/buckets';

  const {
    data: session,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['editor-open', bucketName, objectKey],
    queryFn: () =>
      openOfficeEditor({
        bucket_name: bucketName,
        object_key: objectKey,
      }),
    enabled: Boolean(bucketName && objectKey && isOfficeFile(objectKey)),
    retry: false,
  });

  const statusText =
    status?.kind === 'readonly'
      ? t('editor.readonlyOtherUser')
      : status?.kind === 'unsaved'
        ? t('editor.unsavedChanges')
        : status?.kind === 'synced'
          ? t('editor.synced')
          : status?.kind === 'saved'
            ? t('editor.savedToStorage')
            : status?.kind === 'waiting'
              ? t('editor.waitingCallback')
              : status?.kind === 'editing'
                ? t('editor.editing')
                : '';

  const saveMutation = useMutation({
    mutationFn: ({ sessionId }: { sessionId: string }) => saveOfficeEditor(sessionId),
    onSuccess: (result) => {
      if (result.saved && result.saved_at) {
        setLastSavedAt(result.saved_at);
        setStatus({ kind: 'saved' });
        message.success(t('editor.docSaved'));
      }
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError && err.status === 409) {
        setStatus({ kind: 'waiting' });
        message.info(t('editor.savePending'));
        return;
      }
      const detail = err instanceof ApiError ? err.message : t('editor.saveStatusFailed');
      message.error(detail);
    },
  });

  const isReadonly = session?.readonly ?? false;

  const releaseLock = useCallback(async () => {
    if (!bucketName || !objectKey || isReadonly) {
      return;
    }
    try {
      await unlockOfficeEditor({
        bucket_name: bucketName,
        object_key: objectKey,
      });
    } catch {
      // best-effort unlock on page leave
    }
  }, [bucketName, objectKey, isReadonly]);

  useEffect(() => {
    if (!session) {
      return;
    }

    let cancelled = false;

    const mountEditor = async () => {
      try {
        await loadOnlyOfficeScript(session.office_url);
        if (cancelled) {
          return;
        }
        editorRef.current?.destroyEditor?.();
        editorRef.current = new window.DocsAPI!.DocEditor('onlyoffice-editor', {
          ...session.config,
          events: {
            onDocumentStateChange: (event: { data: boolean }) => {
              setStatus(event.data ? { kind: 'unsaved' } : { kind: 'synced' });
            },
            onError: (event: { data: { errorCode: number; errorDescription: string } }) => {
              message.error(event.data.errorDescription || tRef.current('editor.editorError'));
            },
          },
        });
        setStatus(session.readonly ? { kind: 'readonly' } : { kind: 'editing' });
      } catch (err) {
        const detail = err instanceof Error ? err.message : tRef.current('editor.editorInitFailed');
        message.error(detail);
      }
    };

    void mountEditor();

    return () => {
      cancelled = true;
      editorRef.current?.destroyEditor?.();
      editorRef.current = null;
    };
  }, [session]);

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
      : !isOfficeFile(objectKey)
        ? t('editor.unsupportedOffice')
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
            message={t('editor.cannotOpenOffice')}
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
          <Spin tip={t('editor.openingDoc')} />
        </div>
      </div>
    );
  }

  const fileName = objectKey.split('/').pop() ?? objectKey;

  return (
    <div className={styles.page}>
      {isReadonly ? (
        <Alert
          type="info"
          showIcon
          message={t('editor.readonlyTitle')}
          description={t('editor.readonlyOfficeDesc')}
          className={styles.readonlyBanner}
        />
      ) : null}
      <div className={styles.toolbar}>
        <Space>
          <Link to={backPath}>
            <Button type="text" icon={<ArrowLeftOutlined />} />
          </Link>
          <Title level={5} className={styles.title}>
            {fileName}
          </Title>
        </Space>
        <Space>
          <Text className={styles.status}>
            {statusText}
            {lastSavedAt ? ` · ${t('editor.lastSaved', { time: formatDateTime(lastSavedAt) })}` : ''}
          </Text>
          <Button
            icon={<SaveOutlined />}
            loading={saveMutation.isPending}
            disabled={isReadonly}
            onClick={() => {
              if (!session?.session_id) {
                return;
              }
              saveMutation.mutate({ sessionId: session.session_id });
            }}
          >
            {t('editor.refreshSaveStatus')}
          </Button>
        </Space>
      </div>
      <div className={styles.frameWrap}>
        <div id="onlyoffice-editor" className={styles.frame} />
      </div>
    </div>
  );
}
