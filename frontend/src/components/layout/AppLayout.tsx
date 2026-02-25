import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export const AppLayout: React.FC = () => {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar className="w-64 flex-shrink-0 hidden md:flex border-r border-border" />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header className="h-16 border-b border-border bg-card/50 backdrop-blur-xl flex-shrink-0 z-10" />
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
