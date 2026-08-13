import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerUnauthorizedHandler } from '../../api/client';
import { useAuthStore } from '../../stores/authStore';

/** Registers global 401 handler and restores session from storage. */
export default function AuthBootstrap() {
  const navigate = useNavigate();
  const clearSession = useAuthStore((s) => s.clearSession);

  useEffect(() => {
    registerUnauthorizedHandler(() => {
      clearSession();
      navigate('/login', { replace: true });
    });
  }, [clearSession, navigate]);

  return null;
}
