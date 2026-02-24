import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Package, Warehouse, ArrowRightLeft, Boxes } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../utils/cn';
import { useAuthStore, type Role } from '../../store/useAuthStore';

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Sidebar: React.FC<SidebarProps> = ({ className, ...props }) => {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  
  const navigation: { name: string; href: string; icon: any; allowedRoles?: Role[] }[] = [
    { name: t('nav.dashboard'), href: '/', icon: LayoutDashboard },
    { name: t('nav.products'), href: '/products', icon: Package },
    { name: t('nav.warehouses'), href: '/warehouses', icon: Warehouse },
    { name: t('nav.movements'), href: '/movements', icon: ArrowRightLeft, allowedRoles: ['ADMIN', 'MANAGER'] },
  ];

  const filteredNavigation = navigation.filter(item => {
    if (!item.allowedRoles) return true;
    return user && item.allowedRoles.includes(user.role);
  });

  return (
    <div className={cn('flex h-full flex-col bg-card/50 backdrop-blur-xl border-r border-border text-foreground', className)} {...props}>
      <div className="flex h-16 shrink-0 items-center px-6 border-b border-border">
        <Boxes className="h-6 w-6 text-primary flex-shrink-0" />
        <span className="ml-3 text-lg font-bold tracking-tight text-foreground">Stockify</span>
      </div>
      <div className="flex flex-1 flex-col overflow-y-auto pt-5 pb-4">
        <nav className="flex-1 space-y-1 px-3">
          {filteredNavigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                cn(
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  'group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    className={cn(
                      isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-accent-foreground',
                      'mr-3 h-5 w-5 flex-shrink-0 transition-colors'
                    )}
                    aria-hidden="true"
                  />
                  {item.name}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
};
