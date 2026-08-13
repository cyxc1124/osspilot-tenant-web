import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  AuditOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  KeyOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Avatar, Dropdown, Layout, Menu, type MenuProps } from 'antd';
import { useT } from '../../i18n';
import { canViewAudit } from '../../lib/roles';
import ChangePasswordModal from '../account/ChangePasswordModal';
import LocaleSwitcher from '../LocaleSwitcher';
import { useAuthStore } from '../../stores/authStore';
import styles from './AppLayout.module.css';

const { Header, Sider, Content } = Layout;

type MenuItem = Required<MenuProps>['items'][number];

export default function AppLayout() {
  const t = useT();
  const [collapsed, setCollapsed] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const showAuditMenu = canViewAudit(user);

  const inBucketScope = /^\/buckets\/[^/]+/.test(location.pathname);

  useEffect(() => {
    setCollapsed(inBucketScope);
  }, [inBucketScope]);

  const navItems = useMemo(() => {
    const items: MenuItem[] = [
      { key: '/', icon: <DashboardOutlined />, label: t('nav.dashboard') },
      { key: '/buckets', icon: <DatabaseOutlined />, label: t('nav.buckets') },
    ];
    if (showAuditMenu) {
      items.push({ key: '/audit', icon: <AuditOutlined />, label: t('nav.audit') });
    }
    return items;
  }, [showAuditMenu, t]);

  const selectedKey = useMemo(() => {
    if (location.pathname === '/') {
      return '/';
    }
    const keys = navItems
      .filter((item): item is MenuItem & { key: string } => Boolean(item && 'key' in item))
      .map((item) => String(item.key))
      .filter((key) => key !== '/')
      .sort((a, b) => b.length - a.length);
    const match = keys.find((key) => location.pathname.startsWith(key));
    return match ?? '/';
  }, [location.pathname, navItems]);

  const displayName = user?.display_name || user?.username || t('common.user');

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'change-password',
      icon: <KeyOutlined />,
      label: t('account.changePassword'),
      onClick: () => setPasswordOpen(true),
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: t('nav.logout'),
      onClick: () => {
        void logout().then(() => navigate('/login', { replace: true }));
      },
    },
  ];

  return (
    <Layout className={styles.root}>
      <Sider
        className={styles.sider}
        collapsible
        collapsed={collapsed}
        trigger={null}
        width={220}
        collapsedWidth={64}
        theme="dark"
      >
        <div className={styles.brand}>
          <span className={styles.brandIcon}>O</span>
          {!collapsed && <span className={styles.brandText}>{t('nav.brand')}</span>}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={navItems}
          onClick={({ key }) => navigate(String(key))}
        />
      </Sider>

      <Layout className={styles.main} style={{ marginLeft: collapsed ? 64 : 220 }}>
        <Header className={styles.header}>
          <button
            type="button"
            className={styles.trigger}
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? t('nav.expandSider') : t('nav.collapseSider')}
          >
            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </button>

          <div className={styles.headerRight}>
            <LocaleSwitcher />
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <button type="button" className={styles.userTrigger}>
                <Avatar size="small" icon={<UserOutlined />} className={styles.avatar} />
                <span className={styles.userName}>{displayName}</span>
              </button>
            </Dropdown>
          </div>
        </Header>

        <Content className={styles.content}>
          <Outlet />
        </Content>
      </Layout>
      <ChangePasswordModal open={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </Layout>
  );
}
