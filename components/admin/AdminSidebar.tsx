'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
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
  Calendar,
  Users,
  ShieldCheck,
  Activity,
  Wheat,
  Star,
  Truck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { hasPermission, type Permission } from '../../lib/server/permissions';

export type AdminTab =
  | 'dashboard'
  | 'products'
  | 'categories'
  | 'ingredients'
  | 'media'
  | 'orders'
  | 'delivery'
  | 'reviews'
  | 'woocommerce'
  | 'security'
  | 'hamper'
  | 'festival'
  | 'staff'
  | 'health';

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
  const router = useRouter();
  const { isAdmin, user } = useAuth();

  const navItems: {
    id: AdminTab;
    label: string;
    icon: React.ReactNode;
    badge?: string | number;
    adminOnly?: boolean;
    permission?: Permission;
    group?: string;
    href?: string;
  }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard Overview',
      icon: <LayoutDashboard className="w-4 h-4" />,
      group: 'COMMAND CENTER',
    },
    {
      id: 'products',
      label: 'Products Catalog',
      icon: <Cake className="w-4 h-4" />,
      permission: 'view_products',
      group: 'CATALOG',
    },
    {
      id: 'categories',
      label: 'Category Tree & SEO',
      icon: <FolderTree className="w-4 h-4" />,
      badge: '5 Main',
      permission: 'view_categories',
      group: 'CATALOG',
    },
    {
      id: 'hamper',
      label: 'Hamper Builder Settings',
      icon: <Gift className="w-4 h-4" />,
      badge: 'Custom',
      permission: 'manage_hampers',
      group: 'CATALOG',
    },
    {
      id: 'festival',
      label: 'Festival & Special Days',
      icon: <Calendar className="w-4 h-4" />,
      badge: 'Auto',
      adminOnly: true,
      permission: 'manage_festivals',
      group: 'MARKETING',
    },
    {
      id: 'media',
      label: 'Media & Uploads',
      icon: <ImageIcon className="w-4 h-4" />,
      permission: 'view_media',
      group: 'MEDIA',
    },
    {
      id: 'orders',
      label: 'Customer Orders',
      icon: <ShoppingBag className="w-4 h-4" />,
      badge: pendingOrdersCount > 0 ? pendingOrdersCount : undefined,
      permission: 'view_orders',
      group: 'OPERATIONS',
    },
    {
      id: 'delivery',
      label: 'Delivery & Fleet',
      icon: <Truck className="w-4 h-4" />,
      permission: 'view_delivery',
      group: 'OPERATIONS',
    },
    {
      id: 'ingredients',
      label: 'Ingredient Master',
      icon: <Wheat className="w-4 h-4" />,
      permission: 'view_recipes',
      group: 'OPERATIONS',
    },
    {
      id: 'reviews',
      label: 'Customer Reviews',
      icon: <Star className="w-4 h-4" />,
      permission: 'view_products',
      group: 'OPERATIONS',
    },
    {
      id: 'woocommerce',
      label: 'WooCommerce Hub & CSV',
      icon: <FileSpreadsheet className="w-4 h-4" />,
      badge: 'CSV',
      permission: 'import_woocommerce',
      group: 'INTEGRATIONS',
    },
    {
      id: 'staff',
      label: 'Staff & Permissions',
      icon: <Users className="w-4 h-4" />,
      permission: 'view_admin_users',
      group: 'SYSTEM',
    },
    {
      id: 'security',
      label: 'Security & Audit Logs',
      icon: <ShieldAlert className="w-4 h-4" />,
      adminOnly: true,
      permission: 'view_audit_logs',
      group: 'SYSTEM',
    },
    {
      id: 'health',
      label: 'System Health',
      icon: <Activity className="w-4 h-4" />,
      adminOnly: true,
      permission: 'view_system_health',
      group: 'SYSTEM',
      href: '/admin/system-health',
    },
  ];

  const hasPerm = (permission?: Permission): boolean => {
    if (!permission) return true;
    return hasPermission(user?.role, permission);
  };

  return (
    <aside className="w-full lg:w-64 bg-[var(--bg-surface)] border-b lg:border-b-0 lg:border-r border-[var(--border)] flex flex-row items-center lg:flex-col lg:items-stretch lg:justify-between p-2 lg:p-4 shrink-0 transition-all">
      {/* Navigation items list (horizontal scrollable bar on mobile) */}
      <div className="flex lg:flex-col gap-1 lg:gap-0 lg:space-y-1 overflow-x-auto lg:overflow-visible w-full">
        <div className="hidden lg:block px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-subtle)]">
          Kitchen Command Center
        </div>

        {navItems.map((item) => {
          if (item.adminOnly && !isAdmin) return null;
          if (!hasPerm(item.permission)) return null;
          const isActive = activeTab === item.id;

          const handleClick = () => {
            if (item.href) {
              router.push(item.href);
            } else {
              onSelectTab(item.id);
            }
          };

          return (
            <button
              key={item.id}
              id={`admin-nav-${item.id}`}
              onClick={handleClick}
              className={`lg:w-full w-auto whitespace-nowrap shrink-0 flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
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
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ml-1 ${
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
      <div className="hidden lg:block p-3 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border)]">
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
