import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  X, MapPin, Truck, Zap, AlertCircle, Loader2, CheckCircle2,
  Clock, ShieldCheck, ArrowRight, User as UserIcon, Phone, FileText, Navigation,
  Copy, Check, Sparkles
} from 'lucide-react';
import { WhatsAppIcon } from './WhatsAppIcon';
import { PhoneVerificationInput } from './PhoneVerificationInput';
import { validateAndNormalizeIndianPhone } from '../utils/phoneUtils';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import { useStoreSettings } from '../context/SettingsContext';
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
    isLocationConfirmed,
    openLocationModal,
    deliveryMinutes,
    serviceHub,
    deliveryFee: locationDeliveryFee,
    distanceKm: locationDistanceKm,
    matchedSlab: locationMatchedSlab,
    recalculateDeliveryFee,
  } = useLocation();

  // Form states
  const [customerName, setCustomerName] = useState(user?.name || '');
  const [customerPhone, setCustomerPhone] = useState(user?.phone || '');
  const [isPhoneVerified, setIsPhoneVerified] = useState(user?.is_phone_verified || false);
  const [deliverySlot, setDeliverySlot] = useState('Express Delivery (15-30 Mins)');
  const [paymentPreference, setPaymentPreference] = useState<'cod' | 'online'>('cod');
  const [specialInstructions, setSpecialInstructions] = useState('');
  
  // Submission & Result states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [orderResult, setOrderResult] = useState<WhatsAppOrderResponse | null>(null);
  const [copiedMessage, setCopiedMessage] = useState(false);

  // Sync user profile when available
  useEffect(() => {
    if (user) {
      if (!customerName) setCustomerName(user.name);
      if (!customerPhone && user.phone) setCustomerPhone(user.phone);
      if (user.is_phone_verified) setIsPhoneVerified(true);
    }
  }, [user]);

  // Reset states on open/close
  useEffect(() => {
    if (!isOpen) {
      setErrorMessage(null);
      setOrderResult(null);
      setIsSubmitting(false);
      setCopiedMessage(false);
    }
  }, [isOpen]);

  const handleCopyMessage = () => {
    if (orderResult?.whatsapp_message) {
      navigator.clipboard.writeText(orderResult.whatsapp_message);
      setCopiedMessage(true);
      setTimeout(() => setCopiedMessage(false), 2500);
    }
  };

  // Calculate pricing
  const { freeDeliveryThreshold, minOrderAmount, settings } = useStoreSettings();
  const localRadiusKm = settings?.delivery_radius_km || 60.0;
  const isDirect = Boolean(directItem);
  const itemsCount = isDirect ? 1 : cart.items.length;
  const subtotal = isDirect
    ? round2(directItem!.variant.price * directItem!.quantity)
    : cart.subtotal;
  
  // Real-time distance and delivery fee (Local radius up to 60 km, Nationwide Courier above)
  const distanceKm = selectedDeliveryAddress.distance_km ?? locationDistanceKm;
  const matchedSlab = selectedDeliveryAddress.matched_slab || locationMatchedSlab;
  const isCourier = selectedDeliveryAddress.delivery_mode === 'nationwide_courier' || (distanceKm !== null && distanceKm > localRadiusKm);
  const effectiveFreeThreshold = isCourier ? 999 : (freeDeliveryThreshold || 499);
  const isFreeDelivery = subtotal > 0 && subtotal >= effectiveFreeThreshold;
  const isServiceable = selectedDeliveryAddress.is_serviceable !== false;
  const rawDeliveryFee = isServiceable ? (selectedDeliveryAddress.delivery_fee ?? locationDeliveryFee ?? (isCourier ? 49.0 : 20.0)) : 0.0;
  // Apply free delivery only when genuine conditions are satisfied
  const deliveryFee = isFreeDelivery ? 0.0 : rawDeliveryFee;
  // FINAL RULE: Customer Amount = Product Selling Price (subtotal) + Delivery Fee.
  // Never subtract MRP savings!
  const totalAmount = round2(subtotal + deliveryFee);
  const mrpSavings = isDirect
    ? Math.max(0, round2(((directItem!.variant.mrp || directItem!.variant.price) - directItem!.variant.price) * directItem!.quantity))
    : (cart.discount || 0);

  // Sync delivery slot based on delivery mode
  useEffect(() => {
    if (isCourier) {
      setDeliverySlot('Standard Courier Dispatch (Within 24 Hours)');
    } else {
      setDeliverySlot('Express Delivery (15-30 Mins)');
    }
  }, [isCourier]);

  // Recalculate distance and fee when address or subtotal changes
  useEffect(() => {
    if (isOpen && selectedDeliveryAddress.postal_code) {
      recalculateDeliveryFee(subtotal);
    }
  }, [isOpen, selectedDeliveryAddress.postal_code, selectedDeliveryAddress.latitude, selectedDeliveryAddress.longitude, subtotal, recalculateDeliveryFee]);

  if (!isOpen) return null;

  function round2(num: number) {
    return Math.round(num * 100) / 100;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const name = customerName.trim();
    const phoneVal = validateAndNormalizeIndianPhone(customerPhone);

    if (!name) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    if (!phoneVal.isValid || !phoneVal.normalizedE164) {
      setErrorMessage(phoneVal.errorMessage || 'Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    if (!isLocationConfirmed || !selectedDeliveryAddress || !selectedDeliveryAddress.postal_code) {
      setErrorMessage('Please confirm your delivery address before proceeding.');
      onClose();
      openLocationModal();
      return;
    }

    if (selectedDeliveryAddress.is_serviceable === false) {
      setErrorMessage(selectedDeliveryAddress.message || 'Delivery is currently not available to this location. Please choose another delivery address.');
      return;
    }

    if (!isDirect && (!cart.items || cart.items.length === 0)) {
      setErrorMessage('Please select at least one organic product.');
      return;
    }

    if (subtotal < minOrderAmount) {
      setErrorMessage(`Minimum order amount is ₹${minOrderAmount}. Please add more items.`);
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: any = {
        customer_name: name,
        customer_phone: phoneVal.normalizedE164,
        delivery_slot: deliverySlot,
        payment_method: paymentPreference,
        notes: specialInstructions.trim() || undefined,
        delivery_address: {
          label: selectedDeliveryAddress.label || 'Home',
          recipient_name: name,
          phone: phoneVal.normalizedE164,
          house_number: selectedDeliveryAddress.house_number,
          street: selectedDeliveryAddress.street,
          apartment: selectedDeliveryAddress.apartment,
          locality: selectedDeliveryAddress.locality,
          landmark: selectedDeliveryAddress.landmark,
          city: selectedDeliveryAddress.city,
          district: selectedDeliveryAddress.district,
          state: selectedDeliveryAddress.state,
          country: selectedDeliveryAddress.country || 'India',
          postal_code: selectedDeliveryAddress.postal_code,
          latitude: selectedDeliveryAddress.latitude,
          longitude: selectedDeliveryAddress.longitude,
          accuracy_meters: selectedDeliveryAddress.accuracy_meters,
          formatted_address: selectedDeliveryAddress.formatted_address,
          delivery_mode: selectedDeliveryAddress.delivery_mode,
          courier_partner: selectedDeliveryAddress.courier_partner,
          courier_zone: selectedDeliveryAddress.courier_zone,
          estimated_delivery_days: selectedDeliveryAddress.estimated_delivery_days,
          parcel_weight_kg: selectedDeliveryAddress.parcel_weight_kg,
          is_confirmed: true,
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

              {/* Pre-filled Message Preview with Copy Action */}
              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 text-left space-y-2 max-w-md mx-auto">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-stone-600">
                    Pre-filled Message (Customer Voice)
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyMessage}
                    className="flex items-center gap-1 text-[11px] font-bold text-rootly-forest hover:text-emerald-800 transition-colors"
                  >
                    {copiedMessage ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Message</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="p-3 rounded-xl bg-white border border-stone-200/80 font-mono text-[11px] text-stone-800 max-h-36 overflow-y-auto whitespace-pre-wrap leading-relaxed select-all">
                  {orderResult.whatsapp_message}
                </div>
              </div>

              {/* Order Reference Box */}
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 text-left text-xs space-y-2 max-w-md mx-auto">
                <div className="flex justify-between font-semibold">
                  <span className="text-stone-500">Total Order Value:</span>
                  <span className="text-stone-900 font-black">₹{orderResult.order.total_amount}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span className="text-stone-500">Delivery Distance:</span>
                  <span className="text-stone-900 font-bold">
                    {orderResult.order.distance_km != null
                      ? `~${Number(orderResult.order.distance_km).toFixed(1)} km from Kothagudem Mill`
                      : (distanceKm != null ? `~${distanceKm.toFixed(1)} km` : 'Calculated via Mill Route')}
                  </span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span className="text-stone-500">Delivery Destination:</span>
                  <span className="text-stone-900 truncate max-w-[200px]">{locationLabel}</span>
                </div>
                {selectedDeliveryAddress.latitude && selectedDeliveryAddress.longitude ? (
                  <div className="flex justify-between font-semibold text-emerald-800">
                    <span className="text-stone-500">Customer Location:</span>
                    <a
                      href={`https://maps.google.com/?q=${selectedDeliveryAddress.latitude},${selectedDeliveryAddress.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[11px] flex items-center gap-1 text-emerald-700 hover:underline"
                    >
                      <Navigation className="w-3 h-3 text-rootly-forest" />
                      <span>{selectedDeliveryAddress.latitude.toFixed(4)}, {selectedDeliveryAddress.longitude.toFixed(4)} (Open Map ↗)</span>
                    </a>
                  </div>
                ) : (
                  <div className="flex justify-between font-semibold">
                    <span className="text-stone-500">Customer Location:</span>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedDeliveryAddress.formatted_address || locationLabel)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-stone-700 text-[11px] hover:underline"
                    >
                      Open Address in Maps ↗
                    </a>
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

                <div className="space-y-3">
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

                  <PhoneVerificationInput
                    value={customerPhone}
                    onChange={(val, isValid, verified) => {
                      setCustomerPhone(val);
                      setIsPhoneVerified(verified);
                    }}
                    isVerified={isPhoneVerified}
                    label="Customer WhatsApp Mobile Number"
                    required
                  />
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
                    {isLocationConfirmed ? 'Change Address' : 'Set Location'}
                  </button>
                </div>

                {!isLocationConfirmed && (
                  <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start justify-between gap-3">
                    <div className="space-y-0.5">
                      <p className="font-bold flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Delivery Location Not Confirmed</span>
                      </p>
                      <p className="text-[11px] text-amber-800">
                        Please confirm your doorstep address or pin on map to verify delivery availability and accurate road distance.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        openLocationModal();
                      }}
                      className="px-3 py-1.5 rounded-xl bg-amber-600 text-white text-[11px] font-bold shrink-0 hover:bg-amber-700 transition-colors shadow-xs"
                    >
                      Set Location
                    </button>
                  </div>
                )}

                {isLocationConfirmed && selectedDeliveryAddress.is_serviceable === false && (
                  <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-rose-800">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>Delivery Unavailable for this PIN code</span>
                    </div>
                    <p className="text-[11px] text-rose-700 leading-relaxed">
                      {selectedDeliveryAddress.message || 'Please check your PIN code or choose a valid delivery address within India.'}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        openLocationModal();
                      }}
                      className="text-[11px] font-bold text-rose-800 underline hover:text-rose-950 inline-block pt-0.5"
                    >
                      Select Different Address →
                    </button>
                  </div>
                )}

                <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-stone-900 leading-snug">{locationLabel}</p>
                    {isLocationConfirmed ? (
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full shrink-0">
                        Confirmed
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full shrink-0">
                        Unconfirmed
                      </span>
                    )}
                  </div>

                  {/* Distance / Courier Info */}
                  {isCourier ? (
                    <div className="flex items-center justify-between text-[11px] text-indigo-900 bg-indigo-50 border border-indigo-200/70 px-2.5 py-1.5 rounded-lg">
                      <div className="flex items-center gap-1.5 font-semibold">
                        <Truck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span>Nationwide Courier: {selectedDeliveryAddress.courier_partner || 'Delhivery'}</span>
                        {selectedDeliveryAddress.courier_zone && (
                          <span className="font-mono text-[10px] text-indigo-800 bg-indigo-100 px-1.5 py-0.5 rounded font-bold">
                            {selectedDeliveryAddress.courier_zone}
                          </span>
                        )}
                      </div>
                      <span className="font-bold text-indigo-950">
                        {selectedDeliveryAddress.estimated_delivery_days || '2–4 Business Days'}
                      </span>
                    </div>
                  ) : distanceKm !== null && distanceKm !== undefined ? (
                    <div className="flex items-center justify-between text-[11px] text-stone-700 bg-amber-50/80 border border-amber-200/70 px-2.5 py-1.5 rounded-lg">
                      <div className="flex items-center gap-1.5 font-semibold text-amber-900">
                        <Truck className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                        <span>Road Distance: ~{distanceKm.toFixed(1)} km from Kothagudem Mill</span>
                      </div>
                      {matchedSlab && (
                        <span className="font-mono text-[10px] text-amber-900 bg-amber-200/80 font-bold px-1.5 py-0.5 rounded">
                          {matchedSlab}
                        </span>
                      )}
                    </div>
                  ) : null}
                  
                  {selectedDeliveryAddress.latitude && selectedDeliveryAddress.longitude ? (
                    <div className="flex items-center justify-between text-[11px] text-emerald-800 font-semibold bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200/70">
                      <div className="flex items-center gap-1.5">
                        <Navigation className="w-3.5 h-3.5 text-rootly-forest shrink-0" />
                        <span>Live GPS Attached</span>
                        {selectedDeliveryAddress.accuracy_meters && (
                          <span className="text-stone-400 font-mono text-[10px]"> (±{Math.round(selectedDeliveryAddress.accuracy_meters)}m)</span>
                        )}
                      </div>
                      <a
                        href={`https://maps.google.com/?q=${selectedDeliveryAddress.latitude},${selectedDeliveryAddress.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] font-bold text-rootly-forest hover:underline"
                      >
                        View on Map ↗
                      </a>
                    </div>
                  ) : (
                    <div className="text-[11px] text-stone-500 bg-stone-100 px-2.5 py-1 rounded-lg">
                      <span>Delivery address location will be shared in WhatsApp message</span>
                    </div>
                  )}

                  <p className="text-[11px] text-stone-500 flex items-center gap-1">
                    <span>{serviceHub}</span>
                    <span>•</span>
                    {!selectedDeliveryAddress.is_serviceable ? (
                      <span className="text-rose-700 font-bold flex items-center gap-0.5">
                        <AlertCircle className="w-3 h-3 text-rose-500" />
                        Unserviceable PIN
                      </span>
                    ) : isCourier ? (
                      <span className="text-indigo-800 font-bold flex items-center gap-0.5">
                        <Truck className="w-3 h-3 text-indigo-600" />
                        Courier Delivery ({selectedDeliveryAddress.estimated_delivery_days || '2–4 Business Days'})
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 mb-1">
                      {isCourier ? 'Shipping / Dispatch Option' : 'Delivery Slot'}
                    </label>
                    <select
                      value={deliverySlot}
                      onChange={(e) => setDeliverySlot(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-stone-200 text-xs font-semibold bg-white"
                    >
                      {isCourier ? (
                        <>
                          <option value="Standard Courier Dispatch (Within 24 Hours)">Standard Courier Dispatch (Within 24 Hours)</option>
                          <option value="Same-Day Priority Dispatch">Same-Day Priority Dispatch (Before 2:00 PM)</option>
                        </>
                      ) : (
                        <>
                          <option value="Express Delivery (15-30 Mins)">Express Delivery (15-30 Mins)</option>
                          <option value="Morning Harvest Slot (7:00 AM - 9:30 AM)">Morning Harvest Slot (7:00 AM - 9:30 AM)</option>
                          <option value="Evening Slot (5:30 PM - 8:00 PM)">Evening Slot (5:30 PM - 8:00 PM)</option>
                          <option value="Tomorrow Morning (7:00 AM - 9:30 AM)">Tomorrow Morning (7:00 AM - 9:30 AM)</option>
                        </>
                      )}
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
                <div className="flex justify-between text-stone-600 items-center">
                  <div>
                    <span>{isCourier ? 'Nationwide Courier Shipping' : 'Delivery Partner Fee'}</span>
                    {isCourier ? (
                      <span className="text-[10px] text-indigo-700 block font-normal">
                        Partner: {selectedDeliveryAddress.courier_partner || 'Delhivery'} • {selectedDeliveryAddress.courier_zone || 'Zonal Rate'}
                      </span>
                    ) : distanceKm !== null && distanceKm !== undefined ? (
                      <span className="text-[10px] text-stone-400 block font-normal">
                        Road Distance: ~{distanceKm.toFixed(1)} km {matchedSlab ? `(${matchedSlab})` : ''}
                      </span>
                    ) : null}
                  </div>
                  {!isServiceable ? (
                    <span className="font-bold text-rose-600">Unavailable</span>
                  ) : deliveryFee === 0 && isFreeDelivery ? (
                    <span className="font-bold text-emerald-700 uppercase">
                      FREE (Orders over ₹{effectiveFreeThreshold})
                    </span>
                  ) : (
                    <span className="font-semibold text-stone-900">₹{deliveryFee}</span>
                  )}
                </div>
                <div className="pt-1.5 border-t border-stone-200 flex justify-between text-sm font-black text-stone-900">
                  <span>Final Total</span>
                  <span className="text-rootly-forest text-base">₹{totalAmount}</span>
                </div>

                {/* Informational Savings Badge — NEVER subtracted from selling price! */}
                {mrpSavings > 0 && (
                  <div className="mt-1 flex items-center justify-between text-[11px] text-emerald-800 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-100 font-medium">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span>Total MRP Savings:</span>
                    </span>
                    <strong className="font-bold text-emerald-700">₹{mrpSavings} saved on MRP</strong>
                  </div>
                )}
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
                {!isLocationConfirmed ? (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      openLocationModal();
                    }}
                    className="w-full py-4 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-lift flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                  >
                    <MapPin className="w-5 h-5 text-white" />
                    <span>Confirm Delivery Location to Continue</span>
                  </button>
                ) : selectedDeliveryAddress.is_serviceable === false ? (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      openLocationModal();
                    }}
                    className="w-full py-4 px-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-lift flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                  >
                    <AlertCircle className="w-5 h-5 text-white" />
                    <span>Location Outside Delivery Zone • Change</span>
                  </button>
                ) : (
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
                )}
              </div>

            </form>
          )}

        </div>
      </div>
    </div>
  );
};

