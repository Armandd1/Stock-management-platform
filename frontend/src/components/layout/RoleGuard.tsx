import type React from 'react';
import { useAuthStore, type Role } from '../../store/useAuthStore';
import { Navigate } from 'react-router-dom';

interface RoleGuardProps {
  allowedRoles: Role[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
  isRoute?: boolean;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  allowedRoles,
  children,
  fallback = null,
  isRoute = false,
}) => {
  const { user } = useAuthStore();

  if (!user || !allowedRoles.includes(user.role)) {
    if (isRoute) {
      return <Navigate to="/" replace />;
    }
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
