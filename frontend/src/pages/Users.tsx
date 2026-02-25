import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Users as UsersIcon, ShieldAlert } from 'lucide-react';

import { api } from '../services/api';
import { useAuthStore } from '../store/useAuthStore';
import { Card, CardContent } from '../components/ui/Card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Select } from '../components/ui/Select';
import { Label } from '../components/ui/Label';
import { RoleGuard } from '../components/layout/RoleGuard';

interface User {
  id: number;
  email: string;
  name: string | null;
  role: 'ADMIN' | 'MANAGER' | 'VIEWER';
}

export const Users: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<'ADMIN' | 'MANAGER' | 'VIEWER'>('VIEWER');

  const {
    data: users,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await api.get<User[]>('/users')).data,
  });

  const roleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: number; role: string }) => {
      return api.patch(`/users/${id}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(t('users.toast.roleUpdated'));
      setIsModalOpen(false);
    },
    onError: (error) => {
      const e = error as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message || t('users.toast.failedUpdate'));
    },
  });

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setSelectedRole(user.role);
    setIsModalOpen(true);
  };

  const handleSaveRole = () => {
    if (editingUser) {
      roleMutation.mutate({ id: editingUser.id, role: selectedRole });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{t('users.title')}</h1>
          <p className="text-muted-foreground">{t('users.subtitle')}</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 flex justify-center text-muted-foreground">
              {t('common.loadingUsers')}
            </div>
          ) : isError ? (
            <div className="py-12 flex justify-center text-destructive">
              {t('common.failedLoadUsers')}
            </div>
          ) : !users?.length ? (
            <div className="py-16 flex flex-col items-center justify-center text-muted-foreground text-center">
              <UsersIcon className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
              <p className="text-lg font-medium text-foreground">{t('users.noUsersFound')}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('users.name')}</TableHead>
                  <TableHead>{t('users.email')}</TableHead>
                  <TableHead>{t('users.role')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium text-foreground">
                      {user.name || '-'}
                      {currentUser?.id === user.id && (
                        <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          {t('users.you')}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ring-1 ring-inset ${
                          user.role === 'ADMIN'
                            ? 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-900/10 dark:text-red-400 dark:ring-red-500/20'
                            : user.role === 'MANAGER'
                              ? 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-900/10 dark:text-blue-400 dark:ring-blue-500/20'
                              : 'bg-slate-50 text-slate-700 ring-slate-600/20 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-600/50'
                        }`}
                      >
                        {user.role}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {currentUser?.id !== user.id && (
                        <RoleGuard allowedRoles={['ADMIN']}>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditModal(user)}
                            className="text-xs"
                          >
                            {t('users.changeRole')}
                          </Button>
                        </RoleGuard>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={t('users.editRoleTitle')}
      >
        <div className="space-y-4 pt-2">
          {editingUser && (
            <div className="bg-muted p-3 rounded-md text-sm mb-4">
              <p className="font-medium text-foreground">{editingUser.name || editingUser.email}</p>
              <p className="text-muted-foreground text-xs">{editingUser.email}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="role">{t('users.selectRole')}</Label>
            <Select
              id="role"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as 'ADMIN' | 'MANAGER' | 'VIEWER')}
              className="w-full"
            >
              <option value="VIEWER">VIEWER</option>
              <option value="MANAGER">MANAGER</option>
              <option value="ADMIN">ADMIN</option>
            </Select>
          </div>

          {selectedRole === 'ADMIN' && (
            <div className="p-3 bg-amber-50 text-amber-700 text-sm rounded-md border border-amber-200 mt-2 flex gap-2 items-start dark:bg-amber-900/20 dark:border-amber-900/30 dark:text-amber-400">
              <ShieldAlert className="h-5 w-5 shrink-0" />
              <p>{t('users.adminWarning')}</p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              type="button"
              onClick={handleSaveRole}
              disabled={roleMutation.isPending || selectedRole === editingUser?.role}
            >
              {roleMutation.isPending ? t('common.loading') : t('common.save')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
