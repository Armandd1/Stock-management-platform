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
          toast.success(t('login.toast.githubSuccess'));
          navigate('/');
        }
      } catch (err) {
        if (isMounted) {
          toast.error(t('login.toast.githubFailed'));
          navigate('/login');
        }
      }
    };
    
    processCallback();
    
    return () => { isMounted = false; };
  }, [checkAuth, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="text-gray-500 font-medium">{t('login.completing')}</p>
      </div>
    </div>
  );
};
