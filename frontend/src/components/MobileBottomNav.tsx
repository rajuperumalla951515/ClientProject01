import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, LayoutGrid, Search, Package, User as UserIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const MobileBottomNav: React.FC = () => {
  const { user, openLoginModal } = useAuth();
  const location = useLocation();

  // Hide on admin dashboard or checkout page to allow focused interaction
  if (location.pathname.startsWith('/admin') || location.pathname === '/checkout') {
    return null;
  }

  const navItems = [
    { label: 'Home', to: '/', icon: Home },
    { label: 'Shop', to: '/products', icon: LayoutGrid },
    { label: 'Search', to: '/search', icon: Search },
    { label: 'Orders', to: '/account?tab=orders', icon: Package, requiresAuth: true },
    { label: 'Account', to: '/account', icon: UserIcon, requiresAuth: true },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200/90 lg:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.06)] pb-[env(safe-area-inset-bottom)]"
    >
      <div className="grid grid-cols-5 h-14 max-w-md mx-auto items-center">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.to === '/'
              ? location.pathname === '/'
              : item.to.startsWith('/account?tab=orders')
              ? location.pathname === '/account' && location.search.includes('orders')
              : item.to === '/account'
              ? location.pathname === '/account' && !location.search.includes('orders')
              : location.pathname.startsWith(item.to);

          if (item.requiresAuth && !user) {
            return (
              <button
                key={item.label}
                type="button"
                onClick={openLoginModal}
                className="flex flex-col items-center justify-center gap-1 w-full h-full text-stone-500 hover:text-stone-900 transition-colors active:scale-95 touch-manipulation min-h-[44px]"
              >
                <Icon className="w-5 h-5 stroke-[1.8]" />
                <span className="text-[10px] font-semibold leading-none">{item.label}</span>
              </button>
            );
          }

          return (
            <NavLink
              key={item.label}
              to={item.to}
              className={`flex flex-col items-center justify-center gap-1 w-full h-full transition-colors active:scale-95 touch-manipulation min-h-[44px] ${
                isActive
                  ? 'text-rootly-forest font-bold'
                  : 'text-stone-500 hover:text-stone-900 font-medium'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.4] text-rootly-forest' : 'stroke-[1.8]'}`} />
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-rootly-forest" />
                )}
              </div>
              <span className={`text-[10px] leading-none ${isActive ? 'text-rootly-forest font-extrabold' : ''}`}>
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

