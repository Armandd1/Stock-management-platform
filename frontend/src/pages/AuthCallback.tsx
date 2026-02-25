import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

export const AuthCallback: React.FC = () => {
  const { checkAuth } = useAuthStore();
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    let isMounted = true;

    const processCallback = async () => {
      try {
        await checkAuth(); // Reads the http-only cookie set by backend
        if (isMounted) {
          toast.success(t('auth.toast.githubSuccess'));
          navigate('/');
        }
      } catch (_err) {
        if (isMounted) {
          toast.error(t('auth.toast.githubFailed'));
          navigate('/login');
        }
      }
    };

    processCallback();

    return () => {
      isMounted = false;
    };
  }, [checkAuth, navigate, t]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="text-muted-foreground font-medium">{t('auth.completing')}</p>
      </div>
    </div>
  );
};
