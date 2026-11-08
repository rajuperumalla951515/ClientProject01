import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useRealtimeSync } from '../../hooks/useRealtimeSync';
import { api } from '../../services/api';
import { DashboardStats } from '../../types';

export const AdminLayout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('sao_admin_sidebar_collapsed') === 'true';
  });
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const location = useLocation();

  // Connect to SSE stream for live updates
  useRealtimeSync();

  // Fetch dashboard summary stats for notification counts and badges
  const fetchBadgeStats = async () => {
    try {
      const data = await api.getDashboardStats();
      setStats(data);
    } catch {
      // Background silent fallback
    }
  };

  useEffect(() => {
    fetchBadgeStats();
    const interval = setInterval(fetchBadgeStats, 30000); // 30s background sync
    return () => clearInterval(interval);
  }, []);

  const handleToggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('sao_admin_sidebar_collapsed', String(next));
      return next;
    });
  };

  const getPageInfo = (pathname: string): { title: string; breadcrumbs: string[] } => {
    switch (pathname) {
      case '/':
        return { title: 'Executive Overview', breadcrumbs: ['Overview'] };
      case '/orders':
        return { title: 'Order Management', breadcrumbs: ['Commerce', 'Orders'] };
      case '/products':
        return { title: 'Product Catalogue', breadcrumbs: ['Commerce', 'Products'] };
      case '/categories':
        return { title: 'Category Management', breadcrumbs: ['Commerce', 'Categories'] };
      case '/inventory':
        return { title: 'Inventory Control Center', breadcrumbs: ['Operations', 'Inventory & Stock'] };
      case '/customers':
        return { title: 'Customer Directory', breadcrumbs: ['Directory', 'Customers'] };
      case '/analytics':
        return { title: 'Sales Analytics & Trends', breadcrumbs: ['Intelligence', 'Analytics'] };
      case '/discounts':
        return { title: 'Discounts & Promotional Offers', breadcrumbs: ['Commerce', 'Discounts'] };
      case '/delivery':
        return { title: 'Delivery & Zone Management', breadcrumbs: ['Operations', 'Delivery'] };
      case '/reviews':
        return { title: 'Customer Reviews & Feedback', breadcrumbs: ['Community', 'Reviews'] };
      case '/reports':
        return { title: 'Business Reports & CSV Export', breadcrumbs: ['Intelligence', 'Reports'] };
      case '/settings':
        return { title: 'Store & Business Settings', breadcrumbs: ['System', 'Settings'] };
      default:
        return { title: 'Sri Adithya Organics Admin', breadcrumbs: ['Operations'] };
    }
  };

  const { title, breadcrumbs } = getPageInfo(location.pathname);

  return (
    <div className="flex h-screen bg-[#F6F5EF] overflow-hidden font-sans text-[#26352B]">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex flex-shrink-0">
        <Sidebar
          collapsed={collapsed}
          onToggleCollapse={handleToggleCollapse}
          stats={stats}
        />
      </div>

      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#244B37]/30 backdrop-blur-xs md:hidden animate-in fade-in duration-200"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Drawer Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 transform md:hidden transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar
          onCloseMobile={() => setMobileMenuOpen(false)}
          stats={stats}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          title={title}
          breadcrumbs={breadcrumbs}
          collapsed={collapsed}
          onToggleCollapse={handleToggleCollapse}
          onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
          stats={stats}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-[#F6F5EF]">
          <div className="max-w-7xl mx-auto space-y-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
