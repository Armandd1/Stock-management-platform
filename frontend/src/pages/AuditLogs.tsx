import React from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { Activity } from 'lucide-react';

interface AuditLog {
  id: number;
  action: string;
  entity: string;
  entityId?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  changes?: any;
  createdAt: string;
  User?: {
    id: number;
    name: string | null;
    email: string;
  };
}

export const AuditLogs: React.FC = () => {
  const { t } = useTranslation();

  const {
    data: logs,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: async () => (await api.get<AuditLog[]>('/audit-logs')).data,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">{t('audit.title')}</h1>
        <p className="text-muted-foreground">{t('audit.subtitle')}</p>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 flex justify-center text-muted-foreground">
              {t('common.loading')}
            </div>
          ) : isError ? (
            <div className="py-12 flex justify-center text-destructive">{t('common.error')}</div>
          ) : !logs?.length ? (
            <div className="py-16 flex flex-col items-center justify-center text-center text-muted-foreground border-b last:border-0 border-border">
              <Activity className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
              <p className="text-lg font-medium text-foreground">{t('audit.noLogs')}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('audit.date')}</TableHead>
                  <TableHead>{t('audit.user')}</TableHead>
                  <TableHead>{t('audit.action')}</TableHead>
                  <TableHead>{t('audit.entity')}</TableHead>
                  <TableHead>{t('audit.details')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {format(new Date(log.createdAt), 'MMM d, yyyy HH:mm:ss')}
                    </TableCell>
                    <TableCell>
                      {log.User ? log.User.name || log.User.email : t('audit.system')}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary text-secondary-foreground">
                        {t(`audit.actions.${log.action}`, { defaultValue: log.action })}
                      </span>
                    </TableCell>
                    <TableCell>
                      {log.entity} {log.entityId ? `#${log.entityId}` : ''}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {log.changes ? (
                        <div className="max-w-xs overflow-auto border rounded p-2 bg-muted/50 text-[10px] font-mono whitespace-pre-wrap max-h-24">
                          {JSON.stringify(log.changes, null, 2)}
                        </div>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
