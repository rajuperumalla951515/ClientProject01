import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AdminAuthProvider, useAdminAuth } from './context/AdminAuthContext';
import { ToastProvider } from './context/ToastContext';
import { AdminLayout } from './components/layout/AdminLayout';
import { LoginPage } from './pages/LoginPage';
import { OverviewPage } from './pages/OverviewPage';
import { OrdersPage } from './pages/OrdersPage';
import { ProductsPage } from './pages/ProductsPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { InventoryPage } from './pages/InventoryPage';
import { CustomersPage } from './pages/CustomersPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { DiscountsPage } from './pages/DiscountsPage';
import { DeliveryPage } from './pages/DeliveryPage';
import { ReviewsPage } from './pages/ReviewsPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { AIAssistantPage } from './pages/ai/AIAssistantPage';
import { AIContentStudioPage } from './pages/ai/AIContentStudioPage';
import { AIBulkContentPage } from './pages/ai/AIBulkContentPage';
import { AIPromotionsPage } from './pages/ai/AIPromotionsPage';
import { AIApprovalsPage } from './pages/ai/AIApprovalsPage';
import { AIProvidersPage } from './pages/ai/AIProvidersPage';
import { LoadingSpinner } from './components/ui/LoadingSpinner';
import { ErrorBoundary } from './components/ui/ErrorBoundary';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAdminAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F6F5EF] flex items-center justify-center">
        <LoadingSpinner text="Verifying administrator session with Cloudflare D1..." size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AdminAuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <ErrorBoundary fallbackTitle="Admin Portal Error">
                    <AdminLayout />
                  </ErrorBoundary>
                </ProtectedRoute>
              }
            >
              <Route index element={<OverviewPage />} />
              <Route path="orders" element={<OrdersPage />} />
              <Route path="products" element={<ProductsPage />} />
              <Route path="categories" element={<CategoriesPage />} />
              <Route path="inventory" element={<InventoryPage />} />
              <Route path="customers" element={<CustomersPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="discounts" element={<DiscountsPage />} />
              <Route path="delivery" element={<DeliveryPage />} />
              <Route path="reviews" element={<ReviewsPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="ai/assistant" element={<ErrorBoundary fallbackTitle="AI Assistant Error"><AIAssistantPage /></ErrorBoundary>} />
              <Route path="ai/content-studio" element={<ErrorBoundary fallbackTitle="AI Content Studio Error"><AIContentStudioPage /></ErrorBoundary>} />
              <Route path="ai/bulk-content" element={<ErrorBoundary fallbackTitle="AI Bulk Studio Error"><AIBulkContentPage /></ErrorBoundary>} />
              <Route path="ai/promotions" element={<ErrorBoundary fallbackTitle="AI Promotions Error"><AIPromotionsPage /></ErrorBoundary>} />
              <Route path="ai/approvals" element={<ErrorBoundary fallbackTitle="AI Action Approvals Error"><AIApprovalsPage /></ErrorBoundary>} />
              <Route path="ai/providers" element={<ErrorBoundary fallbackTitle="AI Providers Error"><AIProvidersPage /></ErrorBoundary>} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AdminAuthProvider>
    </BrowserRouter>
  );
};

export default App;
