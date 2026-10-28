import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  MapPin, Clock, CreditCard, ShieldCheck, CheckCircle2, Plus, Home,
  Briefcase, Building, ArrowRight, AlertCircle, Sparkles, Check
} from 'lucide-react';
import { api } from '../services/api';
import { Address, Order } from '../types';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { cart, refreshCart } = useCart();
  const { user } = useAuth();
  const { setSelectedAddress: setGlobalLocation } = useLocation();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string>('⚡ Express Delivery (15-30 Mins)');
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'netbanking' | 'cod'>('upi');
  const [orderNotes, setOrderNotes] = useState('');
  
  // New Address form modal
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [newLabel, setNewLabel] = useState('Home');
  const [newRecipient, setNewRecipient] = useState(user?.name || '');
  const [newPhone, setNewPhone] = useState(user?.phone || '');
  const [newStreet, setNewStreet] = useState('');
  const [newApartment, setNewApartment] = useState('');
  const [newLandmark, setNewLandmark] = useState('');
  const [newPostalCode, setNewPostalCode] = useState('560038');

  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Fetch addresses on mount
  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    const loadAddresses = async () => {
      try {
        const addrs = await api.getAddresses();
        setAddresses(addrs);
        if (addrs.length > 0) {
          const defaultAddr = addrs.find((a) => a.is_default) || addrs[0];
          setSelectedAddressId(defaultAddr.id);
        } else {
          setIsAddingAddress(true);
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadAddresses();
  }, [user, navigate]);

  const handleCreateAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await api.createAddress({
        label: newLabel,
        recipient_name: newRecipient,
        phone: newPhone,
        street: newStreet,
        apartment: newApartment,
        landmark: newLandmark,
        city: 'Bengaluru',
        state: 'Karnataka',
        postal_code: newPostalCode,
        is_default: addresses.length === 0,
      });
      setAddresses([...addresses, created]);
      setSelectedAddressId(created.id);
      setIsAddingAddress(false);
    } catch (err: any) {
      alert(err.message || 'Failed to save address.');
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      setCheckoutError('Please select or add a delivery address.');
      return;
    }
    if (cart.items.length === 0) {
      setCheckoutError('Your cart is empty.');
      return;
    }

    setCheckoutError(null);
    setIsPlacingOrder(true);

    try {
      const order = await api.checkout({
        address_id: selectedAddressId,
        delivery_slot: selectedSlot,
        payment_method: paymentMethod,
        notes: orderNotes.trim() || undefined,
        payment_id: paymentMethod !== 'cod' ? `PAY-TEST-${Date.now().toString().slice(-6)}` : undefined,
      });

      // Refresh cart to empty state
      await refreshCart();

      // Navigate to confirmation page
      navigate(`/order-confirmation/${order.id}`, { state: { order } });
    } catch (err: any) {
      setCheckoutError(err.message || 'Failed to place order. Please check stock and try again.');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  if (!user || cart.items.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <h2 className="font-display font-bold text-xl text-stone-900">Your cart is empty</h2>
        <p className="text-xs text-stone-500 mt-1 mb-6">Add organic staples to proceed to checkout.</p>
        <Link to="/products" className="px-5 py-2.5 rounded-xl bg-rootly-forest text-white text-xs font-bold">
          Shop Now
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
      <div>
        <h1 className="font-display font-black text-2xl sm:text-3xl text-stone-900 tracking-tight">
          Checkout & Express Delivery
        </h1>
        <p className="text-xs text-stone-500 mt-1">
          Complete your order with verified farm sourcing and secure test payment.
        </p>
      </div>

      {checkoutError && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs font-bold text-red-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{checkoutError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Steps */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* STEP 1: DELIVERY ADDRESS */}
          <section className="p-6 rounded-3xl bg-white border border-stone-200 shadow-soft space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-rootly-forest text-white text-xs font-bold flex items-center justify-center">
                  1
                </span>
                <h3 className="font-display font-bold text-base text-stone-900">Delivery Address</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddingAddress(!isAddingAddress)}
                className="text-xs font-bold text-rootly-forest hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isAddingAddress ? 'Cancel' : 'Add New Address'}</span>
              </button>
            </div>

            {/* Address List */}
            {!isAddingAddress && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {addresses.map((addr) => {
                  const isSelected = selectedAddressId === addr.id;
                  const Icon = addr.label.toLowerCase() === 'work' ? Briefcase : addr.label.toLowerCase() === 'home' ? Home : Building;
                  return (
                    <div
                      key={addr.id}
                      onClick={() => {
                        setSelectedAddressId(addr.id);
                        setGlobalLocation(addr);
                      }}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-rootly-forest bg-rootly-sageMist/30 shadow-sm'
                          : 'border-stone-200 hover:border-stone-300 bg-stone-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-900">
                          <Icon className="w-3.5 h-3.5 text-rootly-forest" />
                          {addr.label}
                        </span>
                        {isSelected && (
                          <span className="w-4 h-4 rounded-full bg-rootly-forest text-white flex items-center justify-center text-[10px]">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-stone-800">{addr.recipient_name} ({addr.phone})</p>
                      <p className="text-xs text-stone-500 mt-1 line-clamp-2">{addr.street}, {addr.apartment || ''}</p>
                      <p className="text-[11px] text-stone-400 font-mono mt-0.5">{addr.city} - {addr.postal_code}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add Address Form */}
            {isAddingAddress && (
              <form onSubmit={handleCreateAddress} className="space-y-3 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">Address Label</label>
                    <select
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-stone-200 text-xs font-semibold"
                    >
                      <option value="Home">Home</option>
                      <option value="Work">Work</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">Recipient Name</label>
                    <input
                      type="text"
                      required
                      value={newRecipient}
                      onChange={(e) => setNewRecipient(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-stone-200 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      required
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-stone-200 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">PIN Code (Bengaluru)</label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={newPostalCode}
                      onChange={(e) => setNewPostalCode(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-stone-200 text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Street Address & Landmark</label>
                  <input
                    type="text"
                    required
                    value={newStreet}
                    onChange={(e) => setNewStreet(e.target.value)}
                    placeholder="House/Flat No., Building Name, Street"
                    className="w-full p-2.5 rounded-xl border border-stone-200 text-xs"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingAddress(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-rootly-forest text-white text-xs font-bold shadow-md hover:bg-rootly-dark"
                  >
                    Save & Use Address
                  </button>
                </div>
              </form>
            )}
          </section>

          {/* STEP 2: DELIVERY SLOT */}
          <section className="p-6 rounded-3xl bg-white border border-stone-200 shadow-soft space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-stone-100">
              <span className="w-6 h-6 rounded-full bg-rootly-forest text-white text-xs font-bold flex items-center justify-center">
                2
              </span>
              <h3 className="font-display font-bold text-base text-stone-900">Choose Delivery Slot</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { slot: '⚡ Express Delivery (15-30 Mins)', tag: 'Fastest', sub: 'Packed from nearest hub' },
                { slot: '🌅 Morning Harvest (7:00 AM - 9:30 AM)', tag: 'Fresh Picks', sub: 'Tomorrow morning' },
                { slot: '🌇 Evening Slot (5:30 PM - 8:00 PM)', tag: 'Convenient', sub: 'Today evening' }
              ].map((s) => (
                <div
                  key={s.slot}
                  onClick={() => setSelectedSlot(s.slot)}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    selectedSlot === s.slot
                      ? 'border-rootly-forest bg-rootly-sageMist/30 shadow-sm'
                      : 'border-stone-200 hover:border-stone-300 bg-stone-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-rootly-forest bg-white px-2 py-0.5 rounded border border-rootly-sage/40">
                      {s.tag}
                    </span>
                    {selectedSlot === s.slot && (
                      <span className="w-3.5 h-3.5 rounded-full bg-rootly-forest text-white flex items-center justify-center text-[9px]">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-bold text-stone-900 mt-1">{s.slot}</p>
                  <p className="text-[10px] text-stone-500 mt-0.5">{s.sub}</p>
                </div>
              ))}
            </div>
          </section>

          {/* STEP 3: PAYMENT METHOD */}
          <section className="p-6 rounded-3xl bg-white border border-stone-200 shadow-soft space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-stone-100">
              <span className="w-6 h-6 rounded-full bg-rootly-forest text-white text-xs font-bold flex items-center justify-center">
                3
              </span>
              <h3 className="font-display font-bold text-base text-stone-900">Payment Method</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { id: 'upi', label: 'UPI / QR (GPay, PhonePe, Paytm)', desc: 'Instant test sandbox verification' },
                { id: 'card', label: 'Credit / Debit Card', desc: 'Visa, Mastercard, RuPay' },
                { id: 'netbanking', label: 'NetBanking', desc: 'All Indian major banks' },
                { id: 'cod', label: 'Cash on Delivery (COD)', desc: 'Pay with cash or QR at doorstep' },
              ].map((method) => (
                <div
                  key={method.id}
                  onClick={() => setPaymentMethod(method.id as any)}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    paymentMethod === method.id
                      ? 'border-rootly-forest bg-rootly-sageMist/30 shadow-sm'
                      : 'border-stone-200 hover:border-stone-300 bg-stone-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-stone-900">{method.label}</span>
                    {paymentMethod === method.id && (
                      <span className="w-3.5 h-3.5 rounded-full bg-rootly-forest text-white flex items-center justify-center text-[9px]">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-stone-500">{method.desc}</p>
                </div>
              ))}
            </div>

            {/* Note input */}
            <div className="pt-2">
              <label className="block text-xs font-bold text-stone-700 mb-1">Delivery Notes (Optional)</label>
              <input
                type="text"
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="e.g. Please ring bell twice or leave at door with security"
                className="w-full p-2.5 rounded-xl border border-stone-200 text-xs"
              />
            </div>
          </section>

        </div>

        {/* Right Summary */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-6 rounded-3xl bg-white border border-stone-200 shadow-card space-y-5 sticky top-28">
            <h3 className="font-display font-bold text-base text-stone-900 pb-3 border-b border-stone-100">
              Order Summary ({cart.item_count} items)
            </h3>

            {/* Mini Item List */}
            <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
              {cart.items.map((item) => (
                <div key={item.id} className="flex justify-between items-center text-xs">
                  <div className="truncate max-w-[170px]">
                    <span className="font-semibold text-stone-800">{item.product?.name}</span>
                    <span className="text-[10px] text-stone-400 block">{item.variant?.unit} × {item.quantity}</span>
                  </div>
                  <span className="font-bold text-stone-900">₹{item.variant?.price * item.quantity}</span>
                </div>
              ))}
            </div>

            {/* Bill breakdown */}
            <div className="space-y-2 text-xs text-stone-600 pt-3 border-t border-stone-100">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-semibold text-stone-900">₹{cart.subtotal}</span>
              </div>
              {cart.discount > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Organic Savings</span>
                  <span>-₹{cart.discount}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Delivery Partner Fee</span>
                {cart.delivery_fee === 0 ? (
                  <span className="font-bold text-emerald-700">FREE</span>
                ) : (
                  <span className="font-bold text-stone-900">₹{cart.delivery_fee}</span>
                )}
              </div>
              <div className="border-t border-stone-100 pt-3 flex justify-between text-base font-black text-stone-900">
                <span>Total Payable</span>
                <span className="text-rootly-forest">₹{cart.total_amount}</span>
              </div>
            </div>

            {/* Place Order CTA */}
            <button
              onClick={handlePlaceOrder}
              disabled={isPlacingOrder || !selectedAddressId}
              className="w-full py-4 px-4 rounded-2xl bg-rootly-forest hover:bg-rootly-dark text-white font-bold text-sm shadow-lift flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
            >
              {isPlacingOrder ? (
                <span>Verifying & Placing Order...</span>
              ) : (
                <>
                  <span>Place Order • ₹{cart.total_amount}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="flex items-center justify-center gap-2 text-[11px] text-stone-400 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>100% Safe & Organic Certified Guarantee</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

