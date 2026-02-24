import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import toast from 'react-hot-toast';
import { Plus, Trash2, Edit, Warehouse as WarehouseIcon } from 'lucide-react';

import { api } from '../services/api';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
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

const warehouseSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  location: z.string().optional(),
});

type WarehouseFormValues = z.infer<typeof warehouseSchema>;

export const Warehouses: React.FC = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);

  const { data: warehouses, isLoading, isError } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => (await api.get<Warehouse[]>('/warehouses')).data
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<WarehouseFormValues>({
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
      toast.success(`Warehouse successfully ${editingWarehouse ? 'updated' : 'created'}`);
      setIsModalOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to save warehouse');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => api.delete(`/warehouses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      toast.success('Warehouse deleted');
    },
    onError: () => toast.error('Failed to delete warehouse')
  });

  const onSubmit = (data: WarehouseFormValues) => saveMutation.mutate(data);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Warehouses</h1>
          <p className="text-muted-foreground">Manage your storage locations and facilities.</p>
        </div>
        <RoleGuard allowedRoles={['ADMIN', 'MANAGER']}>
          <Button onClick={openCreateModal} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Warehouse
          </Button>
        </RoleGuard>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 flex justify-center text-muted-foreground">Loading warehouses...</div>
          ) : isError ? (
            <div className="py-12 flex justify-center text-destructive">Failed to load warehouses.</div>
          ) : !warehouses?.length ? (
            <div className="py-16 flex flex-col items-center justify-center text-muted-foreground text-center">
              <WarehouseIcon className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
              <p className="text-lg font-medium text-foreground">No warehouses configured</p>
              <p className="text-sm">Click "Add Warehouse" to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Location Details</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {warehouses.map((warehouse) => (
                  <TableRow key={warehouse.id}>
                    <TableCell>
                      <div className="font-medium text-foreground text-base">{warehouse.name}</div>
                      <div className="text-sm text-muted-foreground mt-1">{warehouse.location || 'No location specified'}</div>
                    </TableCell>
                    <TableCell className="text-right align-top pt-4">
                      <div className="flex justify-end gap-2">
                        <RoleGuard allowedRoles={['ADMIN', 'MANAGER']}>
                          <Button variant="ghost" size="icon" onClick={() => openEditModal(warehouse)} className="h-8 w-8 text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </RoleGuard>
                        <RoleGuard allowedRoles={['ADMIN']}>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => { if(confirm('Delete this warehouse? Action is irreversible.')) deleteMutation.mutate(warehouse.id) }} 
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
        title={editingWarehouse ? 'Edit Warehouse' : 'Register Warehouse'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Warehouse Name</Label>
            <Input id="name" {...register('name')} placeholder="e.g. Main Hub" />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Physical Location (Optional)</Label>
            <Input id="location" {...register('location')} placeholder="e.g. 123 Storage Lane, City" />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : 'Save Warehouse'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
