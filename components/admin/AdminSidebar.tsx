'use client';

import React from 'react';
import {
  LayoutDashboard,
  Cake,
  Image as ImageIcon,
  ShoppingBag,
  FileSpreadsheet,
  ShieldAlert,
  ChevronRight,
  Sparkles,
  FolderTree,
  Gift,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export type AdminTab =
  | 'dashboard'
  | 'products'
  | 'categories'
  | 'media'
  | 'orders'
  | 'woocommerce'
  | 'security'
  | 'hamper';

interface AdminSidebarProps {
  activeTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  pendingOrdersCount?: number;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeTab,
  onSelectTab,
  pendingOrdersCount = 0,
}) => {
  const { isAdmin } = useAuth();

  const navItems: {
    id: AdminTab;
    label: string;
    icon: React.ReactNode;
    badge?: string | number;
    adminOnly?: boolean;
  }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard Overview',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: 'products',
      label: 'Products Catalog',
      icon: <Cake className="w-4 h-4" />,
    },
    {
      id: 'categories',
      label: 'Category Tree & SEO',
      icon: <FolderTree className="w-4 h-4" />,
      badge: '5 Main',
    },
    {
      id: 'hamper',
      label: 'Hamper Builder Settings',
      icon: <Gift className="w-4 h-4" />,
      badge: 'Custom',
    },
    {
      id: 'media',
      label: 'Media & Uploads',
      icon: <ImageIcon className="w-4 h-4" />,
    },
    {
      id: 'orders',
      label: 'Customer Orders',
      icon: <ShoppingBag className="w-4 h-4" />,
      badge: pendingOrdersCount > 0 ? pendingOrdersCount : undefined,
    },
    {
      id: 'woocommerce',
      label: 'WooCommerce Hub & CSV',
      icon: <FileSpreadsheet className="w-4 h-4" />,
      badge: 'CSV',
    },
    {
      id: 'security',
      label: 'Security & Audit Logs',
      icon: <ShieldAlert className="w-4 h-4" />,
      adminOnly: true,
    },
  ];

  return (
    <aside className="w-64 bg-[var(--bg-surface)] border-r border-[var(--border)] flex flex-col justify-between p-4 shrink-0 transition-all">
      {/* Navigation items list */}
      <div className="space-y-1">
        <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-subtle)]">
          Kitchen Command Center
        </div>

        {navItems.map((item) => {
          if (item.adminOnly && !isAdmin) return null;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              id={`admin-nav-${item.id}`}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'bg-[var(--primary)] text-white shadow-xs'
                  : 'text-[var(--text-main)] hover:bg-[var(--bg-subtle)]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className={isActive ? 'text-white' : 'text-[var(--text-muted)]'}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>

              {item.badge !== undefined && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-[var(--primary-light)] text-[var(--primary)]'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer quick card */}
      <div className="p-3 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border)]">
        <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-main)]">
          <Sparkles className="w-4 h-4 text-[var(--accent-gold)]" />
          <span>TVO Flavours Engine</span>
        </div>
        <p className="text-[11px] text-[var(--text-muted)] mt-1">
          Real-time Firestore synchronization & WooCommerce-standard CSV import/export.
        </p>
      </div>
    </aside>
  );
};
