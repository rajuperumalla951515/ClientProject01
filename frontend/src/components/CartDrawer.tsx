import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Plus, Minus, Trash2, ShoppingBag, ArrowRight, Sparkles, ShieldCheck, CheckCircle, MapPin, Loader2, Truck, Zap } from 'lucide-react';
import { WhatsAppIcon } from './WhatsAppIcon';
import { WhatsAppCheckoutModal } from './WhatsAppCheckoutModal';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import { useStoreSettings } from '../context/SettingsContext';

export const CartDrawer: React.FC = () => {
  const navigate = useNavigate();
  const { cart, isDrawerOpen, closeDrawer, incrementItem, decrementItem, setItemQuantity } = useCart();
  const { user, openLoginModal } = useAuth();
  const {
    locationLabel,
    openLocationModal,
    distanceKm,
    matchedSlab,
    deliveryFee: locationDeliveryFee,
    deliveryMode,
    courierPartner,
    isCalculatingQuote,
    recalculateDeliveryFee,
  } = useLocation();
  const { settings } = useStoreSettings();
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);

  // Delivery Mode and Free Delivery Threshold evaluation (Local radius up to 60 km, Nationwide Courier above)
  const localRadiusKm = settings?.delivery_radius_km || 60.0;
  const isCourier = deliveryMode === 'nationwide_courier' || (distanceKm !== null && distanceKm > localRadiusKm);
  const effectiveFreeThreshold = isCourier ? 999 : (cart.free_delivery_threshold || 499);
  const isFreeDelivery = cart.subtotal > 0 && cart.subtotal >= effectiveFreeThreshold;
  const amountNeeded = Math.max(0, Math.round((effectiveFreeThreshold - cart.subtotal) * 100) / 100);

  // Recalculate authoritative delivery quote whenever cart items or subtotal changes
  useEffect(() => {
    if (isDrawerOpen && cart.items.length > 0) {
      recalculateDeliveryFee(cart.subtotal);
    }
  }, [isDrawerOpen, cart.subtotal, recalculateDeliveryFee]);

  // Authoritative delivery fee from single centralized quote: ONLY 0 if genuine free delivery threshold is reached
  const baseDeliveryFee = (locationDeliveryFee !== undefined && locationDeliveryFee !== null)
    ? locationDeliveryFee
    : (isCourier ? 49.0 : 30.0);

  const computedDeliveryFee = isFreeDelivery || cart.subtotal === 0 ? 0 : baseDeliveryFee;

  // FINAL RULE: Customer Amount = Product Selling Price (cart.subtotal) + Delivery Fee.
  // Never subtract MRP savings!
  const grandTotal = Math.round((cart.subtotal + computedDeliveryFee) * 100) / 100;

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
                {!isFreeDelivery && amountNeeded > 0 ? (
                  <span>
                    Add <strong className="text-rootly-sagePale">₹{amountNeeded}</strong> more for <strong>FREE Delivery!</strong>
                  </span>
                ) : (
                  <span className="text-emerald-300 font-bold flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-300" />
                    <span>You have unlocked FREE Delivery!</span>
                  </span>
                )}
              </span>
              <span className="text-[11px] font-mono text-stone-300">
                ₹{effectiveFreeThreshold} goal
              </span>
            </div>

            <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
              <div
                className="bg-rootly-sagePale h-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.round((cart.subtotal / effectiveFreeThreshold) * 100))}%` }}
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
                      onClick={() => decrementItem(item.product_id, item.variant_id)}
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
                      onClick={() => incrementItem(item.product_id, item.variant_id, item.variant?.stock || 999)}
                      aria-label="Increase quantity"
                      className="w-8 h-full flex items-center justify-center hover:bg-stone-200 active:scale-90 transition-all text-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => setItemQuantity(item.product_id, item.variant_id, 0)}
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
                  <span>Item Total (Selling Price)</span>
                  <span className="font-semibold text-stone-900">₹{cart.subtotal}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <span className="flex items-center gap-1.5 font-medium text-stone-800">
                      {isCourier ? (
                        <>
                          <Truck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span>Nationwide Courier Shipping {courierPartner ? `(${courierPartner})` : ''}</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span>Local Express Delivery</span>
                        </>
                      )}
                    </span>
                    {distanceKm !== null && distanceKm !== undefined && (
                      <span className="text-[10px] text-stone-400 block font-normal">
                        ~{distanceKm.toFixed(1)} km {matchedSlab ? `(${matchedSlab})` : ''}
                      </span>
                    )}
                  </div>
                  {isCalculatingQuote ? (
                    <span className="flex items-center gap-1 text-[11px] text-stone-400">
                      <Loader2 className="w-3 h-3 animate-spin text-rootly-forest" />
                      <span>Calculating...</span>
                    </span>
                  ) : computedDeliveryFee === 0 && isFreeDelivery ? (
                    <span className="font-bold text-emerald-700 uppercase tracking-tight">FREE</span>
                  ) : (
                    <span className="font-semibold text-stone-900">₹{computedDeliveryFee}</span>
                  )}
                </div>
                <div className="border-t border-stone-100 pt-1.5 flex justify-between text-sm font-extrabold text-stone-900">
                  <span>Grand Total</span>
                  <span className="text-base text-rootly-forest">₹{grandTotal}</span>
                </div>

                {/* Informational Savings Badge — NEVER subtracted from selling price! */}
                {cart.discount > 0 && (
                  <div className="mt-1 flex items-center justify-between text-[11px] text-emerald-800 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-100 font-medium">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span>Total MRP Savings:</span>
                    </span>
                    <strong className="font-bold text-emerald-700">₹{cart.discount} saved on MRP</strong>
                  </div>
                )}
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

              {/* WhatsApp Quick Order CTA */}
              <button
                type="button"
                onClick={() => setIsWhatsAppOpen(true)}
                className="w-full py-3 px-4 rounded-2xl bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold text-xs shadow-lift flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                <WhatsAppIcon className="w-4 h-4 text-white" />
                <span>Order via WhatsApp</span>
              </button>

              {/* Checkout CTA - Touch Friendly */}
              <button
                type="button"
                onClick={handleCheckoutClick}
                className="w-full py-3 px-4 rounded-2xl bg-rootly-forest hover:bg-rootly-dark text-white font-bold text-xs sm:text-sm shadow-lift flex items-center justify-between transition-all active:scale-[0.98] group touch-manipulation min-h-[44px]"
              >
                <div className="text-left leading-tight">
                  <span className="text-[9px] block text-rootly-sagePale font-medium">To Pay</span>
                  <span className="text-sm font-extrabold">₹{grandTotal}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-rootly-sagePale group-hover:text-white">
                  <span>Standard Checkout</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* WhatsApp Checkout Modal */}
      <WhatsAppCheckoutModal
        isOpen={isWhatsAppOpen}
        onClose={() => setIsWhatsAppOpen(false)}
      />
    </div>
  );
};

