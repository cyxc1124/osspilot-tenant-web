import { Navigate, Outlet } from 'react-router-dom';
import { canViewAudit } from '../../lib/roles';
import { useAuthStore } from '../../stores/authStore';
import styles from './AuthGuard.module.css';

export default function AuditGuard() {
  const user = useAuthStore((s) => s.user);

  if (!canViewAudit(user)) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className={styles.shell}>
      <Outlet />
    </div>
  );
}
