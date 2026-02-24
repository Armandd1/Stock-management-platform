import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import toast from 'react-hot-toast';
import { Plus, ArrowRightLeft, ArrowDownToLine, ArrowUpFromLine, Inbox } from 'lucide-react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { cn } from '../utils/cn';

import { api } from '../services/api';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { RoleGuard } from '../components/layout/RoleGuard';

interface Product { id: number; name: string; sku: string; }
interface Warehouse { id: number; name: string; }
interface User { id: number; name: string | null; email: string; }
interface Movement {
  id: number;
  type: 'IN' | 'OUT' | 'TRANSFER';
  quantity: number;
  createdAt: string;
  Product: Product;
  FromWarehouse: Warehouse | null;
  ToWarehouse: Warehouse | null;
  CreatedBy: User;
}

const movementSchema = z.object({
  type: z.enum(['IN', 'OUT', 'TRANSFER']),
  productId: z.coerce.number().min(1, 'Product is required'),
  quantity: z.coerce.number().min(1, 'Quantity must be greater than 0'),
  fromWarehouseId: z.coerce.number().optional(),
  toWarehouseId: z.coerce.number().optional(),
}).superRefine((data, ctx) => {
  if (data.type === 'IN' && (!data.toWarehouseId || data.toWarehouseId < 1)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Destination warehouse required", path: ["toWarehouseId"] });
  }
  if (data.type === 'OUT' && (!data.fromWarehouseId || data.fromWarehouseId < 1)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Source warehouse required", path: ["fromWarehouseId"] });
  }
  if (data.type === 'TRANSFER') {
    if (!data.fromWarehouseId || data.fromWarehouseId < 1) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Source required", path: ["fromWarehouseId"] });
    }
    if (!data.toWarehouseId || data.toWarehouseId < 1) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Destination required", path: ["toWarehouseId"] });
    }
    if (data.fromWarehouseId && data.toWarehouseId && data.fromWarehouseId === data.toWarehouseId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Must be different warehouses", path: ["toWarehouseId"] });
    }
  }
});

type MovementFormValues = z.infer<typeof movementSchema>;

