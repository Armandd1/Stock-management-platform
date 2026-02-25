import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import toast from 'react-hot-toast';
import { Plus, Trash2, Edit, Warehouse as WarehouseIcon, Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

import { api } from '../services/api';
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
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Modal } from '../components/ui/Modal';
import { RoleGuard } from '../components/layout/RoleGuard';

interface Warehouse {
  id: number;
  name: string;
  location: string | null;
}

interface WarehouseDetails extends Warehouse {
  Stocks: {
    quantity: number;
    Product: { id: number; sku: string; name: string };
  }[];
}

const warehouseSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  location: z.string().optional(),
});

type WarehouseFormValues = z.infer<typeof warehouseSchema>;

export const Warehouses: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [viewingWarehouseId, setViewingWarehouseId] = useState<number | null>(null);

  useEffect(() => {
    const state = location.state as { viewWarehouseId?: number } | null;
    if (state?.viewWarehouseId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setViewingWarehouseId(state.viewWarehouseId);
    }
  }, [location.state]);

  const {
    data: warehouses,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => (await api.get<Warehouse[]>('/warehouses')).data,
  });

  const { data: warehouseDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['warehouse', viewingWarehouseId],
    queryFn: async () => {
      const res = await api.get<WarehouseDetails>(`/warehouses/${viewingWarehouseId}`);
      return res.data;
    },
    enabled: !!viewingWarehouseId,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<WarehouseFormValues>({
    resolver: zodResolver(warehouseSchema),
  });

  const openCreateModal = () => {
    setEditingWarehouse(null);
    reset({ name: '', location: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (warehouse: Warehouse) => {
    setEditingWarehouse(warehouse);
    reset({
      name: warehouse.name,
      location: warehouse.location || '',
    });
    setIsModalOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async (data: WarehouseFormValues) => {
      if (editingWarehouse) {
        return api.patch(`/warehouses/${editingWarehouse.id}`, data);
      }
      return api.post('/warehouses', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      toast.success(
        editingWarehouse ? t('warehouses.toast.updated') : t('warehouses.toast.created'),
      );
      setIsModalOpen(false);
    },
    onError: (error) => {
      const e = error as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message || t('warehouses.toast.failedSave'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => api.delete(`/warehouses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      toast.success(t('warehouses.toast.deleted'));
    },
    onError: () => toast.error(t('warehouses.toast.failedDelete')),
  });

  const onSubmit = (data: WarehouseFormValues) => saveMutation.mutate(data);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {t('warehouses.title')}
          </h1>
          <p className="text-muted-foreground">{t('warehouses.subtitle')}</p>
        </div>
        <RoleGuard allowedRoles={['ADMIN', 'MANAGER']}>
          <Button onClick={openCreateModal} className="gap-2">
            <Plus className="h-4 w-4" />
            {t('warehouses.add')}
          </Button>
        </RoleGuard>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 flex justify-center text-muted-foreground">
              {t('common.loadingWarehouses')}
            </div>
          ) : isError ? (
            <div className="py-12 flex justify-center text-destructive">
              {t('common.failedLoadWarehouses')}
            </div>
          ) : !warehouses?.length ? (
            <div className="py-16 flex flex-col items-center justify-center text-muted-foreground text-center">
              <WarehouseIcon className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
              <p className="text-lg font-medium text-foreground">{t('common.noWarehousesFound')}</p>
              <p className="text-sm">{t('common.noWarehousesDesc')}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('warehouses.locationDetails')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {warehouses.map((warehouse) => (
                  <TableRow
                    key={warehouse.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setViewingWarehouseId(warehouse.id)}
                  >
                    <TableCell>
                      <div className="font-medium text-foreground text-base">{warehouse.name}</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {warehouse.location || t('warehouses.noLocation')}
                      </div>
                    </TableCell>
                    <TableCell className="text-right align-top pt-4">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewingWarehouseId(warehouse.id);
                          }}
                          className="h-8 w-8 text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <RoleGuard allowedRoles={['ADMIN', 'MANAGER']}>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditModal(warehouse);
                            }}
                            className="h-8 w-8 text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </RoleGuard>
                        <RoleGuard allowedRoles={['ADMIN']}>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(t('common.confirmDeleteWh')))
                                deleteMutation.mutate(warehouse.id);
                            }}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </RoleGuard>
                      </div>
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
        title={editingWarehouse ? t('warehouses.editTitle') : t('warehouses.addTitle')}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t('warehouses.name')}</Label>
            <Input id="name" {...register('name')} placeholder={t('warehouses.namePlaceholder')} />
            {errors.name && (
              <p className="text-sm text-destructive">{t('warehouses.validation.nameMin')}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">{t('warehouses.location')}</Label>
            <Input
              id="location"
              {...register('location')}
              placeholder={t('warehouses.locationPlaceholder')}
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? t('common.loading') : t('warehouses.saveWarehouse')}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!viewingWarehouseId}
        onClose={() => setViewingWarehouseId(null)}
        title={t('warehouses.detailsTitle')}
      >
        <div className="space-y-4">
          {isLoadingDetails ? (
            <div className="py-8 flex justify-center text-muted-foreground">
              {t('common.loadingDetails')}
            </div>
          ) : warehouseDetails ? (
            <>
              <div>
                <h3 className="font-semibold text-foreground text-lg">{warehouseDetails.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('warehouses.location')}:{' '}
                  {warehouseDetails.location || t('warehouses.noLocation')}
                </p>
              </div>

              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>{t('dashboard.product')}</TableHead>
                      <TableHead className="text-right">{t('products.stockLevel')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {warehouseDetails.Stocks.length > 0 ? (
                      warehouseDetails.Stocks.map((stock, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            <div className="font-medium text-foreground">{stock.Product.name}</div>
                            <div className="text-xs text-muted-foreground">{stock.Product.sku}</div>
                          </TableCell>
                          <TableCell className="text-right font-bold text-foreground">
                            {stock.quantity}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-muted-foreground py-4">
                          {t('warehouses.noStock')}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          ) : (
            <div className="py-8 flex justify-center text-destructive">
              {t('common.failedLoadDetails')}
            </div>
          )}

          <div className="flex justify-end pt-4">
            <Button onClick={() => setViewingWarehouseId(null)}>{t('common.close')}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
