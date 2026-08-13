import { Navigate, Outlet } from 'react-router-dom';
import { isTenantAdmin } from '../../lib/roles';
import { useAuthStore } from '../../stores/authStore';
import styles from './AuthGuard.module.css';

export default function TenantAdminGuard() {
  const user = useAuthStore((s) => s.user);

  if (!isTenantAdmin(user)) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className={styles.shell}>
      <Outlet />
    </div>
  );
}
