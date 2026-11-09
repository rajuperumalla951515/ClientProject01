import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Plus, Minus, Trash2, ArrowRight, Sparkles, ShieldCheck, CheckCircle, MapPin, Zap, AlertCircle, Truck } from 'lucide-react';
import { WhatsAppIcon } from '../components/WhatsAppIcon';
import { WhatsAppCheckoutModal } from '../components/WhatsAppCheckoutModal';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';

export const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const { cart, incrementItem, decrementItem, setItemQuantity, clearCart } = useCart();
  const { user, openLoginModal } = useAuth();
  const {
    locationLabel,
    openLocationModal,
    serviceHub,
    deliveryMinutes,
    isServiceable,
    deliveryMode,
    estimatedDeliveryDays,
    deliveryFee: locationDeliveryFee,
    distanceKm,
    matchedSlab,
    recalculateDeliveryFee,
  } = useLocation();
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);

  // Delivery Mode and Free Delivery Threshold evaluation
  const isCourier = deliveryMode === 'nationwide_courier' || (distanceKm !== null && distanceKm > 35.0);
  const effectiveFreeThreshold = isCourier ? 999 : (cart.free_delivery_threshold || 499);
  const isFreeDelivery = cart.subtotal > 0 && cart.subtotal >= effectiveFreeThreshold;
  const amountNeeded = Math.max(0, Math.round((effectiveFreeThreshold - cart.subtotal) * 100) / 100);

  // Applicable delivery fee: ONLY 0 if genuine free delivery qualification is satisfied!
  // If not eligible for free delivery, show the actual delivery charge instead of FREE.
  const baseDeliveryFee = (locationDeliveryFee && locationDeliveryFee > 0)
    ? locationDeliveryFee
    : (cart.delivery_fee > 0 ? cart.delivery_fee : (isCourier ? 49.0 : 20.0));

  const computedDeliveryFee = isFreeDelivery || cart.subtotal === 0 ? 0 : baseDeliveryFee;

  // FINAL RULE: Customer Amount = Product Selling Price (cart.subtotal) + Delivery Fee.
  // Never subtract MRP savings!
  const totalAmount = Math.round((cart.subtotal + computedDeliveryFee) * 100) / 100;

  const handleCheckout = () => {
    if (!user) {
      openLoginModal();
    } else {
      navigate('/checkout');
    }
  };

  if (cart.items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="w-24 h-24 rounded-3xl bg-rootly-cream border border-stone-200 flex items-center justify-center text-stone-400 mx-auto mb-4 shadow-sm">
          <ShoppingBag className="w-12 h-12 stroke-[1.5]" />
        </div>
        <h2 className="font-display font-black text-2xl text-stone-900">Your cart is empty</h2>
        <p className="text-xs text-stone-500 max-w-sm mx-auto mt-2 mb-6 leading-relaxed">
          Looks like you haven't added any fresh organic produce or pantry staples yet. Discover pure, farm-fresh goodness now.
        </p>
        <Link
          to="/products"
          className="px-6 py-3.5 rounded-2xl bg-rootly-forest text-white font-bold text-xs shadow-lift hover:bg-rootly-dark transition-all inline-block"
        >
          Explore Organic Catalogue
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto px-3.5 sm:px-6 lg:px-8 xl:px-10 py-5 sm:py-8 space-y-6 sm:space-y-8">
      <div>
        <h1 className="font-display font-black text-2xl sm:text-3xl text-stone-900">
          <span className="hidden sm:inline">Shopping Cart</span>
          <span className="sm:hidden">Cart</span> ({cart.item_count} {cart.item_count === 1 ? 'item' : 'items'})
        </h1>
        <p className="text-xs text-stone-500 mt-1">Review your organic items before moving to checkout</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Cart Item List */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Free delivery alert */}
          <div className="p-4 rounded-2xl bg-rootly-forest text-white">
            <div className="flex items-center justify-between text-xs font-semibold mb-2">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-rootly-sagePale" />
                {!isFreeDelivery && amountNeeded > 0 ? (
                  <span>
                    Add <strong className="text-rootly-sagePale">₹{amountNeeded}</strong> more for <strong>FREE Delivery!</strong>
                  </span>
                ) : (
                  <span className="text-emerald-300 font-bold flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-300" />
                    <span>FREE {isCourier ? 'Nationwide Courier' : 'Express'} Delivery unlocked!</span>
                  </span>
                )}
              </span>
              <span className="text-stone-300 font-mono text-xs">₹{effectiveFreeThreshold} goal</span>
            </div>
            <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
              <div
                className="bg-rootly-sagePale h-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.round((cart.subtotal / effectiveFreeThreshold) * 100))}%` }}
              />
            </div>
          </div>

          {/* Items */}
          <div className="space-y-3">
            {cart.items.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-2xl bg-white border border-stone-200 shadow-soft flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4">
                  <img
                    src={item.product?.primary_image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=300'}
                    alt={item.product?.name}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover border border-stone-100"
                  />
                  <div>
                    <Link
                      to={`/products/${item.product?.slug}`}
                      className="font-bold text-xs sm:text-sm text-stone-900 hover:text-rootly-forest"
                    >
                      {item.product?.name}
                    </Link>
                    <p className="text-[11px] text-stone-500 font-semibold">{item.variant?.unit}</p>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-xs sm:text-sm font-black text-stone-900">
                        ₹{item.variant?.price * item.quantity}
                      </span>
                      {item.variant?.mrp > item.variant?.price && (
                        <span className="text-[11px] text-stone-400 line-through">
                          ₹{item.variant?.mrp * item.quantity}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center rounded-xl bg-stone-100 border border-stone-200 overflow-hidden h-9">
                    <button
                      onClick={() => decrementItem(item.product_id, item.variant_id)}
                      className="px-2.5 h-full hover:bg-stone-200 active:scale-95 transition-all"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-3 text-xs font-bold min-w-[24px] text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => incrementItem(item.product_id, item.variant_id, item.variant?.stock || 999)}
                      className="px-2.5 h-full hover:bg-stone-200 active:scale-95 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={() => setItemQuantity(item.product_id, item.variant_id, 0)}
                    className="p-2 text-stone-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center pt-2">
            <Link to="/products" className="text-xs font-bold text-rootly-forest hover:underline">
              ← Continue Shopping
            </Link>
            <button
              onClick={clearCart}
              className="text-xs text-stone-400 hover:text-red-500 transition-colors"
            >
              Empty Cart
            </button>
          </div>
        </div>

        {/* Right Summary Column */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Delivery Destination Card */}
          <div className="p-4 rounded-3xl bg-white border border-stone-200 shadow-soft space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-stone-900 pb-2 border-b border-stone-100">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-rootly-forest" />
                <span>Delivery Destination</span>
              </span>
              <button
                type="button"
                onClick={openLocationModal}
                className="text-xs text-rootly-forest hover:underline font-bold"
              >
                Change
              </button>
            </div>
            <p className="text-xs font-semibold text-stone-800 leading-snug">
              {locationLabel}
            </p>
            <p className="text-[11px] text-stone-500 flex items-center gap-1">
              <span>{serviceHub}</span>
              <span>•</span>
              {!isServiceable ? (
                <span className="text-rose-700 font-bold flex items-center gap-0.5">
                  <AlertCircle className="w-3 h-3 text-rose-500" />
                  Unserviceable PIN
                </span>
              ) : deliveryMode === 'nationwide_courier' ? (
                <span className="text-indigo-800 font-bold flex items-center gap-0.5">
                  <Truck className="w-3 h-3 text-indigo-600" />
                  Courier Delivery ({estimatedDeliveryDays || '2–4 Business Days'})
                </span>
              ) : deliveryMinutes > 0 && deliveryMinutes <= 30 ? (
                <span className="text-emerald-700 font-bold flex items-center gap-0.5">
                  <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                  Express {deliveryMinutes} Mins
                </span>
              ) : (
                <span className="text-stone-600 font-medium">Standard Delivery (~{deliveryMinutes || 45} Mins)</span>
              )}
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-stone-200 shadow-card space-y-5">
            <h3 className="font-display font-bold text-base text-stone-900 pb-3 border-b border-stone-100">
              Bill Summary
            </h3>

            <div className="space-y-2 text-xs text-stone-600">
              <div className="flex justify-between">
                <span>Item Total (Selling Price)</span>
                <span className="font-bold text-stone-900">₹{cart.subtotal}</span>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <span>{isCourier ? 'Nationwide Courier Shipping' : 'Delivery Partner Fee'}</span>
                  {distanceKm !== null && distanceKm !== undefined && (
                    <span className="text-[10px] text-stone-400 block font-normal">
                      ~{distanceKm.toFixed(1)} km {matchedSlab ? `(${matchedSlab})` : ''}
                    </span>
                  )}
                </div>
                {computedDeliveryFee === 0 && isFreeDelivery ? (
                  <span className="font-bold text-emerald-700 uppercase">FREE</span>
                ) : (
                  <span className="font-bold text-stone-900">₹{computedDeliveryFee}</span>
                )}
              </div>
              <div className="border-t border-stone-100 pt-3 flex justify-between text-base font-black text-stone-900">
                <span>Total Amount</span>
                <span className="text-rootly-forest">₹{totalAmount}</span>
              </div>

              {/* Informational Savings Banner — NEVER subtracted from selling price! */}
              {cart.discount > 0 && (
                <div className="mt-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-between text-xs text-emerald-800">
                  <span className="font-medium flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Total MRP Savings:</span>
                  </span>
                  <strong className="font-bold text-emerald-700">₹{cart.discount} saved on MRP</strong>
                </div>
              )}
            </div>

            <div className="space-y-2.5 pt-1">
              {/* 1. Prominent WhatsApp Ordering CTA */}
              <button
                type="button"
                onClick={() => setIsWhatsAppModalOpen(true)}
                className="w-full py-4 px-4 rounded-2xl bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold text-sm shadow-lift flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <WhatsAppIcon className="w-5 h-5 text-white" />
                <span>Order via WhatsApp</span>
              </button>

              {/* 2. Standard Web Checkout */}
              <button
                type="button"
                onClick={handleCheckout}
                className="w-full py-3.5 px-4 rounded-2xl bg-rootly-forest hover:bg-rootly-dark text-white font-bold text-xs sm:text-sm shadow-sm flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <span>Proceed to Online Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <p className="text-[11px] text-center text-stone-500 pt-1">
                WhatsApp orders are confirmed instantly by our local store team.
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* WhatsApp Checkout Modal */}
      <WhatsAppCheckoutModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
      />
    </div>
  );
};

