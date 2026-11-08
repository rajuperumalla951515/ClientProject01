import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Layers,
  Boxes,
  Users,
  BarChart3,
  Tag,
  Truck,
  Star,
  FileSpreadsheet,
  Settings,
  ExternalLink,
  LogOut,
  X,
  ChevronLeft,
  ChevronRight,
  Database,
  Bot,
  Sparkles,
  Wand2,
  TrendingUp,
  CheckSquare,
  Cpu
} from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { DashboardStats } from '../../types';

interface SidebarProps {
  onCloseMobile?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  stats?: DashboardStats | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  onCloseMobile,
  collapsed = false,
  onToggleCollapse,
  stats
}) => {
  const { admin, logout } = useAdminAuth();

  const navSections = [
    {
      heading: 'Commerce',
      items: [
        { label: 'Overview', to: '/', icon: LayoutDashboard },
        {
          label: 'Orders',
          to: '/orders',
          icon: ShoppingBag,
          badge: stats?.pending_orders && stats.pending_orders > 0 ? stats.pending_orders : undefined,
          badgeColor: 'bg-amber-100 text-amber-800 border-amber-200'
        },
        { label: 'Products', to: '/products', icon: Package },
        { label: 'Categories', to: '/categories', icon: Layers },
        {
          label: 'Inventory',
          to: '/inventory',
          icon: Boxes,
          badge: stats?.low_stock_products && stats.low_stock_products > 0 ? stats.low_stock_products : undefined,
          badgeColor: 'bg-rose-100 text-rose-800 border-rose-200'
        },
        { label: 'Customers', to: '/customers', icon: Users },
      ]
    },
    {
      heading: 'Growth & Business',
      items: [
        { label: 'Analytics', to: '/analytics', icon: BarChart3 },
        { label: 'Discounts & Offers', to: '/discounts', icon: Tag },
        { label: 'Delivery Management', to: '/delivery', icon: Truck },
        { label: 'Customer Reviews', to: '/reviews', icon: Star },
        { label: 'Reports & Export', to: '/reports', icon: FileSpreadsheet },
      ]
    },
    {
      heading: 'AI Assistant',
      items: [
        {
          label: 'AI Assistant',
          to: '/ai/assistant',
          icon: Bot,
          badge: 'Live',
          badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200'
        },
      ]
    },
    {
      heading: 'System',
      items: [
        { label: 'Settings', to: '/settings', icon: Settings },
      ]
    }
  ];

  return (
    <aside
      className={`h-full bg-white text-[#26352B] flex flex-col border-r border-[#E6E7DD] select-none transition-all duration-300 ease-in-out ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className={`p-4 border-b border-[#E6E7DD] flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
        <Link
          to="/"
          className={`flex items-center gap-3 select-none ${collapsed ? 'justify-center' : ''}`}
          title="Sri Adithya Organics"
        >
          <img
            src="/brand/sri-adithya-logo.png"
            alt="Sri Adithya Organics"
            className={`${collapsed ? 'h-10 w-10' : 'h-11 w-auto'} object-contain shrink-0`}
            loading="eager"
            draggable={false}
          />
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold tracking-tight text-[#244B37] truncate uppercase font-sans">
                Sri Adithya
              </span>
              <span className="text-[10px] text-[#778176] tracking-wider truncate">
                Wood-Pressed Oils
              </span>
            </div>
          )}
        </Link>

        {/* Mobile Close Button */}
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="md:hidden text-[#778176] hover:text-[#26352B] p-1.5 rounded-lg hover:bg-[#F6F5EF] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto overflow-x-hidden">
        {navSections.map((section, sIdx) => (
          <div key={sIdx} className="space-y-1">
            {!collapsed && (
              <div className="px-3 pb-1.5 text-[10px] font-bold text-[#778176] uppercase tracking-wider">
                {section.heading}
              </div>
            )}
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onCloseMobile}
                  title={collapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    `group relative flex items-center ${
                      collapsed ? 'justify-center px-2 py-2.5' : 'justify-between px-3 py-2.5'
                    } rounded-xl text-xs font-semibold transition-all duration-150 ${
                      isActive
                        ? 'bg-[#244B37] text-white shadow-xs'
                        : 'text-[#26352B] hover:bg-[#F6F5EF] hover:text-[#244B37]'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className="flex items-center gap-3 min-w-0">
                        <Icon
                          className={`w-4 h-4 shrink-0 transition-colors ${
                            isActive ? 'text-white' : 'text-[#496B45] group-hover:text-[#244B37]'
                          }`}
                        />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </div>

                      {/* Badge in Expanded Mode */}
                      {!collapsed && item.badge !== undefined && (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${
                            isActive
                              ? 'bg-white/20 text-white border-white/30'
                              : item.badgeColor || 'bg-[#F1F4EC] text-[#244B37] border-[#E6E7DD]'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}

                      {/* Small notification indicator in Collapsed Mode */}
                      {collapsed && item.badge !== undefined && (
                        <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}

        {/* External Storefront Link */}
        <div className="pt-2">
          {!collapsed && (
            <div className="px-3 pb-1.5 text-[10px] font-bold text-[#778176] uppercase tracking-wider">
              Storefront
            </div>
          )}
          <a
            href="https://sriadithyaorganics.pages.dev"
            target="_blank"
            rel="noopener noreferrer"
            title={collapsed ? 'Open Customer Storefront' : undefined}
            className={`flex items-center ${
              collapsed ? 'justify-center px-2 py-2.5' : 'justify-between px-3 py-2.5'
            } rounded-xl text-xs font-semibold text-[#778176] hover:text-[#244B37] hover:bg-[#F6F5EF] border border-transparent hover:border-[#E6E7DD] transition-all`}
          >
            <div className="flex items-center gap-3">
              <ExternalLink className="w-4 h-4 text-[#8A9B69] shrink-0" />
              {!collapsed && <span>Customer Website</span>}
            </div>
          </a>
        </div>
      </nav>

      {/* Footer System Status & Profile */}
      <div className="p-3 border-t border-[#E6E7DD] bg-[#FAF9F5] space-y-2">
        {/* Cloudflare D1 Live Badge */}
        {!collapsed ? (
          <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-white border border-[#E6E7DD] text-[11px] font-semibold text-[#26352B]">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
              </span>
              <span className="text-[#244B37] font-bold">Cloudflare D1</span>
            </div>
            <span className="text-[10px] font-medium text-[#778176] uppercase">Active</span>
          </div>
        ) : (
          <div className="flex justify-center py-1" title="Cloudflare D1 Online">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
            </span>
          </div>
        )}

        {/* Admin User Card */}
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} p-1.5`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#244B37] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
              {admin?.name?.charAt(0) || 'A'}
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#26352B] truncate leading-tight">
                  {admin?.name || 'Admin'}
                </p>
                <p className="text-[10px] text-[#778176] truncate">Enterprise Admin</p>
              </div>
            )}
          </div>
          {!collapsed && (
            <button
              onClick={logout}
              title="Sign Out"
              className="p-1.5 text-[#778176] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
