import React from 'react';
import { useLocation } from 'react-router-dom';
import { ShoppingBag, ChevronRight } from 'lucide-react';
import { useCart } from '../context/CartContext';

export const MobileFloatingCartBar: React.FC = () => {
  const { cart, openDrawer } = useCart();
  const location = useLocation();

  // Hide if cart is empty or user is already on cart/checkout/admin pages
  if (
    cart.item_count === 0 ||
    location.pathname === '/cart' ||
    location.pathname === '/checkout' ||
    location.pathname.startsWith('/admin')
  ) {
    return null;
  }

  return (
    <div className="fixed bottom-16 left-3 right-3 z-40 lg:hidden pb-[env(safe-area-inset-bottom)] pointer-events-none animate-fadeIn">
      <button
        type="button"
        onClick={openDrawer}
        className="pointer-events-auto w-full max-w-lg mx-auto p-3 sm:p-3.5 rounded-2xl bg-rootly-forest text-white shadow-lift border border-emerald-800/50 flex items-center justify-between active:scale-[0.98] transition-all touch-manipulation min-h-[52px]"
      >
        {/* Left: Cart badge & price */}
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-xl bg-rootly-forestLight flex items-center justify-center shrink-0">
            <ShoppingBag className="w-5 h-5 text-rootly-sagePale" />
            <span className="absolute -top-1 -right-1 bg-rootly-earth text-white font-black text-[10px] min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center shadow-sm border border-rootly-forest">
              {cart.item_count}
            </span>
          </div>
          <div className="text-left leading-tight">
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-black text-white">₹{cart.total_amount}</span>
              {cart.discount > 0 && (
                <span className="text-[10px] font-bold text-rootly-sagePale">
                  Saved ₹{cart.discount}
                </span>
              )}
            </div>
            <p className="text-[11px] text-stone-300">
              {cart.item_count === 1 ? '1 item' : `${cart.item_count} items`} • Tap to view bill
            </p>
          </div>
        </div>

        {/* Right: Checkout CTA */}
        <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rootly-sage text-white text-xs font-bold shadow-sm">
          <span>View Cart</span>
          <ChevronRight className="w-3.5 h-3.5 stroke-[3]" />
        </div>
      </button>
    </div>
  );
};
