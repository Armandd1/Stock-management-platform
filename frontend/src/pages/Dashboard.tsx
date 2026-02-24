import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Package, Warehouse, BarChart3, AlertTriangle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';

interface Product { id: number; name: string; sku: string; price: number; }
interface Wh { id: number; name: string; location: string; }
interface StockReportItem {
  warehouse: Wh;
  items: { product: Product; quantity: number }[];
  totalItems: number;
}

export const Dashboard: React.FC = () => {
  const { data: products, isLoading: loadingProducts } = useQuery({
    queryKey: ['products'],
    queryFn: async () => (await api.get<Product[]>('/products')).data
  });

  const { data: warehouses, isLoading: loadingWh } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => (await api.get<Wh[]>('/warehouses')).data
  });

  const { data: stockReport, isLoading: loadingStock } = useQuery({
    queryKey: ['stock-on-hand'],
    queryFn: async () => (await api.get<StockReportItem[]>('/reports/stock-on-hand')).data
  });

  const isLoading = loadingProducts || loadingWh || loadingStock;

  // Flatten stock report to find low stock
  const allStockItems = stockReport?.flatMap(report => 
    report.items.map(item => ({
      ...item,
      warehouse: report.warehouse
    }))
  ) || [];
  
  const lowStockItems = [...allStockItems]
    .sort((a, b) => a.quantity - b.quantity)
    .slice(0, 10);

  const totalItemsInStock = stockReport?.reduce((acc, curr) => acc + curr.totalItems, 0) || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Products</CardTitle>
            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-md">
              <Package className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{products?.length || 0}</div>
          </CardContent>
        </Card>
        
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Warehouses</CardTitle>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-md">
              <Warehouse className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{warehouses?.length || 0}</div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Items in Stock</CardTitle>
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-md">
              <BarChart3 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totalItemsInStock}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 border-border shadow-sm">
          <CardHeader>
            <CardTitle>Stock by Warehouse</CardTitle>
            <CardDescription>Overview of inventory distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Warehouse</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Total Items</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockReport?.map((report) => (
                  <TableRow key={report.warehouse.id}>
                    <TableCell className="font-medium text-foreground">{report.warehouse.name}</TableCell>
                    <TableCell className="text-muted-foreground">{report.warehouse.location || '-'}</TableCell>
                    <TableCell className="text-right font-medium">{report.totalItems}</TableCell>
                  </TableRow>
                ))}
                {!stockReport?.length && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8">No stock data available</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="col-span-3 border-border shadow-sm border-t-4 border-t-amber-400 dark:border-t-amber-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Low Stock Alerts
            </CardTitle>
            <CardDescription>Top 10 products with lowest inventory</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStockItems.map((item, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">
                      <div className="text-foreground">{item.product.name}</div>
                      <div className="text-xs text-muted-foreground">{item.product.sku}</div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{item.warehouse.name}</TableCell>
                    <TableCell className="text-right font-bold text-amber-600 dark:text-amber-500">{item.quantity}</TableCell>
                  </TableRow>
                ))}
                {!lowStockItems.length && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8">No alerts available</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
