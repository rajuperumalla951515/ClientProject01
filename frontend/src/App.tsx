import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { LocationProvider } from './context/LocationContext';
import { prewarmBackend } from './services/api';
import { useRealtimeSync } from './hooks/useRealtimeSync';

import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { CartDrawer } from './components/CartDrawer';
import { LocationModal } from './components/LocationModal';
import { DeliveryConfirmationModal } from './components/DeliveryConfirmationModal';
import { InitialLocationBanner } from './components/InitialLocationBanner';
import { AuthModal } from './components/AuthModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { MobileFloatingCartBar } from './components/MobileFloatingCartBar';

import { HomePage } from './pages/HomePage';

// Code-split route chunks for optimized FCP/LCP and sub-300KB initial bundle
const ProductsPage = lazy(() => import('./pages/ProductsPage').then(m => ({ default: m.ProductsPage })));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage').then(m => ({ default: m.ProductDetailPage })));
const CartPage = lazy(() => import('./pages/CartPage').then(m => ({ default: m.CartPage })));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage').then(m => ({ default: m.CheckoutPage })));
const OrderConfirmationPage = lazy(() => import('./pages/OrderConfirmationPage').then(m => ({ default: m.OrderConfirmationPage })));
const AccountPage = lazy(() => import('./pages/AccountPage').then(m => ({ default: m.AccountPage })));
const SearchResultsPage = lazy(() => import('./pages/SearchResultsPage').then(m => ({ default: m.SearchResultsPage })));
const AboutPage = lazy(() => import('./pages/AboutPage').then(m => ({ default: m.AboutPage })));
const ContactPage = lazy(() => import('./pages/ContactPage').then(m => ({ default: m.ContactPage })));
const FAQPage = lazy(() => import('./pages/FAQPage').then(m => ({ default: m.FAQPage })));
const PolicyPage = lazy(() => import('./pages/PolicyPage').then(m => ({ default: m.PolicyPage })));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage').then(m => ({ default: m.AdminDashboardPage })));

const RouteLoadingSkeleton = () => (
  <div className="max-w-7xl mx-auto px-4 py-8 animate-pulse space-y-6">
    <div className="h-8 bg-stone-200/80 rounded-lg w-1/3"></div>
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-64 bg-stone-200/60 rounded-2xl"></div>
      ))}
    </div>
  </div>
);

function AppLayout() {
  // Connect to real-time Server-Sent Events for instant cross-tab synchronization
  useRealtimeSync();

  return (
    <div className="min-h-[100dvh] w-full flex flex-col bg-[#FAF8F5] text-stone-800 font-sans selection:bg-rootly-sage/20 selection:text-rootly-forest overflow-x-hidden">
      {/* Initial Geolocation Permission Banner */}
      <InitialLocationBanner />

      {/* Sticky Top Header */}
      <Header />

      {/* Main Content Area - with bottom safe padding on mobile for bottom nav */}
      <main className="flex-1 pb-20 lg:pb-0">
        <Suspense fallback={<RouteLoadingSkeleton />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/products/:slug" element={<ProductDetailPage />} />
            <Route path="/search" element={<SearchResultsPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/order-confirmation/:id" element={<OrderConfirmationPage />} />
            <Route path="/account" element={<AccountPage />} />
            <Route path="/wishlist" element={<AccountPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/faq" element={<FAQPage />} />
            <Route path="/shipping-policy" element={<PolicyPage />} />
            <Route path="/returns-policy" element={<PolicyPage />} />
            <Route path="/privacy-policy" element={<PolicyPage />} />
            <Route path="/terms" element={<PolicyPage />} />
            <Route path="/admin" element={<AdminDashboardPage />} />
          </Routes>
        </Suspense>
      </main>

      {/* Footer */}
      <Footer />

      {/* Mobile Quick Navigation & Instant Floating Cart */}
      <MobileFloatingCartBar />
      <MobileBottomNav />

      {/* Global Modals & Slide-overs */}
      <CartDrawer />
      <LocationModal />
      <DeliveryConfirmationModal />
      <AuthModal />
    </div>
  );
}

export function App() {
  useEffect(() => {
    prewarmBackend();
  }, []);

  return (
    <BrowserRouter>
      <AuthProvider>
        <LocationProvider>
          <CartProvider>
            <AppLayout />
          </CartProvider>
        </LocationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

