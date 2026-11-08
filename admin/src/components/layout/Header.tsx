import React, { useState, useEffect } from 'react';
import {
  Menu,
  PanelLeftClose,
  PanelLeft,
  Search,
  Bell,
  ChevronDown,
  ExternalLink,
  Settings,
  LogOut,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { GlobalSearchModal } from './GlobalSearchModal';
import { NotificationsDrawer } from './NotificationsDrawer';
import { DashboardStats } from '../../types';

interface HeaderProps {
  onToggleMobileMenu: () => void;
  title: string;
  breadcrumbs?: string[];
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  stats?: DashboardStats | null;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleMobileMenu,
  title,
  breadcrumbs = [],
  collapsed = false,
  onToggleCollapse,
  stats
}) => {
  const { admin, logout } = useAdminAuth();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Keyboard shortcut for Omnibox search (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchModalOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const alertCount = (stats?.low_stock_products || 0) + (stats?.pending_orders || 0);

  return (
    <>
      <header className="h-16 bg-white border-b border-[#E6E7DD] px-4 md:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        {/* Left Side: Collapse Button + Breadcrumbs */}
        <div className="flex items-center gap-3">
          {/* Mobile Menu Toggle */}
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden p-2 rounded-xl text-[#26352B] hover:bg-[#F6F5EF] transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Desktop Sidebar Collapse Toggle */}
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="hidden md:flex p-2 rounded-xl text-[#778176] hover:text-[#26352B] hover:bg-[#F6F5EF] border border-[#E6E7DD] transition-colors"
              title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              aria-label="Toggle sidebar"
            >
              {collapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>
          )}

          {/* Breadcrumb Navigation & Page Title */}
          <div className="flex flex-col">
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-semibold text-[#778176]">
              <span>Sri Adithya Organics</span>
              <span>/</span>
              {breadcrumbs.length > 0 ? (
                breadcrumbs.map((b, idx) => (
                  <React.Fragment key={idx}>
                    <span>{b}</span>
                    {idx < breadcrumbs.length - 1 && <span>/</span>}
                  </React.Fragment>
                ))
              ) : (
                <span>Operations</span>
              )}
            </div>
            <h1 className="text-sm sm:text-base font-bold text-[#26352B] leading-tight">
              {title}
            </h1>
          </div>
        </div>

        {/* Center / Right Section */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Global Omnibox Search Button */}
          <button
            onClick={() => setSearchModalOpen(true)}
            className="flex items-center gap-2 sm:gap-3 px-3 py-1.5 rounded-xl border border-[#E6E7DD] bg-[#FAF9F5] hover:bg-[#F6F5EF] text-[#778176] hover:text-[#26352B] transition-all text-xs group"
          >
            <Search className="w-3.5 h-3.5 text-[#496B45]" />
            <span className="hidden md:inline font-medium">Search store, orders, products...</span>
            <span className="md:hidden font-medium">Search...</span>
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-semibold bg-white border border-[#E6E7DD] rounded-md text-[#778176] shadow-2xs group-hover:border-[#8A9B69]">
              ⌘K
            </kbd>
          </button>

          {/* Cloudflare D1 Connection Badge (Replaced old Supabase text) */}
          <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F1F4EC] border border-[#8A9B69]/30 text-[#244B37] text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#496B45]" />
            <span>Cloudflare D1: Edge Connected</span>
          </div>

          {/* Notifications Bell */}
          <button
            onClick={() => setNotificationsOpen(true)}
            className="relative p-2 rounded-xl border border-[#E6E7DD] bg-white hover:bg-[#F6F5EF] text-[#26352B] transition-colors"
            title="Operational Alerts"
            aria-label="View notifications"
          >
            <Bell className="w-4 h-4 text-[#496B45]" />
            {alertCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                {alertCount > 9 ? '9+' : alertCount}
              </span>
            )}
          </button>

          {/* Customer Storefront External Link */}
          <a
            href="https://sriadithyaorganics.pages.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E6E7DD] bg-white hover:bg-[#F6F5EF] text-xs font-semibold text-[#26352B] transition-colors"
            title="View Live Storefront"
          >
            <span>Live Store</span>
            <ExternalLink className="w-3 h-3 text-[#778176]" />
          </a>

          {/* Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="flex items-center gap-2 p-1 pl-2 rounded-xl border border-[#E6E7DD] hover:border-[#8A9B69] hover:bg-[#FAF9F5] transition-all text-left"
              aria-label="Account menu"
            >
              <div className="w-7 h-7 rounded-lg bg-[#244B37] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                {admin?.name?.charAt(0) || 'A'}
              </div>
              <div className="hidden sm:block text-xs pr-1">
                <span className="font-bold text-[#26352B] block leading-tight">{admin?.name || 'Admin'}</span>
                <span className="text-[10px] text-[#778176] uppercase tracking-wider font-semibold">Store Manager</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[#778176]" />
            </button>

            {profileDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setProfileDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-xl border border-[#E6E7DD] py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-4 py-2.5 border-b border-[#E6E7DD] bg-[#FAF9F5]">
                    <p className="text-xs font-bold text-[#26352B]">{admin?.name}</p>
                    <p className="text-[11px] text-[#778176] truncate">{admin?.email}</p>
                    <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#E2E8D7] text-[#244B37] text-[10px] font-bold">
                      <ShieldCheck className="w-3 h-3" />
                      <span>Master Administrator</span>
                    </div>
                  </div>

                  <div className="py-1">
                    <a
                      href="/settings"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-[#26352B] hover:bg-[#F6F5EF] transition-colors"
                    >
                      <Settings className="w-4 h-4 text-[#496B45]" />
                      <span>Business Settings</span>
                    </a>
                    <a
                      href="https://sriadithyaorganics.pages.dev"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-[#26352B] hover:bg-[#F6F5EF] transition-colors"
                    >
                      <ExternalLink className="w-4 h-4 text-[#8A9B69]" />
                      <span>Customer Storefront</span>
                    </a>
                  </div>

                  <div className="border-t border-[#E6E7DD] pt-1">
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Global Search Modal */}
      <GlobalSearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
      />

      {/* Operational Alerts Drawer */}
      <NotificationsDrawer
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        stats={stats || null}
      />
    </>
  );
};
