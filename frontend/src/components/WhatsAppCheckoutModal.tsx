import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  X, MapPin, Truck, Zap, AlertCircle, Loader2, CheckCircle2,
  Clock, ShieldCheck, ArrowRight, User as UserIcon, Phone, FileText, Navigation
} from 'lucide-react';
import { WhatsAppIcon } from './WhatsAppIcon';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import { api } from '../services/api';
import { Product, ProductVariant, WhatsAppOrderResponse } from '../types';

interface DirectOrderItem {
  product: Product;
  variant: ProductVariant;
  quantity: number;
}

interface WhatsAppCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  directItem?: DirectOrderItem | null;
}

export const WhatsAppCheckoutModal: React.FC<WhatsAppCheckoutModalProps> = ({
  isOpen,
  onClose,
  directItem = null,
}) => {
  const { cart, refreshCart } = useCart();
  const { user } = useAuth();
  const {
    selectedDeliveryAddress,
    locationLabel,
    openLocationModal,
    deliveryMinutes,
    serviceHub,
  } = useLocation();

  // Form states
  const [customerName, setCustomerName] = useState(user?.name || '');
  const [customerPhone, setCustomerPhone] = useState(user?.phone || '');
  const [deliverySlot, setDeliverySlot] = useState('Express Delivery (15-30 Mins)');
  const [paymentPreference, setPaymentPreference] = useState<'cod' | 'online'>('cod');
  const [specialInstructions, setSpecialInstructions] = useState('');
  
  // Submission & Result states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [orderResult, setOrderResult] = useState<WhatsAppOrderResponse | null>(null);

  // Sync user profile when available
  useEffect(() => {
    if (user) {
      if (!customerName) setCustomerName(user.name);
      if (!customerPhone && user.phone) setCustomerPhone(user.phone);
    }
  }, [user]);

  // Reset states on open/close
  useEffect(() => {
    if (!isOpen) {
      setErrorMessage(null);
      setOrderResult(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Calculate pricing
  const isDirect = Boolean(directItem);
  const itemsCount = isDirect ? 1 : cart.items.length;
  const subtotal = isDirect
    ? round2(directItem!.variant.price * directItem!.quantity)
    : cart.subtotal;
  const freeThreshold = 499.0;
  const standardFee = 39.0;
  const deliveryFee = subtotal >= freeThreshold ? 0.0 : standardFee;
  const totalAmount = round2(subtotal + deliveryFee);

  function round2(num: number) {
    return Math.round(num * 100) / 100;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const name = customerName.trim();
    const phone = customerPhone.trim();
    const cleanDigits = phone.replace(/\D/g, '');

    if (!name) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    if (cleanDigits.length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile phone number.');
      return;
    }

    if (!selectedDeliveryAddress || !selectedDeliveryAddress.postal_code) {
      setErrorMessage('Please confirm your delivery address before proceeding.');
      return;
    }

    if (!isDirect && (!cart.items || cart.items.length === 0)) {
      setErrorMessage('Please select at least one organic product.');
      return;
    }

    if (subtotal < 99.0) {
      setErrorMessage('Minimum order amount is ₹99. Please add more items.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: any = {
        customer_name: name,
        customer_phone: phone,
        delivery_slot: deliverySlot,
        payment_method: paymentPreference,
        notes: specialInstructions.trim() || undefined,
        delivery_address: {
          label: selectedDeliveryAddress.label || 'Home',
          recipient_name: name,
          phone: phone,
          house_number: selectedDeliveryAddress.house_number,
          street: selectedDeliveryAddress.street,
          apartment: selectedDeliveryAddress.apartment,
          locality: selectedDeliveryAddress.locality,
          landmark: selectedDeliveryAddress.landmark,
          city: selectedDeliveryAddress.city,
          state: selectedDeliveryAddress.state,
          postal_code: selectedDeliveryAddress.postal_code,
          latitude: selectedDeliveryAddress.latitude,
          longitude: selectedDeliveryAddress.longitude,
          accuracy_meters: selectedDeliveryAddress.accuracy_meters,
          formatted_address: selectedDeliveryAddress.formatted_address,
        },
        idempotency_key: `${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      };

      if (selectedDeliveryAddress.id && selectedDeliveryAddress.source === 'saved_address') {
        payload.address_id = selectedDeliveryAddress.id;
      }

      if (isDirect && directItem) {
        payload.items = [
          {
            product_id: directItem.product.id,
            variant_id: directItem.variant.id,
            quantity: directItem.quantity,
          },
        ];
      } else if (cart.items && cart.items.length > 0) {
        payload.items = cart.items.map((item) => ({
          product_id: item.product_id || item.product?.id,
          variant_id: item.variant_id || item.variant?.id,
          quantity: item.quantity,
        }));
      }

      const res = await api.createWhatsAppOrder(payload);
      setOrderResult(res);

      // Attempt to launch WhatsApp immediately in new tab
      if (res.whatsapp_url) {
        window.open(res.whatsapp_url, '_blank', 'noopener,noreferrer');
      }

      // If cart order, clear cart
      if (!isDirect) {
        await refreshCart();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to initialize WhatsApp order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div onClick={onClose} className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm transition-opacity" />

      {/* Modal Container */}
      <div className="flex min-h-full items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="relative w-full sm:max-w-xl rounded-t-3xl sm:rounded-3xl bg-white p-5 sm:p-6 shadow-2xl border border-stone-200 max-h-[92vh] flex flex-col animate-fadeIn">
          
          {/* Header */}
          <div className="flex items-center justify-between pb-3.5 border-b border-stone-100 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-[#25D366] text-white flex items-center justify-center shadow-md shrink-0">
                <WhatsAppIcon className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                    Direct WhatsApp Checkout
                  </span>
                </div>
                <h3 className="font-display font-black text-lg sm:text-xl text-stone-900 mt-0.5">
                  Order via WhatsApp
                </h3>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Success Screen once Order is generated */}
          {orderResult ? (
            <div className="py-6 space-y-5 text-center flex-1 overflow-y-auto">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div>
                <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 font-mono text-xs font-bold inline-block border border-amber-200 mb-2">
                  Status: Pending WhatsApp Confirmation
                </span>
                <h4 className="font-display font-black text-xl text-stone-900">
                  Order #{orderResult.order.order_number} Created!
                </h4>
                <p className="text-xs sm:text-sm text-stone-600 mt-1 max-w-sm mx-auto leading-relaxed">
                  Your order has been recorded in our store system. A pre-filled WhatsApp message is ready with your exact items and delivery address.
                </p>
              </div>

              {/* Prominent Action Button to Open WhatsApp */}
              <div className="space-y-2.5 max-w-md mx-auto pt-2">
                <a
                  href={orderResult.whatsapp_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-4 px-5 rounded-2xl bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold text-sm shadow-lift flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <WhatsAppIcon className="w-5 h-5" />
                  <span>Open WhatsApp to Confirm Order</span>
                </a>

                <p className="text-[11px] text-stone-500">
                  Your order will be confirmed by our team on WhatsApp.
                </p>
              </div>

              {/* Order Reference Box */}
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 text-left text-xs space-y-2 max-w-md mx-auto">
                <div className="flex justify-between font-semibold">
                  <span className="text-stone-500">Total Order Value:</span>
                  <span className="text-stone-900 font-black">₹{orderResult.order.total_amount}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span className="text-stone-500">Delivery Destination:</span>
                  <span className="text-stone-900 truncate max-w-[200px]">{locationLabel}</span>
                </div>
                {selectedDeliveryAddress.latitude && selectedDeliveryAddress.longitude && (
                  <div className="flex justify-between font-semibold text-emerald-800">
                    <span className="text-stone-500">Live GPS Location:</span>
                    <span className="font-mono text-[11px] flex items-center gap-1 text-emerald-700">
                      <Navigation className="w-3 h-3 text-rootly-forest" />
                      <span>{selectedDeliveryAddress.latitude.toFixed(4)}, {selectedDeliveryAddress.longitude.toFixed(4)}</span>
                    </span>
                  </div>
                )}
                <div className="flex justify-between font-semibold">
                  <span className="text-stone-500">Payment:</span>
                  <span className="text-stone-900 capitalize">{orderResult.order.payment_method.replace('_', ' ')}</span>
                </div>
              </div>

              {/* Done & View Order link */}
              <div className="flex items-center justify-center gap-4 pt-2">
                <Link
                  to={`/order-confirmation/${orderResult.order.id}`}
                  onClick={onClose}
                  className="text-xs font-bold text-rootly-forest hover:underline"
                >
                  View Order Status Tracking →
                </Link>
                <span className="text-stone-300">•</span>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-xs font-semibold text-stone-500 hover:text-stone-800"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            /* Checkout Form */
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-3 space-y-4 pr-1">
              
              {errorMessage && (
                <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* 1. Review Items Summary */}
              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/90 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-stone-900 pb-1.5 border-b border-stone-200">
                  <span>Selected Products ({itemsCount} items)</span>
                  <span className="text-rootly-forest font-black">₹{subtotal}</span>
                </div>

                <div className="max-h-28 overflow-y-auto space-y-1.5 pr-1">
                  {isDirect && directItem ? (
                    <div className="flex items-center justify-between text-xs text-stone-700 py-0.5">
                      <span className="truncate max-w-[240px] font-medium">
                        {directItem.product.name} ({directItem.variant.unit}) × {directItem.quantity}
                      </span>
                      <span className="font-bold text-stone-900">
                        ₹{round2(directItem.variant.price * directItem.quantity)}
                      </span>
                    </div>
                  ) : (
                    cart.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between text-xs text-stone-700 py-0.5">
                        <span className="truncate max-w-[240px] font-medium">
                          {item.product?.name} ({item.variant?.unit}) × {item.quantity}
                        </span>
                        <span className="font-bold text-stone-900">
                          ₹{round2(item.variant?.price * item.quantity)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* 2. Customer Information */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                  <UserIcon className="w-3.5 h-3.5 text-rootly-forest" />
                  <span>Customer Contact Details</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 mb-1">
                      Your Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. Arjun Sharma"
                      className="w-full p-2.5 rounded-xl border border-stone-200 text-xs font-semibold focus:outline-none focus:border-rootly-forest"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 mb-1">
                      WhatsApp Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="10-digit mobile (e.g. 9876543210)"
                      className="w-full p-2.5 rounded-xl border border-stone-200 text-xs font-semibold focus:outline-none focus:border-rootly-forest"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Delivery Destination & Slot */}
              <div className="space-y-2.5 pt-2 border-t border-stone-100">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-rootly-forest" />
                    <span>Delivery Location</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      openLocationModal();
                    }}
                    className="text-xs font-bold text-rootly-forest hover:underline"
                  >
                    Change Address
                  </button>
                </div>

                <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200 text-xs space-y-1.5">
                  <p className="font-bold text-stone-900 leading-snug">{locationLabel}</p>
                  
                  {selectedDeliveryAddress.latitude && selectedDeliveryAddress.longitude && (
                    <div className="inline-flex items-center gap-1.5 text-[11px] text-emerald-800 font-semibold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/70">
                      <Navigation className="w-3.5 h-3.5 text-rootly-forest shrink-0" />
                      <span>Live GPS Coordinates Attached to Order</span>
                      {selectedDeliveryAddress.accuracy_meters && (
                        <span className="text-stone-400 font-mono text-[10px]"> (±{Math.round(selectedDeliveryAddress.accuracy_meters)}m)</span>
                      )}
                    </div>
                  )}

                  <p className="text-[11px] text-stone-500 flex items-center gap-1">
                    <span>{serviceHub}</span>
                    <span>•</span>
                    {deliveryMinutes <= 30 ? (
                      <span className="text-emerald-700 font-bold flex items-center gap-0.5">
                        <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                        Express {deliveryMinutes} Mins
                      </span>
                    ) : (
                      <span className="text-stone-600 font-medium">Pan-India Courier (2-3 Days)</span>
                    )}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 mb-1">
                      Delivery Slot
                    </label>
                    <select
                      value={deliverySlot}
                      onChange={(e) => setDeliverySlot(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-stone-200 text-xs font-semibold bg-white"
                    >
                      <option value="Express Delivery (15-30 Mins)">Express Delivery (15-30 Mins)</option>
                      <option value="Morning Harvest Slot (7:00 AM - 9:30 AM)">Morning Harvest Slot (7:00 AM - 9:30 AM)</option>
                      <option value="Evening Slot (5:30 PM - 8:00 PM)">Evening Slot (5:30 PM - 8:00 PM)</option>
                      <option value="Tomorrow Morning (7:00 AM - 9:30 AM)">Tomorrow Morning (7:00 AM - 9:30 AM)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 mb-1">
                      Delivery Instructions (Optional)
                    </label>
                    <input
                      type="text"
                      value={specialInstructions}
                      onChange={(e) => setSpecialInstructions(e.target.value)}
                      placeholder="e.g. Leave at door / ring bell"
                      className="w-full p-2.5 rounded-xl border border-stone-200 text-xs font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Payment Preference */}
              <div className="space-y-2 pt-2 border-t border-stone-100">
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700">
                  Payment Preference
                </h4>

                <div className="grid grid-cols-2 gap-2.5">
                  <label
                    onClick={() => setPaymentPreference('cod')}
                    className={`p-3 rounded-2xl border cursor-pointer text-left transition-all ${
                      paymentPreference === 'cod'
                        ? 'border-rootly-forest bg-rootly-sageMist/30 shadow-sm'
                        : 'border-stone-200 bg-stone-50 hover:bg-stone-100/60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-stone-900">Cash on Delivery</span>
                      <input
                        type="radio"
                        name="payment_pref"
                        checked={paymentPreference === 'cod'}
                        onChange={() => setPaymentPreference('cod')}
                        className="accent-rootly-forest"
                      />
                    </div>
                    <p className="text-[10px] text-stone-500">Pay cash/UPI at delivery</p>
                  </label>

                  <label
                    onClick={() => setPaymentPreference('online')}
                    className={`p-3 rounded-2xl border cursor-pointer text-left transition-all ${
                      paymentPreference === 'online'
                        ? 'border-rootly-forest bg-rootly-sageMist/30 shadow-sm'
                        : 'border-stone-200 bg-stone-50 hover:bg-stone-100/60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-stone-900">Online / UPI</span>
                      <input
                        type="radio"
                        name="payment_pref"
                        checked={paymentPreference === 'online'}
                        onChange={() => setPaymentPreference('online')}
                        className="accent-rootly-forest"
                      />
                    </div>
                    <p className="text-[10px] text-stone-500">Pay via UPI QR in WhatsApp chat</p>
                  </label>
                </div>
              </div>

              {/* 5. Bill Summary Breakdown */}
              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 text-xs space-y-1.5">
                <div className="flex justify-between text-stone-600">
                  <span>Subtotal</span>
                  <span className="font-semibold text-stone-900">₹{subtotal}</span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Delivery Partner Fee</span>
                  {deliveryFee === 0 ? (
                    <span className="font-bold text-emerald-700 uppercase">FREE</span>
                  ) : (
                    <span className="font-semibold text-stone-900">₹{deliveryFee}</span>
                  )}
                </div>
                <div className="pt-1.5 border-t border-stone-200 flex justify-between text-sm font-black text-stone-900">
                  <span>Final Total</span>
                  <span className="text-rootly-forest text-base">₹{totalAmount}</span>
                </div>
              </div>

              {/* Informational Message */}
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200/80 text-[11px] text-emerald-900 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <span>
                  <strong>Your order will be confirmed by our team on WhatsApp.</strong> An official order reference is created in our system, and you will review the message before sending it on WhatsApp.
                </span>
              </div>

              {/* Submit CTA */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 px-4 rounded-2xl bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold text-sm shadow-lift flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creating Order Reference...</span>
                    </>
                  ) : (
                    <>
                      <WhatsAppIcon className="w-5 h-5 text-white" />
                      <span>Continue to WhatsApp</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

            </form>
          )}

        </div>
      </div>
    </div>
  );
};

