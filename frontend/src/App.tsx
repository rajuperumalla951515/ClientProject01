import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
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

const AdminRedirect: React.FC = () => {
  useEffect(() => {
    window.location.replace('https://adminsriadithyaorganics.pages.dev');
  }, []);
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-12 h-12 rounded-2xl bg-[#244B37] text-white flex items-center justify-center mb-3 shadow-md">
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
      <h2 className="text-lg font-bold text-stone-900">Redirecting to Sri Adithya Organics Admin Portal...</h2>
      <p className="text-xs text-stone-500 mt-1 max-w-sm">
        Administrative controls are hosted on a secure, isolated domain. If not redirected automatically,{' '}
        <a href="https://adminsriadithyaorganics.pages.dev" className="text-[#244B37] font-bold underline">
          click here to open admin
        </a>.
      </p>
    </div>
  );
};

const RouteLoadingSkeleton = () => (
  <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-8 animate-pulse space-y-6">
    <div className="h-8 bg-stone-200/80 rounded-lg w-1/3"></div>
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
      {[...Array(6)].map((_, i) => (
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
            <Route path="/admin" element={<AdminRedirect />} />
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
        <SettingsProvider>
          <LocationProvider>
            <CartProvider>
              <AppLayout />
            </CartProvider>
          </LocationProvider>
        </SettingsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

