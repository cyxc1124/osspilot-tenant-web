import { useCallback, useState } from 'react';
import { CloudUploadOutlined, ReloadOutlined } from '@ant-design/icons';
import { Button, Progress, Table, Typography, Upload } from 'antd';
import { ApiError } from '../../api/client';
import type { RcFile } from 'antd/es/upload';
import { useT } from '../../i18n';
import { buildObjectKey } from '../../lib/format';
import { uploadFile } from '../../lib/uploadFile';
import { formatBytes } from '../../lib/format';
import styles from './FileUploadPanel.module.css';

export type UploadTaskStatus = 'waiting' | 'uploading' | 'done' | 'error';

export interface UploadTask {
  uid: string;
  name: string;
  size: number;
  status: UploadTaskStatus;
  percent: number;
  error?: string;
  file: File;
}

interface FileUploadPanelProps {
  bucketName: string;
  prefix: string;
    onUploaded: () => void;
}

function createTask(file: RcFile): UploadTask {
  return {
    uid: file.uid,
    name: file.name,
    size: file.size,
    status: 'waiting',
    percent: 0,
    file,
  };
}

export default function FileUploadPanel({
  bucketName,
  prefix,
  onUploaded,
}: FileUploadPanelProps) {
  const t = useT();
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const [uploading, setUploading] = useState(false);

  const updateTask = useCallback((uid: string, patch: Partial<UploadTask>) => {
    setTasks((prev) => prev.map((task) => (task.uid === uid ? { ...task, ...patch } : task)));
  }, []);

  const runUpload = useCallback(
    async (task: UploadTask) => {
      updateTask(task.uid, { status: 'uploading', percent: 0, error: undefined });
      try {
        await uploadFile({
          bucketName,
          objectKey: buildObjectKey(prefix, task.name),
          file: task.file,
          onProgress: (percent) => updateTask(task.uid, { percent }),
        });
        updateTask(task.uid, { status: 'done', percent: 100 });
        onUploaded();
      } catch (error) {
        const text =
          error instanceof ApiError
            ? error.message
            : error instanceof Error
              ? error.message
              : t('common.uploadFailed');
        updateTask(task.uid, { status: 'error', error: text });
        throw error;
      }
    },
    [bucketName, prefix, onUploaded, updateTask, t],
  );

  const processQueue = useCallback(
    async (incoming: UploadTask[]) => {
      setUploading(true);
      for (const task of incoming) {
        try {
          await runUpload(task);
        } catch {
          // keep going with remaining files
        }
      }
      setUploading(false);
    },
    [runUpload],
  );

  const handleFiles = (files: RcFile[]) => {
    const newTasks = files.map(createTask);
    setTasks((prev) => [...newTasks, ...prev]);
    void processQueue(newTasks);
  };

  const retryTask = (task: UploadTask) => {
    void processQueue([task]);
  };

  const clearFinished = () => {
    setTasks((prev) => prev.filter((task) => task.status !== 'done'));
  };

  return (
    <div className={styles.panel}>
      <Upload.Dragger
        multiple
        showUploadList={false}
        disabled={uploading}
        beforeUpload={(file, fileList) => {
          if (fileList.indexOf(file) === fileList.length - 1) {
            handleFiles(fileList as RcFile[]);
          }
          return false;
        }}
      >
        <p className="ant-upload-drag-icon">
          <CloudUploadOutlined />
        </p>
        <p className="ant-upload-text">{t('files.uploadDragText')}</p>
        <p className="ant-upload-hint">{t('files.uploadDragHint')}</p>
      </Upload.Dragger>

      {tasks.length > 0 && (
        <div className={styles.taskSection}>
          <div className={styles.taskHeader}>
            <span>{t('files.uploadTasks')}</span>
            <Button type="link" size="small" onClick={clearFinished}>
              {t('files.clearFinished')}
            </Button>
          </div>
          <Table
            size="small"
            rowKey="uid"
            pagination={false}
            dataSource={tasks}
            columns={[
              { title: t('files.fileName'), dataIndex: 'name', ellipsis: true },
              {
                title: t('common.size'),
                dataIndex: 'size',
                width: 100,
                render: (size: number) => formatBytes(size),
              },
              {
                title: t('files.progress'),
                dataIndex: 'percent',
                width: 220,
                render: (_: number, record: UploadTask) => (
                  <div>
                    <Progress
                      percent={record.percent}
                      size="small"
                      status={
                        record.status === 'error'
                          ? 'exception'
                          : record.status === 'done'
                            ? 'success'
                            : 'active'
                      }
                    />
                    {record.error ? (
                      <Typography.Text type="danger" style={{ fontSize: 12 }}>
                        {record.error}
                      </Typography.Text>
                    ) : null}
                  </div>
                ),
              },
              {
                title: t('common.actions'),
                width: 100,
                render: (_: unknown, record: UploadTask) =>
                  record.status === 'error' ? (
                    <Button
                      type="link"
                      size="small"
                      icon={<ReloadOutlined />}
                      onClick={() => retryTask(record)}
                    >
                      {t('common.retry')}
                    </Button>
                  ) : null,
              },
            ]}
          />
        </div>
      )}
    </div>
  );
}
