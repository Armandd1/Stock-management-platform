import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import QRCode from 'react-qr-code';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import toast from 'react-hot-toast';
import { Plus, Search, Trash2, Edit, Package, Eye, Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

import { api } from '../services/api';

import { Card, CardContent, CardHeader } from '../components/ui/Card';
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

interface Product {
  id: number;
  sku: string;
  name: string;
  description: string | null;
  price: number;
}

const productSchema = z.object({
  sku: z.string().min(3, 'SKU must be at least 3 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  price: z.coerce.number().min(0, 'Price must be positive'),
});

type ProductFormValues = z.infer<typeof productSchema>;

interface ProductDetails extends Product {
  Stocks: {
    quantity: number;
    Warehouse: { id: number; name: string; location: string | null };
  }[];
}

export const Products: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewingProductId, setViewingProductId] = useState<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);

    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const state = location.state as { viewProductId?: number } | null;
    if (state?.viewProductId) {
      setViewingProductId(state.viewProductId);
    }
  }, [location.state]);

  const {
    data: products,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['products', debouncedSearch],
    queryFn: async () => {
      const res = await api.get<Product[]>('/products', { params: { search: debouncedSearch } });
      return res.data;
    },
  });

  const { data: productDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['product', viewingProductId],
    queryFn: async () => {
      const res = await api.get<ProductDetails>(`/products/${viewingProductId}`);
      return res.data;
    },
    enabled: !!viewingProductId,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProductFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(productSchema) as any,
  });

  const openCreateModal = () => {
    setEditingProduct(null);
    reset({ sku: '', name: '', description: '', price: 0 });
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    reset({
      sku: product.sku,
      name: product.name,
      description: product.description || '',
      price: product.price,
    });
    setIsModalOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async (data: ProductFormValues) => {
      if (editingProduct) {
        return api.patch(`/products/${editingProduct.id}`, data);
      }
      return api.post('/products', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(editingProduct ? t('products.toast.updated') : t('products.toast.created'));
      setIsModalOpen(false);
    },
    onError: (error) => {
      const e = error as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message || t('products.toast.failedSave'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => api.delete(`/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(t('products.toast.deleted'));
    },
    onError: () => toast.error(t('products.toast.failedDelete')),
  });

  const importMutation = useMutation({
    mutationFn: async (data: Omit<Product, 'id'>[]) => api.post('/products/bulk', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(t('products.toast.imported'));
    },
    onError: () => toast.error(t('products.toast.failedImport')),
  });

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsedData = results.data as Record<string, string>[];
        const validProducts: Omit<Product, 'id'>[] = [];
        let errorCount = 0;

        parsedData.forEach((row) => {
          if (row.sku && row.name && row.price && !isNaN(Number(row.price))) {
            validProducts.push({
              sku: row.sku,
              name: row.name,
              description: row.description || '',
              price: Number(row.price),
            });
          } else {
            errorCount++;
          }
        });

        if (validProducts.length > 0) {
          importMutation.mutate(validProducts);
        } else {
          toast.error(t('products.toast.noValidRows'));
        }

        if (errorCount > 0) {
          toast.error(t('products.toast.invalidRowsSkipped', { count: errorCount }));
        }

        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      },
    });
  };

  const onSubmit = (data: ProductFormValues) => saveMutation.mutate(data);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {t('products.title')}
          </h1>
          <p className="text-muted-foreground">{t('products.subtitle')}</p>
        </div>
        <RoleGuard allowedRoles={['ADMIN', 'MANAGER']}>
          <div className="flex gap-2 items-center">
            <input
              type="file"
              accept=".csv"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="gap-2"
              disabled={importMutation.isPending}
            >
              <Upload className="h-4 w-4" />
              {importMutation.isPending ? t('common.loading') : t('products.importCsv')}
            </Button>
            <Button onClick={openCreateModal} className="gap-2">
              <Plus className="h-4 w-4" />
              {t('products.add')}
            </Button>
          </div>
        </RoleGuard>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center space-x-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder={t('products.searchPlaceholder')}
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 flex justify-center text-muted-foreground">
              {t('common.loadingProducts')}
            </div>
          ) : isError ? (
            <div className="py-8 flex justify-center text-destructive">
              {t('common.failedLoadProducts')}
            </div>
          ) : !products?.length ? (
            <div className="py-12 flex flex-col items-center justify-center text-muted-foreground text-center">
              <Package className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
              <p className="text-lg font-medium text-foreground">{t('common.noProductsFound')}</p>
              <p className="text-sm">{t('common.noProductsDesc')}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('products.sku')}</TableHead>
                  <TableHead>{t('products.tableName')}</TableHead>
                  <TableHead>{t('products.price')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow
                    key={product.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setViewingProductId(product.id)}
                  >
                    <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                    <TableCell>
                      <div className="font-medium text-foreground">{product.name}</div>
                      {product.description && (
                        <div className="text-xs text-muted-foreground truncate max-w-xs">
                          {product.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>${product.price.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewingProductId(product.id);
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
                              openEditModal(product);
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
                              if (confirm(t('common.confirmDelete')))
                                deleteMutation.mutate(product.id);
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
        title={editingProduct ? t('products.editTitle') : t('products.addTitle')}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2 sm:col-span-1">
              <Label htmlFor="sku">{t('products.sku')}</Label>
              <Input id="sku" {...register('sku')} placeholder={t('products.skuPlaceholder')} />
              {errors.sku && (
                <p className="text-sm text-destructive">{t('products.validation.skuMin')}</p>
              )}
            </div>
            <div className="space-y-2 col-span-2 sm:col-span-1">
              <Label htmlFor="price">{t('products.price')}</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                {...register('price')}
                placeholder={t('products.pricePlaceholder')}
              />
              {errors.price && (
                <p className="text-sm text-destructive">{t('products.validation.priceMin')}</p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">{t('products.name')}</Label>
            <Input id="name" {...register('name')} placeholder={t('products.namePlaceholder')} />
            {errors.name && (
              <p className="text-sm text-destructive">{t('products.validation.nameMin')}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">{t('products.description')}</Label>
            <Input
              id="description"
              {...register('description')}
              placeholder={t('products.descriptionPlaceholder')}
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? t('products.saving') : t('products.saveProduct')}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!viewingProductId}
        onClose={() => setViewingProductId(null)}
        title={t('products.detailsTitle')}
      >
        <div className="space-y-4">
          {isLoadingDetails ? (
            <div className="py-8 flex justify-center text-muted-foreground">
              {t('common.loadingDetails')}
            </div>
          ) : productDetails ? (
            <>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-foreground text-lg">{productDetails.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">SKU: {productDetails.sku}</p>
                </div>
                <div className="bg-white p-2 border rounded shadow-sm">
                  <QRCode value={productDetails.sku} size={64} />
                </div>
              </div>

              <div className="border rounded-md overflow-hidden mt-4">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>{t('dashboard.warehouse')}</TableHead>
                      <TableHead className="text-right">{t('products.stockLevel')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productDetails.Stocks.length > 0 ? (
                      productDetails.Stocks.map((stock, i) => (
                        <TableRow
                          key={i}
                          className="cursor-pointer hover:bg-muted"
                          onClick={() =>
                            navigate('/warehouses', {
                              state: { viewWarehouseId: stock.Warehouse.id },
                            })
                          }
                        >
                          <TableCell className="font-medium text-foreground">
                            {stock.Warehouse.name}
                          </TableCell>
                          <TableCell className="text-right font-bold text-foreground">
                            {stock.quantity}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-muted-foreground py-4">
                          {t('common.noStockRecorded')}
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
            <Button onClick={() => setViewingProductId(null)}>{t('common.close')}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
