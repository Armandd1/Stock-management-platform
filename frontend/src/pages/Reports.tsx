import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { BarChart3, TrendingUp, Calendar as CalendarIcon, Filter, Warehouse } from 'lucide-react';
import { api } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
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

interface StockOnHand {
  warehouse: { id: number; name: string; location: string | null };
  items: {
    product: { id: number; sku: string; name: string; price: number };
    quantity: number;
  }[];
  totalItems: number;
}

interface MovementSummary {
  type: 'STOCK_IN' | 'STOCK_OUT' | 'STOCK_TRANSFER';
  totalQuantity: number;
  count: number;
}

interface TopMovedProduct {
  id: number;
  sku: string;
  name: string;
  totalMoved: number;
}

export const Reports: React.FC = () => {
  const { t } = useTranslation();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data: stockOnHand, isLoading: loadingStock } = useQuery({
    queryKey: ['reports', 'stock-on-hand'],
    queryFn: async () => (await api.get<StockOnHand[]>('/reports/stock-on-hand')).data,
  });

  const {
    data: movementSummary,
    isLoading: loadingMovement,
    refetch: refetchMovement,
  } = useQuery({
    queryKey: ['reports', 'movement-summary', startDate, endDate],
    queryFn: async () =>
      (
        await api.get<MovementSummary[]>('/reports/movement-summary', {
          params: { startDate, endDate },
        })
      ).data,
  });

  const {
    data: topMoved,
    isLoading: loadingTop,
    refetch: refetchTop,
  } = useQuery({
    queryKey: ['reports', 'top-moved', startDate, endDate],
    queryFn: async () =>
      (
        await api.get<TopMovedProduct[]>('/reports/top-moved', {
          params: { startDate, endDate, limit: 10 },
        })
      ).data,
  });

  const handleFilter = () => {
    refetchMovement();
    refetchTop();
  };

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">{t('reports.title')}</h1>
        <p className="text-muted-foreground">{t('reports.subtitle')}</p>
      </div>

      {/* Date Filters */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="space-y-2 flex-1">
              <label className="text-sm font-medium flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" /> {t('reports.startDate')}
              </label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2 flex-1">
              <label className="text-sm font-medium flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" /> {t('reports.endDate')}
              </label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <Button onClick={handleFilter} className="gap-2">
              <Filter className="h-4 w-4" /> {t('reports.filter')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Movement Summary Report */}
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-500" />
                {t('reports.movementSummary')}
              </CardTitle>
              <CardDescription>{t('reports.movementSummaryDesc')}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="mt-4">
            {loadingMovement ? (
              <div className="py-8 text-center text-muted-foreground italic">
                {t('common.loading')}
              </div>
            ) : movementSummary && movementSummary.length > 0 ? (
              <div className="space-y-4">
                {movementSummary.map((m) => (
                  <div
                    key={m.type}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/40 border border-border/50"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                        {t(`movements.${m.type.replace('STOCK_', '').toLowerCase()}`)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {m.count} {t('reports.movementCount')}
                      </span>
                    </div>
                    <div className="text-2xl font-black text-foreground">{m.totalQuantity}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                {t('common.noMovementsFound')}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Moved Products Report */}
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
                {t('reports.topMoved')}
              </CardTitle>
              <CardDescription>{t('reports.topMovedDesc')}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="mt-4">
            {loadingTop ? (
              <div className="py-8 text-center text-muted-foreground italic">
                {t('common.loading')}
              </div>
            ) : topMoved && topMoved.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('reports.product')}</TableHead>
                    <TableHead className="text-right">{t('reports.volume')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topMoved.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="font-semibold">{p.name}</div>
                        <div className="text-xs font-mono text-muted-foreground">{p.sku}</div>
                      </TableCell>
                      <TableCell className="text-right font-black text-foreground">
                        {p.totalMoved}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="py-12 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                {t('common.noProductsFound')}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stock On Hand Report (Full Width) */}
        <Card className="shadow-md lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Warehouse className="h-5 w-5 text-amber-500" />
                {t('reports.stockOnHand')}
              </CardTitle>
              <CardDescription>{t('reports.stockOnHandDesc')}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="mt-4">
            {loadingStock ? (
              <div className="py-8 text-center text-muted-foreground italic">
                {t('common.loading')}
              </div>
            ) : stockOnHand && stockOnHand.length > 0 ? (
              <div className="space-y-6">
                {stockOnHand.map((group) => (
                  <div
                    key={group.warehouse.id}
                    className="border rounded-lg overflow-hidden border-border/80"
                  >
                    <div className="bg-muted/80 px-4 py-3 flex justify-between items-center border-b border-border/80">
                      <div>
                        <span className="font-bold text-lg text-foreground">
                          {group.warehouse.name}
                        </span>
                        {group.warehouse.location && (
                          <span className="ml-3 text-xs text-muted-foreground px-2 py-0.5 rounded-full bg-background border border-border">
                            {group.warehouse.location}
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-medium text-muted-foreground bg-background px-3 py-1 rounded-md border border-border">
                        {group.totalItems} {t('dashboard.totalItems')}
                      </div>
                    </div>
                    <Table>
                      <TableBody>
                        {group.items.map((item) => (
                          <TableRow
                            key={item.product.id}
                            className="hover:bg-muted/30 border-b last:border-0"
                          >
                            <TableCell className="w-1/3">
                              <div className="font-medium text-foreground">{item.product.name}</div>
                              <div className="text-xs font-mono text-muted-foreground">
                                {item.product.sku}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-bold text-foreground">
                              {item.quantity}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                {t('common.noStockData')}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
