import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Spin } from 'antd';
import { useT } from '../../i18n';
import { useAuthStore } from '../../stores/authStore';
import styles from './AuthGuard.module.css';

export default function AuthGuard() {
  const t = useT();
  const location = useLocation();
  const { token, user, initialized, hydrating, hydrate } = useAuthStore();

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  if (!initialized || hydrating) {
    return (
      <div className={styles.loading}>
        <Spin size="large" tip={t('auth.loading')} />
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
