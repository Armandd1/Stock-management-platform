import React, { useEffect } from 'react';
import { Routes, Route, BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/useAuthStore';

// Layouts & Guards
import { AppLayout } from './components/layout/AppLayout';
import { AuthGuard } from './components/layout/AuthGuard';
import { RoleGuard } from './components/layout/RoleGuard';
import { ThemeProvider } from './components/theme-provider';

// Pages
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Products } from './pages/Products';
import { AuthCallback } from './pages/AuthCallback';
import { Warehouses } from './pages/Warehouses';
import { Movements } from './pages/Movements';
import { Users } from './pages/Users';
import { AuditLogs } from './pages/AuditLogs';
import { Reports } from './pages/Reports';

const queryClient = new QueryClient();

export const App: React.FC = () => {
  const { checkAuth } = useAuthStore();

  // Check auth on initial load
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <ThemeProvider defaultTheme="light" storageKey="stockify-theme">
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/auth/callback" element={<AuthCallback />} />

            <Route element={<AuthGuard />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/products" element={<Products />} />
                <Route path="/warehouses" element={<Warehouses />} />
                <Route
                  path="/movements"
                  element={
                    <RoleGuard allowedRoles={['ADMIN', 'MANAGER']} isRoute>
                      <Movements />
                    </RoleGuard>
                  }
                />
                <Route
                  path="/users"
                  element={
                    <RoleGuard allowedRoles={['ADMIN']} isRoute>
                      <Users />
                    </RoleGuard>
                  }
                />
                <Route
                  path="/audit-logs"
                  element={
                    <RoleGuard allowedRoles={['ADMIN']} isRoute>
                      <AuditLogs />
                    </RoleGuard>
                  }
                />
                <Route path="/reports" element={<Reports />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster position="top-right" />
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;
