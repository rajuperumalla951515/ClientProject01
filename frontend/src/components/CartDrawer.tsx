import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Plus, Minus, Trash2, ShoppingBag, ArrowRight, Sparkles, ShieldCheck, CheckCircle, MapPin } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';

export const CartDrawer: React.FC = () => {
  const navigate = useNavigate();
  const { cart, isDrawerOpen, closeDrawer, updateQuantity, removeFromCart } = useCart();
  const { user, openLoginModal } = useAuth();
  const { locationLabel, openLocationModal } = useLocation();

  if (!isDrawerOpen) return null;

  const handleCheckoutClick = () => {
    closeDrawer();
    if (!user) {
      openLoginModal();
    } else {
      navigate('/checkout');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={closeDrawer}
        className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm transition-opacity"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
        <div className="w-screen max-w-full sm:max-w-md bg-[#FAF8F5] shadow-2xl flex flex-col justify-between h-[100dvh]">
          
          {/* Header */}
          <div className="p-3.5 sm:p-5 bg-white border-b border-stone-200 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-rootly-sageMist flex items-center justify-center text-rootly-forest shrink-0">
                <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-rootly-forest" />
              </div>
              <div>
                <h3 className="font-display font-bold text-stone-900 text-sm sm:text-base">
                  <span className="hidden sm:inline">Shopping Cart</span>
                  <span className="sm:hidden">Cart</span>
                </h3>
                <p className="text-[11px] sm:text-xs text-stone-500 font-medium">
                  {cart.item_count === 1 ? '1 item' : `${cart.item_count} items`}
                </p>
              </div>
            </div>

            <button
              onClick={closeDrawer}
              aria-label="Close cart"
              className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Delivery threshold progress bar */}
          <div className="p-3.5 bg-rootly-forest text-white">
            <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-rootly-sagePale" />
                {cart.amount_needed_for_free_delivery > 0 ? (
                  <span>
                    Add <strong className="text-rootly-sagePale">₹{cart.amount_needed_for_free_delivery}</strong> more for <strong>FREE Delivery!</strong>
                  </span>
                ) : (
                  <span className="text-emerald-300 font-bold flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-300" />
                    <span>You have unlocked FREE Delivery!</span>
                  </span>
                )}
              </span>
              <span className="text-[11px] font-mono text-stone-300">
                ₹{cart.free_delivery_threshold} goal
              </span>
            </div>

            <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
              <div
                className="bg-rootly-sagePale h-full transition-all duration-500"
                style={{ width: `${cart.free_delivery_progress}%` }}
              />
            </div>
          </div>

          {/* Items List or Empty State */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6">
                <div className="w-20 h-20 rounded-2xl bg-rootly-cream border border-stone-200 flex items-center justify-center text-stone-400 mb-4 shadow-sm">
                  <ShoppingBag className="w-10 h-10 stroke-[1.5] text-stone-400" />
                </div>
                <h4 className="font-display font-bold text-stone-800 text-lg">Your cart is empty</h4>
                <p className="text-xs text-stone-500 max-w-xs mt-1 mb-6">
                  Fill it with pure organic groceries, farm-fresh greens, cold-pressed oils and stone-ground grains.
                </p>
                <button
                  onClick={() => {
                    closeDrawer();
                    navigate('/products');
                  }}
                  className="px-5 py-2.5 rounded-xl bg-rootly-forest text-white text-xs font-bold shadow-md hover:bg-rootly-dark transition-all"
                >
                  Start Shopping
                </button>
              </div>
            ) : (
              cart.items.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-2xl bg-white border border-stone-200/90 shadow-soft flex items-center gap-3"
                >
                  {/* Thumbnail */}
                  <img
                    src={item.product?.primary_image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=300'}
                    alt={item.product?.name}
                    className="w-16 h-16 rounded-xl object-cover bg-stone-50 border border-stone-100 shrink-0"
                  />

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <h5 className="font-bold text-xs text-stone-900 truncate">{item.product?.name}</h5>
                    <p className="text-[11px] text-stone-500 font-medium">{item.variant?.unit}</p>
                    
                    <div className="flex items-baseline gap-1.5 mt-1">
                      <span className="text-xs font-bold text-stone-900">
                        ₹{item.variant?.price * item.quantity}
                      </span>
                      {item.variant?.mrp > item.variant?.price && (
                        <span className="text-[10px] text-stone-400 line-through">
                          ₹{item.variant?.mrp * item.quantity}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quantity Stepper - Touch Friendly */}
                  <div className="flex items-center rounded-xl bg-stone-100 border border-stone-200 text-stone-800 overflow-hidden h-9 shrink-0 touch-manipulation">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      aria-label="Decrease quantity"
                      className="w-8 h-full flex items-center justify-center hover:bg-stone-200 active:scale-90 transition-all text-xs"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-1.5 text-xs font-bold min-w-[18px] text-center select-none">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      aria-label="Increase quantity"
                      className="w-8 h-full flex items-center justify-center hover:bg-stone-200 active:scale-90 transition-all text-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => removeFromCart(item.id)}
                    aria-label="Remove item"
                    className="p-2 text-stone-400 hover:text-red-500 transition-colors touch-manipulation min-w-[36px] min-h-[36px] flex items-center justify-center"
                    title="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer & Bill Breakdown (only if cart has items) */}
          {cart.items.length > 0 && (
            <div className="p-3.5 sm:p-5 bg-white border-t border-stone-200 space-y-3 shrink-0 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              
              {/* Bill Details */}
              <div className="space-y-1 text-xs text-stone-600">
                <div className="flex justify-between">
                  <span>Item Total (incl. GST)</span>
                  <span className="font-semibold text-stone-900">₹{cart.subtotal}</span>
                </div>
                {cart.discount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Organic Savings Discount</span>
                    <span className="font-semibold">-₹{cart.discount}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Delivery Partner Fee</span>
                  {cart.delivery_fee === 0 ? (
                    <span className="font-bold text-emerald-700 uppercase tracking-tight">FREE</span>
                  ) : (
                    <span className="font-semibold text-stone-900">₹{cart.delivery_fee}</span>
                  )}
                </div>
                <div className="border-t border-stone-100 pt-1.5 flex justify-between text-sm font-extrabold text-stone-900">
                  <span>Grand Total</span>
                  <span className="text-base text-rootly-forest">₹{cart.total_amount}</span>
                </div>
              </div>

              {/* Delivery Address Note with Change Action */}
              <div className="flex items-center justify-between text-[11px] text-stone-500 pt-1">
                <p className="truncate flex items-center gap-1 min-w-0">
                  <MapPin className="w-3 h-3 text-rootly-forest shrink-0" />
                  <span>Delivering to:</span>
                  <strong className="text-stone-800 truncate">{locationLabel}</strong>
                </p>
                <button
                  type="button"
                  onClick={openLocationModal}
                  className="text-rootly-forest hover:underline font-bold shrink-0 ml-1.5"
                >
                  Change
                </button>
              </div>

              {/* Checkout CTA - Touch Friendly */}
              <button
                type="button"
                onClick={handleCheckoutClick}
                className="w-full py-3.5 px-4 rounded-2xl bg-rootly-forest hover:bg-rootly-dark text-white font-bold text-sm shadow-lift flex items-center justify-between transition-all active:scale-[0.98] group touch-manipulation min-h-[48px]"
              >
                <div className="text-left leading-tight">
                  <span className="text-[10px] block text-rootly-sagePale font-medium">To Pay</span>
                  <span className="text-base font-extrabold">₹{cart.total_amount}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-rootly-sagePale group-hover:text-white">
                  <span>Proceed to Checkout</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

