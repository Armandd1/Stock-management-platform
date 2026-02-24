import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import toast from 'react-hot-toast';
import { Plus, Search, Trash2, Edit, Package, Eye } from 'lucide-react';

import { api } from '../services/api';
import { useAuthStore } from '../store/useAuthStore';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
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
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewingProductId, setViewingProductId] = useState<number | null>(null);

  const { data: products, isLoading, isError } = useQuery({
    queryKey: ['products', search],
    queryFn: async () => {
      const res = await api.get<Product[]>('/products', { params: { search } });
      return res.data;
    }
  });

  const { data: productDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['product', viewingProductId],
    queryFn: async () => {
      const res = await api.get<ProductDetails>(`/products/${viewingProductId}`);
      return res.data;
    },
    enabled: !!viewingProductId,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProductFormValues>({
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
      toast.success(`Product successfully ${editingProduct ? 'updated' : 'created'}`);
      setIsModalOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to save product');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => api.delete(`/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product deleted');
    },
    onError: () => toast.error('Failed to delete product')
  });

  const onSubmit = (data: ProductFormValues) => saveMutation.mutate(data);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Products</h1>
          <p className="text-muted-foreground">Manage your product catalog and view inventory.</p>
        </div>
        <RoleGuard allowedRoles={['ADMIN', 'MANAGER']}>
          <Button onClick={openCreateModal} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        </RoleGuard>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center space-x-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by SKU or name..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 flex justify-center text-muted-foreground">Loading products...</div>
          ) : isError ? (
            <div className="py-8 flex justify-center text-destructive">Failed to load products.</div>
          ) : !products?.length ? (
            <div className="py-12 flex flex-col items-center justify-center text-muted-foreground text-center">
              <Package className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
              <p className="text-lg font-medium text-foreground">No products found</p>
              <p className="text-sm">Adjust your search or add a new product.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                    <TableCell>
                      <div className="font-medium text-foreground">{product.name}</div>
                      {product.description && <div className="text-xs text-muted-foreground truncate max-w-xs">{product.description}</div>}
                    </TableCell>
                    <TableCell>${product.price.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => setViewingProductId(product.id)} className="h-8 w-8 text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <RoleGuard allowedRoles={['ADMIN', 'MANAGER']}>
                          <Button variant="ghost" size="icon" onClick={() => openEditModal(product)} className="h-8 w-8 text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </RoleGuard>
                        <RoleGuard allowedRoles={['ADMIN']}>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => { if(confirm('Are you sure you want to delete this product?')) deleteMutation.mutate(product.id) }} 
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
        title={editingProduct ? 'Edit Product' : 'Add New Product'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2 sm:col-span-1">
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" {...register('sku')} placeholder="e.g. WH-123" />
              {errors.sku && <p className="text-sm text-destructive">{errors.sku.message}</p>}
            </div>
            <div className="space-y-2 col-span-2 sm:col-span-1">
              <Label htmlFor="price">Price</Label>
              <Input id="price" type="number" step="0.01" {...register('price')} placeholder="0.00" />
              {errors.price && <p className="text-sm text-destructive">{errors.price.message}</p>}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Product Name</Label>
            <Input id="name" {...register('name')} placeholder="Enter product name..." />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Input id="description" {...register('description')} placeholder="Add details..." />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : 'Save Product'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!viewingProductId}
        onClose={() => setViewingProductId(null)}
        title="Product Stock Details"
      >
        <div className="space-y-4">
          {isLoadingDetails ? (
            <div className="py-8 flex justify-center text-muted-foreground">Loading details...</div>
          ) : productDetails ? (
            <>
              <div>
                <h3 className="font-semibold text-foreground text-lg">{productDetails.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">SKU: {productDetails.sku}</p>
              </div>
              
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Warehouse</TableHead>
                      <TableHead className="text-right">Stock Level</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productDetails.Stocks.length > 0 ? (
                      productDetails.Stocks.map((stock, i) => (
                        <TableRow key={i}>
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
                          No stock recorded.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          ) : (
            <div className="py-8 flex justify-center text-destructive">Failed to load details.</div>
          )}
          
          <div className="flex justify-end pt-4">
            <Button onClick={() => setViewingProductId(null)}>Close</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