export const Movements: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterWarehouse, setFilterWarehouse] = useState<string>('ALL');
  const [filterProduct, setFilterProduct] = useState<string>('ALL');
  const [filterDate, setFilterDate] = useState<string>('');

  const { data: movements, isLoading } = useQuery({
    queryKey: ['movements', filterType, filterWarehouse, filterProduct],
    queryFn: async () => {
      const params: any = {};
      if (filterType !== 'ALL') params.type = filterType;
      if (filterWarehouse !== 'ALL') params.warehouseId = filterWarehouse;
      if (filterProduct !== 'ALL') params.productId = filterProduct;
      return (await api.get<Movement[]>('/movements', { params })).data;
    }
  });

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: async () => (await api.get<Product[]>('/products')).data
  });

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => (await api.get<Warehouse[]>('/warehouses')).data
  });

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<MovementFormValues>({
    resolver: zodResolver(movementSchema) as any,
    defaultValues: { type: 'IN', quantity: 1 }
  });

  const selectedType = watch('type');

  const openCreateModal = () => {
    reset({ type: 'IN', quantity: 1, productId: 0, toWarehouseId: 0, fromWarehouseId: 0 });
    setIsModalOpen(true);
  };

  const createMutation = useMutation({
    mutationFn: async (data: MovementFormValues) => api.post('/movements', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movements'] });
      queryClient.invalidateQueries({ queryKey: ['stock-on-hand'] });
      toast.success(t('movements.toast.recorded'));
      setIsModalOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('movements.toast.failedRecord'));
    }
  });

  const onSubmit = (data: MovementFormValues) => createMutation.mutate(data);

  const filteredMovements = movements?.filter(m => {
    if (filterDate && !m.createdAt.startsWith(filterDate)) return false;
    return true;
  });

  const getMovementIcon = (type: string) => {
    if (type === 'IN') return <ArrowDownToLine className="h-4 w-4 text-emerald-600" />;
    if (type === 'OUT') return <ArrowUpFromLine className="h-4 w-4 text-rose-600" />;
    return <ArrowRightLeft className="h-4 w-4 text-blue-600" />;
  };

  const getMovementBadgeColor = (type: string) => {
    if (type === 'IN') return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800';
    if (type === 'OUT') return 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800';
    return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{t('movements.title')}</h1>
          <p className="text-muted-foreground">{t('movements.subtitle')}</p>
        </div>
        <RoleGuard allowedRoles={['ADMIN', 'MANAGER']}>
          <Button onClick={openCreateModal} className="gap-2">
            <Plus className="h-4 w-4" />
            {t('movements.record')}
          </Button>
        </RoleGuard>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t('movements.type')}</Label>
              <Select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                <option value="ALL">{t('movements.allTypes')}</option>
                <option value="IN">{t('movements.in')}</option>
                <option value="OUT">{t('movements.out')}</option>
                <option value="TRANSFER">{t('movements.transfer')}</option>
              </Select>
            </div>
            
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t('dashboard.warehouse')}</Label>
              <Select value={filterWarehouse} onChange={(e) => setFilterWarehouse(e.target.value)}>
                <option value="ALL">{t('movements.allWarehouses')}</option>
                {warehouses?.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </Select>
            </div>
            
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t('movements.product')}</Label>
              <Select value={filterProduct} onChange={(e) => setFilterProduct(e.target.value)}>
                <option value="ALL">{t('movements.allProducts')}</option>
                {products?.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                ))}
              </Select>
            </div>
            
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t('movements.date')}</Label>
              <Input 
                type="date" 
                value={filterDate} 
                onChange={(e) => setFilterDate(e.target.value)} 
                className="w-full text-sm h-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
             <div className="py-12 flex justify-center text-muted-foreground">{t('common.loadingRecords')}</div>
          ) : !filteredMovements?.length ? (
            <div className="py-16 flex flex-col items-center justify-center text-muted-foreground text-center">
              <Inbox className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
              <p className="text-lg font-medium text-foreground">{t('common.noMovementsFound')}</p>
              <p className="text-sm">{t('common.noMovementsDesc')}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('movements.type')}</TableHead>
                  <TableHead>{t('movements.date')}</TableHead>
                  <TableHead>{t('movements.product')}</TableHead>
                  <TableHead>{t('movements.quantity')}</TableHead>
                  <TableHead>{t('movements.source')}</TableHead>
                  <TableHead>{t('movements.destination')}</TableHead>
                  <TableHead>{t('movements.user')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMovements.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border", getMovementBadgeColor(m.type))}>
                        {getMovementIcon(m.type)}
                        {m.type}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground text-sm">
                      {format(new Date(m.createdAt), 'MMM d, yyyy HH:mm')}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-foreground">{m.Product?.name}</div>
                      <div className="text-xs text-muted-foreground">{m.Product?.sku}</div>
                    </TableCell>
                    <TableCell className="font-bold text-foreground">{m.quantity}</TableCell>
                    <TableCell className="text-muted-foreground">{m.FromWarehouse?.name || '-'}</TableCell>
                    <TableCell className="text-muted-foreground">{m.ToWarehouse?.name || '-'}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{m.CreatedBy?.name || m.CreatedBy?.email}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={t('movements.recordTitle')}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label htmlFor="type">{t('movements.transactionType')}</Label>
              <Select id="type" {...register('type')}>
                <option value="IN">{t('movements.receivingIn')}</option>
                <option value="OUT">{t('movements.shippingUsage')}</option>
                <option value="TRANSFER">{t('movements.interWarehouse')}</option>
              </Select>
            </div>
            
            <div className="space-y-2 col-span-2 sm:col-span-1">
              <Label htmlFor="productId">{t('movements.product')}</Label>
              <Select id="productId" {...register('productId')}>
                <option value={0}>{t('movements.selectProduct')}</option>
                {products?.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
              </Select>
              {errors.productId && <p className="text-sm text-destructive">{t('movements.validation.productRequired')}</p>}
            </div>

            <div className="space-y-2 col-span-2 sm:col-span-1">
              <Label htmlFor="quantity">{t('movements.quantity')}</Label>
              <Input id="quantity" type="number" min="1" {...register('quantity')} />
              {errors.quantity && <p className="text-sm text-destructive">{t('movements.validation.qtyMin')}</p>}
            </div>

            {(selectedType === 'OUT' || selectedType === 'TRANSFER') && (
              <div className="space-y-2 col-span-2 sm:col-span-1 border-l-2 pl-3 border-amber-200">
                <Label htmlFor="fromWarehouseId">{t('movements.fromWarehouse')}</Label>
                <Select id="fromWarehouseId" {...register('fromWarehouseId')}>
                  <option value={0}>{t('movements.selectSource')}</option>
                  {warehouses?.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </Select>
                {errors.fromWarehouseId && <p className="text-sm text-destructive">{t('movements.validation.sourceValid')}</p>}
              </div>
            )}

            {(selectedType === 'IN' || selectedType === 'TRANSFER') && (
              <div className="space-y-2 col-span-2 sm:col-span-1 border-l-2 pl-3 border-emerald-200">
                <Label htmlFor="toWarehouseId">{t('movements.toWarehouse')}</Label>
                <Select id="toWarehouseId" {...register('toWarehouseId')}>
                  <option value={0}>{t('movements.selectDestination')}</option>
                  {warehouses?.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </Select>
                {errors.toWarehouseId && <p className="text-sm text-destructive">{t('movements.validation.destValid')}</p>}
              </div>
            )}
          </div>
          
          <div className="flex justify-end gap-2 pt-6">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>{t('common.cancel')}</Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? t('movements.processing') : t('movements.confirmMovement')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
