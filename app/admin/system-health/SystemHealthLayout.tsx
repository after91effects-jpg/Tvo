'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { useIsMobile } from '../../../hooks/use-mobile';
import { AdminSidebar, AdminTab } from '../../../components/admin/AdminSidebar';
import { AdminHeader } from '../../../components/admin/AdminHeader';
import { SystemHealthView } from '../../../components/admin/SystemHealthView';

export default function AdminSystemHealthLayout() {
  const router = useRouter();
  const { user, isAdmin, isAuthReady } = useAuth();
  const isMobile = useIsMobile();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (isAuthReady && !isAdmin) {
      router.replace('/');
    }
  }, [isAuthReady, isAdmin, router]);

  if (!isAuthReady || !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-sm text-[var(--text-muted)]">Redirecting...</p>
      </div>
    );
  }

  const handleSelectTab = (tab: AdminTab) => {
    if (tab === 'health') return;
    router.push('/');
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen">
      <div className={isSidebarOpen || !isMobile ? '' : 'hidden'}>
        <AdminSidebar
          activeTab="health"
          onSelectTab={handleSelectTab}
        />
      </div>
      <div className="flex-1 flex flex-col">
        <AdminHeader
          onNavigateToStore={() => router.push('/')}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          isSidebarOpen={isSidebarOpen}
        />
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 overflow-auto">
          <SystemHealthView />
        </main>
      </div>
    </div>
  );
}
