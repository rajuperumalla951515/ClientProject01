import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, AlertTriangle, PackageX, ShoppingBag, ArrowRight, X, CheckCheck } from 'lucide-react';
import { DashboardStats } from '../../types';

interface NotificationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  stats: DashboardStats | null;
}

export const NotificationsDrawer: React.FC<NotificationsDrawerProps> = ({ isOpen, onClose, stats }) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const lowStockCount = stats?.low_stock_products || 0;
  const outOfStockCount = stats?.out_of_stock_products || 0;
  const pendingOrdersCount = stats?.pending_orders || 0;
  const totalAlerts = (lowStockCount > 0 ? 1 : 0) + (outOfStockCount > 0 ? 1 : 0) + (pendingOrdersCount > 0 ? 1 : 0);

  const handleAction = (path: string) => {
    onClose();
    navigate(path);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div
        className="fixed inset-0 bg-[#244B37]/20 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
      />
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-sm sm:max-w-md bg-white border-l border-[#E6E7DD] shadow-2xl flex flex-col">
          {/* Drawer Header */}
          <div className="p-4 sm:p-5 border-b border-[#E6E7DD] bg-[#FDFCF9] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#E2E8D7] text-[#244B37] flex items-center justify-center font-bold text-xs">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#26352B]">Operational Alerts</h3>
                <p className="text-[11px] text-[#778176]">Real-time store & inventory alerts</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-[#778176] hover:text-[#26352B] rounded-lg hover:bg-[#F6F5EF] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Alert Cards Container */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
            {totalAlerts === 0 ? (
              <div className="py-12 text-center">
                <div className="w-12 h-12 rounded-full bg-[#E2E8D7] text-[#244B37] flex items-center justify-center mx-auto mb-3">
                  <CheckCheck className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-[#26352B]">All Systems Healthy</h4>
                <p className="text-xs text-[#778176] mt-1 max-w-xs mx-auto">
                  No critical stock shortages or pending orders require your immediate attention.
                </p>
              </div>
            ) : (
              <>
                {/* Out of Stock Alert */}
                {outOfStockCount > 0 && (
                  <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/70 text-rose-900 transition-all">
                    <div className="flex items-start gap-3">
                      <PackageX className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-rose-800">
                            Out of Stock
                          </h4>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-200 text-rose-800">
                            {outOfStockCount} SKUs
                          </span>
                        </div>
                        <p className="text-xs text-rose-700 mt-1">
                          {outOfStockCount} organic produce items or oil variants currently have 0 units in stock.
                        </p>
                        <button
                          onClick={() => handleAction('/inventory')}
                          className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-bold text-rose-800 hover:text-rose-950 underline underline-offset-2"
                        >
                          Restock in Inventory
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Low Stock Alert */}
                {lowStockCount > 0 && (
                  <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/70 text-amber-900 transition-all">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800">
                            Low Stock Warning
                          </h4>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-800">
                            {lowStockCount} SKUs
                          </span>
                        </div>
                        <p className="text-xs text-amber-700 mt-1">
                          {lowStockCount} items have fallen below 10 units. Plan farm batch replenishment.
                        </p>
                        <button
                          onClick={() => handleAction('/inventory')}
                          className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 hover:text-amber-950 underline underline-offset-2"
                        >
                          View Low Stock Items
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Pending Orders Alert */}
                {pendingOrdersCount > 0 && (
                  <div className="p-4 rounded-xl border border-[#8A9B69]/40 bg-[#F1F4EC] text-[#244B37] transition-all">
                    <div className="flex items-start gap-3">
                      <ShoppingBag className="w-5 h-5 text-[#496B45] shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-[#244B37]">
                            Pending Orders
                          </h4>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E2E8D7] text-[#244B37]">
                            {pendingOrdersCount} Orders
                          </span>
                        </div>
                        <p className="text-xs text-[#496B45] mt-1">
                          {pendingOrdersCount} customer orders awaiting confirmation, packing, or dispatch.
                        </p>
                        <button
                          onClick={() => handleAction('/orders')}
                          className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-bold text-[#244B37] hover:text-[#1C3C2C] underline underline-offset-2"
                        >
                          Process Orders
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Drawer Footer */}
          <div className="p-4 bg-[#FAF9F5] border-t border-[#E6E7DD] flex items-center justify-between text-xs text-[#778176]">
            <span>Cloudflare D1 Edge Synchronized</span>
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-[#E6E7DD] bg-white hover:bg-[#F6F5EF] text-[#26352B] font-semibold text-xs transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
