import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { LocationProvider } from './context/LocationContext';

import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { CartDrawer } from './components/CartDrawer';
import { LocationModal } from './components/LocationModal';
import { AuthModal } from './components/AuthModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { MobileFloatingCartBar } from './components/MobileFloatingCartBar';

import { HomePage } from './pages/HomePage';
import { ProductsPage } from './pages/ProductsPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { OrderConfirmationPage } from './pages/OrderConfirmationPage';
import { AccountPage } from './pages/AccountPage';
import { SearchResultsPage } from './pages/SearchResultsPage';
import { AboutPage } from './pages/AboutPage';
import { ContactPage } from './pages/ContactPage';
import { FAQPage } from './pages/FAQPage';
import { PolicyPage } from './pages/PolicyPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <LocationProvider>
          <CartProvider>
            <div className="min-h-[100dvh] w-full flex flex-col bg-[#FAF8F5] text-stone-800 font-sans selection:bg-rootly-sage/20 selection:text-rootly-forest overflow-x-hidden">
              
              {/* Sticky Top Header */}
              <Header />

              {/* Main Content Area - with bottom safe padding on mobile for bottom nav */}
              <main className="flex-1 pb-20 lg:pb-0">
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
              </main>

              {/* Footer */}
              <Footer />

              {/* Mobile Quick Navigation & Instant Floating Cart */}
              <MobileFloatingCartBar />
              <MobileBottomNav />

              {/* Global Modals & Slide-overs */}
              <CartDrawer />
              <LocationModal />
              <AuthModal />
            </div>
          </CartProvider>
        </LocationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

