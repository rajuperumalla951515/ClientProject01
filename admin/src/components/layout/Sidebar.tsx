import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Layers,
  Boxes,
  Users,
  Settings,
  LogOut,
  Database,
  ExternalLink,
  X
} from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';

interface SidebarProps {
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onCloseMobile }) => {
  const { admin, logout } = useAdminAuth();

  const navItems = [
    { label: 'Overview', to: '/', icon: LayoutDashboard },
    { label: 'Orders', to: '/orders', icon: ShoppingBag },
    { label: 'Products', to: '/products', icon: Package },
    { label: 'Categories', to: '/categories', icon: Layers },
    { label: 'Inventory', to: '/inventory', icon: Boxes },
    { label: 'Customers', to: '/customers', icon: Users },
    { label: 'Store Settings', to: '/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 h-full bg-slate-900 text-white flex flex-col border-r border-slate-800 select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <Link
          to="/"
          className="flex flex-col items-center justify-center text-center gap-1.5 select-none focus:outline-none w-full hover:opacity-100 transform-none transition-none"
        >
          <img
            src="/brand/sri-adithya-logo.png"
            alt="Sri Adithya Organics"
            className="h-12 w-auto object-contain select-none pointer-events-auto transform-none transition-none hover:scale-100 hover:opacity-100"
            loading="eager"
            decoding="async"
            draggable={false}
          />
          <span className="text-[10px] font-bold tracking-wider text-emerald-400 uppercase bg-slate-800/90 border border-slate-700/80 px-2 py-0.5 rounded-full">
            Admin Portal
          </span>
        </Link>
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="md:hidden text-slate-400 hover:text-white p-1 rounded-lg shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
          Management
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-brand-700 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`
              }
            >
              <Icon className="w-4 h-4 text-brand-300" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}

        <div className="pt-6 px-3 pb-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
          Customer Portal
        </div>
        <a
          href="https://sriadithyaorganics.vercel.app"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
        >
          <div className="flex items-center gap-3">
            <ExternalLink className="w-4 h-4 text-brand-400" />
            <span>Visit Live Website</span>
          </div>
        </a>
      </nav>

      {/* Central Database Engine Status Pill */}
      <div className="p-3 mx-3 mb-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs">
        <div className="flex items-center gap-2 mb-1">
          <Database className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-slate-200">Supabase DB</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Active Central Store</span>
        </div>
      </div>

      {/* Admin User & Logout Footer */}
      <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-950/40">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-brand-800 border border-brand-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
            {admin?.name?.charAt(0) || 'A'}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white truncate">{admin?.name || 'Administrator'}</p>
            <p className="text-[10px] text-slate-400 truncate">{admin?.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          title="Sign Out"
          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors flex-shrink-0"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};

