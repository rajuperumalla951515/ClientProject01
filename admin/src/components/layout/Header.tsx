import React, { useState } from 'react';
import { Menu, LogOut, CheckCircle2, ChevronDown } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';

interface HeaderProps {
  onToggleMobileMenu: () => void;
  title: string;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileMenu, title }) => {
  const { admin, logout } = useAdminAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-4 md:px-8 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileMenu}
          className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-base md:text-lg font-bold text-slate-900 leading-tight">{title}</h2>
          <p className="text-[11px] text-slate-500 hidden sm:block">Sri Adithya Organics Administrative Operations</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Supabase Database Status Pill */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-semibold">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Supabase PostgreSQL: Connected</span>
        </div>

        {/* Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 p-1.5 pl-2.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all text-left"
          >
            <div className="w-7 h-7 rounded-lg bg-brand-800 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              {admin?.name?.charAt(0) || 'A'}
            </div>
            <div className="hidden sm:block text-xs">
              <span className="font-semibold text-slate-800 block leading-tight">{admin?.name}</span>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Administrator</span>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </button>

          {dropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-elevated border border-slate-100 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="text-xs font-semibold text-slate-800">{admin?.name}</p>
                  <p className="text-[11px] text-slate-500 truncate">{admin?.email}</p>
                </div>
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors text-left"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

