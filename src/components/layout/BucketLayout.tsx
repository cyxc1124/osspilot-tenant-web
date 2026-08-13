import { useMemo, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeftOutlined,
  DeleteOutlined,
  EditOutlined,
  FileProtectOutlined,
  FolderOpenOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import { Menu, Typography, type MenuProps } from 'antd';
import { getBucket } from '../../api/buckets';
import { useT } from '../../i18n';
import BucketLabel from '../buckets/BucketLabel';
import { bucketSecondaryLabel } from '../../lib/bucket';
import EditBucketDisplayNameModal from '../buckets/EditBucketDisplayNameModal';
import { isTenantAdmin } from '../../lib/roles';
import { useAuthStore } from '../../stores/authStore';
import styles from './BucketLayout.module.css';

const { Text } = Typography;

export default function BucketLayout() {
  const t = useT();
  const { bucketName: rawBucketName } = useParams<{ bucketName: string }>();
  const bucketName = rawBucketName ? decodeURIComponent(rawBucketName) : '';
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isAdmin = isTenantAdmin(user);
  const [renameOpen, setRenameOpen] = useState(false);

  const { data: bucketMeta } = useQuery({
    queryKey: ['bucket', bucketName],
    queryFn: () => getBucket(bucketName),
    enabled: Boolean(bucketName),
  });

  const selectedKey = useMemo(() => {
    if (location.pathname.endsWith('/policy')) {
      return 'policy';
    }
    if (location.pathname.endsWith('/cors')) {
      return 'cors';
    }
    if (location.pathname.endsWith('/trash')) {
      return 'trash';
    }
    return 'files';
  }, [location.pathname]);

  const menuItems: MenuProps['items'] = useMemo(() => {
    const items: MenuProps['items'] = [
      {
        key: 'files',
        icon: <FolderOpenOutlined />,
        label: t('nav.fileList'),
      },
      {
        key: 'trash',
        icon: <DeleteOutlined />,
        label: t('nav.trash'),
      },
    ];
    if (isAdmin) {
      items.push(
        {
          key: 'policy',
          icon: <FileProtectOutlined />,
          label: t('nav.policy'),
        },
        {
          key: 'cors',
          icon: <GlobalOutlined />,
          label: t('nav.cors'),
        },
        {
          key: 'rename',
          icon: <EditOutlined />,
          label: t('nav.renameDisplayName'),
        },
      );
    }
    return items;
  }, [isAdmin, t]);

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    const encoded = encodeURIComponent(bucketName);
    if (key === 'files') {
      navigate(`/buckets/${encoded}`);
      return;
    }
    if (key === 'policy') {
      navigate(`/buckets/${encoded}/policy`);
      return;
    }
    if (key === 'cors') {
      navigate(`/buckets/${encoded}/cors`);
      return;
    }
    if (key === 'trash') {
      navigate(`/buckets/${encoded}/trash`);
      return;
    }
    if (key === 'rename') {
      setRenameOpen(true);
    }
  };

  if (!bucketName) {
    return null;
  }

  return (
    <div className={styles.layout}>
      <aside className={styles.subNav}>
        <Link to="/buckets" className={styles.backLink}>
          <ArrowLeftOutlined /> {t('nav.backToBuckets')}
        </Link>
        <div className={styles.bucketTitle}>
          <BucketLabel
            bucket_name={bucketName}
            display_name={bucketMeta?.display_name}
            display_alias_only={bucketMeta?.display_alias_only}
          />
        </div>
        <Menu
          className={styles.menu}
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={handleMenuClick}
        />
        {!bucketMeta?.display_alias_only ||
        !bucketSecondaryLabel({ bucket_name: bucketName, display_name: bucketMeta?.display_name }) ? (
          <Text type="secondary" style={{ display: 'block', margin: '12px 16px 0', fontSize: 12 }}>
            {t('nav.actualBucketName')}
            <Text code>{bucketName}</Text>
          </Text>
        ) : null}
      </aside>

      <div className={styles.content}>
        <Outlet />
      </div>

      {isAdmin ? (
        <EditBucketDisplayNameModal
          open={renameOpen}
          bucketName={bucketName}
          displayName={bucketMeta?.display_name ?? null}
          displayAliasOnly={bucketMeta?.display_alias_only ?? false}
          onClose={() => setRenameOpen(false)}
        />
      ) : null}
    </div>
  );
}
