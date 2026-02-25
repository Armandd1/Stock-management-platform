import React from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { LogOut, User as UserIcon, Menu, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { ModeToggle } from '../mode-toggle';
import { LanguageSwitcher } from '../LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import { logger } from '../../utils/logger';

interface HeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  onMobileMenuToggle?: () => void;
  mobileMenuOpen?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  className,
  onMobileMenuToggle,
  mobileMenuOpen,
  ...props
}) => {
  const { user, logout } = useAuthStore();
  const { t } = useTranslation();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      logger.error({ err: error }, 'Logout failed');
    }
  };

  return (
    <header className={className} {...props}>
      <div className="flex h-full items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left side: hamburger menu for mobile */}
        <div className="flex items-center md:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMobileMenuToggle}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            className="text-muted-foreground hover:text-foreground"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Spacer for desktop (no hamburger shown) */}
        <div className="hidden md:block" />

        {/* Right side */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-sm font-medium text-foreground leading-none mb-1">
              {user?.name || user?.email}
            </span>
            <span className="text-xs text-muted-foreground leading-none">{user?.role}</span>
          </div>
          <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center border border-border">
            <UserIcon className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="h-5 w-px bg-border mx-1"></div>
          <LanguageSwitcher />
          <ModeToggle />
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            title={t('nav.logout')}
            className="text-muted-foreground hover:text-destructive"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
};
