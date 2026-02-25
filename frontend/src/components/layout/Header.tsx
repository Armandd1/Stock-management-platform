import React from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { LogOut, User as UserIcon } from 'lucide-react';
import { Button } from '../ui/Button';
import { ModeToggle } from '../mode-toggle';
import { LanguageSwitcher } from '../LanguageSwitcher';
import { useTranslation } from 'react-i18next';

interface HeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Header: React.FC<HeaderProps> = ({ className, ...props }) => {
  const { user, logout } = useAuthStore();
  const { t } = useTranslation();

  const handleLogout = () => {
    logout();
  };

  return (
    <header className={className} {...props}>
      <div className="flex h-full items-center justify-end px-4 sm:px-6 lg:px-8">
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
