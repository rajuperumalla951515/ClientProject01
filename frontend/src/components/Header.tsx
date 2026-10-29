import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search, MapPin, ChevronDown, ShoppingBag, User as UserIcon, Heart,
  Sparkles, X, Menu, ShieldCheck, LogOut, Package, Settings, Flame
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { AnnouncementBar } from './AnnouncementBar';
import { getShortNavLabel } from '../utils/navigationLabels';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useLocation } from '../context/LocationContext';
import { api } from '../services/api';
import { Category } from '../types';

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAdmin, logout, openLoginModal } = useAuth();
  const { cart, openDrawer } = useCart();
  const {
    locationLabel,
    openLocationModal,
    detectedLiveLocation,
    isPromptingLiveLocation,
    confirmLiveLocation,
    rejectLiveLocation
  } = useLocation();

  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<{
    products: { name: string; slug: string }[];
    categories: { name: string; slug: string }[];
  }>({ products: [], categories: [] });
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Fetch categories for category strip
  useEffect(() => {
    api.getCategories().then(setCategories).catch(console.error);
  }, []);

  // Fetch search suggestions
  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      const timer = setTimeout(() => {
        api.getSearchSuggestions(searchQuery).then(setSuggestions).catch(console.error);
        setIsSearchOpen(true);
      }, 200);
      return () => clearTimeout(timer);
    } else {
      setSuggestions({ products: [], categories: [] });
      setIsSearchOpen(false);
    }
  }, [searchQuery]);

  // Click outside listener for search & user menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setIsSearchOpen(false);
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#FAF8F5]/95 backdrop-blur-md border-b border-stone-200 shadow-sm transition-all">
      {/* 1. Animated Announcement Bar directly above Navbar */}
      <AnnouncementBar />

      {/* 2. Live Location Confirmation Bar if Detected */}
      {detectedLiveLocation && isPromptingLiveLocation && (
        <div className="bg-emerald-900 border-b border-emerald-700/60 text-white px-3 sm:px-6 py-2.5 shadow-md flex items-center justify-between gap-3 text-xs z-50 animate-fadeIn">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
            <p className="truncate">
              We detected your location: <strong className="text-emerald-200">{detectedLiveLocation.locality}, {detectedLiveLocation.city} - {detectedLiveLocation.postal_code}</strong>. Do you want to deliver to this location?
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => confirmLiveLocation(detectedLiveLocation)}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-emerald-950 font-bold text-xs shadow-sm transition-all"
            >
              Yes, Deliver Here
            </button>
            <button
              type="button"
              onClick={rejectLiveLocation}
              className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-emerald-100 text-xs transition-all"
            >
              Change
            </button>
          </div>
        </div>
      )}

      {/* Main Header Bar */}
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 py-2 sm:py-3">
        <div className="flex items-center justify-between gap-2 sm:gap-4 md:gap-6">
          
          {/* Brand Logo - Responsive Size */}
          <div className="shrink-0">
            <BrandLogo size="sm" className="sm:hidden" />
            <BrandLogo size="md" className="hidden sm:flex" />
          </div>

          {/* Delivery Location Selector - Tablet & Desktop */}
          <button
            onClick={openLocationModal}
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-stone-200 bg-white hover:border-rootly-sage/60 hover:bg-rootly-sageMist/30 transition-all text-left max-w-[200px] lg:max-w-[220px] shadow-sm group shrink-0"
          >
            <div className="w-7 h-7 rounded-lg bg-rootly-sageMist flex items-center justify-center text-rootly-forest shrink-0 group-hover:scale-105 transition-transform">
              <MapPin className="w-3.5 h-3.5 text-rootly-forest" />
            </div>
            <div className="overflow-hidden leading-tight">
              <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-rootly-forest">
                <span>Deliver to</span>
                <ChevronDown className="w-3 h-3 text-stone-400 group-hover:translate-y-0.5 transition-transform" />
              </div>
              <p className="text-xs font-semibold text-stone-700 truncate">
                {locationLabel}
              </p>
            </div>
          </button>

          {/* Mobile Location Pill (Visible only on mobile row 1) */}
          <button
            onClick={openLocationModal}
            className="md:hidden flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-stone-100 hover:bg-rootly-sageMist/50 text-left max-w-[130px] xs:max-w-[160px] truncate transition-colors shrink-0"
          >
            <MapPin className="w-3 h-3 text-rootly-forest shrink-0" />
            <span className="text-[11px] font-bold text-stone-800 truncate">
              {locationLabel.split(',')[0]}
            </span>
            <ChevronDown className="w-3 h-3 text-stone-400 shrink-0" />
          </button>

          {/* Desktop Search Bar with live autocomplete */}
          <div ref={searchRef} className="hidden md:block flex-1 max-w-xl relative">
            <form onSubmit={handleSearchSubmit} className="relative w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery.trim().length >= 2 && setIsSearchOpen(true)}
                placeholder="Search cold-pressed oils, organic produce, groceries..."
                className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-white border border-stone-200/90 text-sm font-medium placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-rootly-sage/40 focus:border-rootly-sage transition-all shadow-soft"
              />
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </form>

            {/* Desktop Suggestions Dropdown */}
            {isSearchOpen && (suggestions.products.length > 0 || suggestions.categories.length > 0) && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl border border-stone-200 shadow-lift overflow-hidden z-50">
                {suggestions.categories.length > 0 && (
                  <div className="p-2 border-b border-stone-100 bg-rootly-cream/50">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400 px-3 py-1">Categories</p>
                    {suggestions.categories.map((c) => (
                      <button
                        key={c.slug}
                        onClick={() => {
                          setIsSearchOpen(false);
                          setSearchQuery('');
                          navigate(`/products?category=${c.slug}`);
                        }}
                        className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold text-stone-700 hover:bg-rootly-sageMist/60 hover:text-rootly-forest flex items-center justify-between"
                      >
                        <span>{c.name}</span>
                        <span className="text-[10px] text-stone-400">View Category →</span>
                      </button>
                    ))}
                  </div>
                )}

                {suggestions.products.length > 0 && (
                  <div className="p-2 max-h-64 overflow-y-auto">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400 px-3 py-1">Products</p>
                    {suggestions.products.map((p) => (
                      <button
                        key={p.slug}
                        onClick={() => {
                          setIsSearchOpen(false);
                          setSearchQuery('');
                          navigate(`/products/${p.slug}`);
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-stone-800 hover:bg-rootly-sageMist/50 flex items-center gap-2"
                      >
                        <Search className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span className="truncate">{p.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* User Account / Navigation Icons */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Wishlist Link */}
            <Link
              to="/wishlist"
              className="p-2.5 rounded-xl text-stone-700 hover:text-rootly-forest hover:bg-rootly-cream transition-colors relative"
              title="Wishlist"
            >
              <Heart className="w-5 h-5" />
            </Link>

            {/* User Account Dropdown */}
            <div ref={userMenuRef} className="relative">
              {user ? (
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border border-stone-200 bg-white hover:border-rootly-sage transition-all text-xs font-semibold text-stone-800 shadow-sm"
                >
                  <div className="w-6 h-6 rounded-full bg-rootly-forest text-rootly-cream flex items-center justify-center font-bold text-xs uppercase">
                    {user.name.charAt(0)}
                  </div>
                  <span className="hidden md:inline max-w-[90px] truncate">{user.name.split(' ')[0]}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
                </button>
              ) : (
                <button
                  onClick={openLoginModal}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-stone-200 hover:border-rootly-forest text-stone-700 hover:text-rootly-forest text-xs font-bold transition-all shadow-sm"
                >
                  <UserIcon className="w-4 h-4" />
                  <span>Login</span>
                </button>
              )}

              {/* User Dropdown Menu */}
              {isUserMenuOpen && user && (
                <div className="absolute right-0 top-full mt-1.5 w-56 bg-white rounded-2xl border border-stone-200 shadow-lift py-2 z-50">
                  <div className="px-4 py-2 border-b border-stone-100">
                    <p className="text-xs font-bold text-stone-900 truncate">{user.name}</p>
                    <p className="text-[11px] text-stone-500 truncate">{user.email}</p>
                    {isAdmin && (
                      <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                        Admin Access
                      </span>
                    )}
                  </div>

                  <Link
                    to="/account"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-stone-700 hover:bg-rootly-sageMist/50 transition-colors"
                  >
                    <UserIcon className="w-4 h-4 text-stone-500" />
                    <span>My Profile</span>
                  </Link>

                  <Link
                    to="/account?tab=orders"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-stone-700 hover:bg-rootly-sageMist/50 transition-colors"
                  >
                    <Package className="w-4 h-4 text-stone-500" />
                    <span>My Orders</span>
                  </Link>

                  <Link
                    to="/account?tab=addresses"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-stone-700 hover:bg-rootly-sageMist/50 transition-colors"
                  >
                    <MapPin className="w-4 h-4 text-stone-500" />
                    <span>Saved Addresses</span>
                  </Link>

                  {isAdmin && (
                    <Link
                      to="/admin"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-rootly-forest bg-rootly-sageMist/40 hover:bg-rootly-sageMist transition-colors"
                    >
                      <Settings className="w-4 h-4 text-rootly-forest" />
                      <span>Admin Dashboard</span>
                    </Link>
                  )}

                  <div className="my-1 border-t border-stone-100" />

                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>

            {/* Cart Button Pill (Quick-Commerce Style) */}
            <button
              onClick={openDrawer}
              aria-label={`View shopping cart with ${cart.item_count} items`}
              className="flex items-center gap-2 px-3 sm:px-3.5 py-2 rounded-2xl bg-rootly-forest hover:bg-rootly-dark text-[#FAF8F5] shadow-card transition-all active:scale-95 group min-h-[44px] touch-manipulation shrink-0"
            >
              <div className="relative flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-rootly-sagePale group-hover:scale-105 transition-transform" />
                {cart.item_count > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-rootly-earth text-white font-black text-[10px] min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center shadow-sm border border-rootly-forest animate-pulse">
                    {cart.item_count}
                  </span>
                )}
              </div>
              <div className="text-left leading-tight hidden sm:block">
                <span className="text-[10px] block text-rootly-sagePale font-medium">
                  {cart.item_count === 1 ? '1 item' : `${cart.item_count} items`}
                </span>
                <span className="text-xs font-extrabold text-white">
                  ₹{cart.total_amount > 0 ? cart.total_amount : '0'}
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Mobile Search Bar Row (One-Handed Easy Access) */}
        <div className="mt-2 md:hidden relative">
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.trim().length >= 2 && setIsSearchOpen(true)}
              placeholder="Search wood-pressed oils, organic groceries..."
              className="w-full pl-9 pr-9 py-2 rounded-xl bg-white border border-stone-200 text-sm font-medium placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-rootly-sage/40 focus:border-rootly-sage transition-all shadow-sm"
            />
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </form>

          {/* Mobile Suggestions Dropdown */}
          {isSearchOpen && (suggestions.products.length > 0 || suggestions.categories.length > 0) && (
            <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl border border-stone-200 shadow-lift overflow-hidden z-50">
              {suggestions.categories.length > 0 && (
                <div className="p-2 border-b border-stone-100 bg-rootly-cream/50">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 px-3 py-1">Categories</p>
                  {suggestions.categories.map((c) => (
                    <button
                      key={c.slug}
                      onClick={() => {
                        setIsSearchOpen(false);
                        setSearchQuery('');
                        navigate(`/products?category=${c.slug}`);
                      }}
                      className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold text-stone-700 hover:bg-rootly-sageMist/60 flex items-center justify-between"
                    >
                      <span className="hidden sm:inline">{c.name}</span>
                      <span className="sm:hidden">{getShortNavLabel(c.name)}</span>
                      <span className="text-[10px] text-stone-400">→</span>
                    </button>
                  ))}
                </div>
              )}

              {suggestions.products.length > 0 && (
                <div className="p-2 max-h-56 overflow-y-auto">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 px-3 py-1">Products</p>
                  {suggestions.products.map((p) => (
                    <button
                      key={p.slug}
                      onClick={() => {
                        setIsSearchOpen(false);
                        setSearchQuery('');
                        navigate(`/products/${p.slug}`);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-stone-800 hover:bg-rootly-sageMist/50 flex items-center gap-2"
                    >
                      <Search className="w-3 h-3 text-stone-400 shrink-0" />
                      <span className="truncate">{p.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Category Pills Navigation Strip with Shortened Mobile Labels */}
      <nav className="border-t border-stone-200/80 bg-white/70 overflow-x-auto no-scrollbar py-2 scroll-smooth">
        <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 flex items-center gap-1.5 sm:gap-2 text-xs font-semibold whitespace-nowrap">
          <Link
            to="/products"
            className="px-2.5 sm:px-3 py-1.5 rounded-full bg-rootly-forest text-white hover:bg-rootly-dark transition-colors shrink-0 flex items-center"
          >
            <span className="hidden sm:inline">All Products</span>
            <span className="sm:hidden">All</span>
          </Link>

          <Link
            to="/products?collection=deals"
            className="px-2.5 sm:px-3 py-1.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 transition-colors flex items-center gap-1 shrink-0"
          >
            <Flame className="w-3 h-3 text-amber-600 shrink-0" />
            <span className="hidden sm:inline">Deals of the Day</span>
            <span className="sm:hidden">Deals</span>
          </Link>

          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={`/products?category=${cat.slug}`}
              className="px-2.5 sm:px-3 py-1.5 rounded-full bg-rootly-cream hover:bg-rootly-sageMist hover:text-rootly-forest text-stone-700 transition-colors border border-stone-200/50 shrink-0 flex items-center"
            >
              <span className="hidden sm:inline">{cat.name}</span>
              <span className="sm:hidden">{getShortNavLabel(cat.name)}</span>
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
};

