import React, { useEffect, useState } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { CheckCircle2, Package, MapPin, Clock, ArrowRight, ShieldCheck, Download, Check } from 'lucide-react';
import { api } from '../services/api';
import { Order } from '../types';

export const OrderConfirmationPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const [order, setOrder] = useState<Order | null>((location.state as any)?.order || null);
  const [isLoading, setIsLoading] = useState(!order);

  useEffect(() => {
    if (!order && id) {
      api.getOrder(Number(id)).then(setOrder).catch(console.error).finally(() => setIsLoading(false));
    }
  }, [id, order]);

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="w-12 h-12 rounded-full border-4 border-rootly-forest border-t-transparent animate-spin mx-auto mb-4" />
        <p className="text-xs font-semibold text-stone-500">Retrieving order details...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <h2 className="font-display font-bold text-xl text-stone-900">Order not found</h2>
        <Link to="/" className="px-5 py-2.5 rounded-xl bg-rootly-forest text-white text-xs font-bold mt-4 inline-block">
          Return Home
        </Link>
      </div>
    );
  }

  let addressData: any = {};
  try {
    addressData = JSON.parse(order.delivery_address_json);
  } catch (e) {
    addressData = {};
  }

  return (
    <div className="max-w-4xl mx-auto px-2.5 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6 sm:space-y-8">
      
      {/* Celebration Header */}
      <div className="p-5 sm:p-8 rounded-3xl bg-white border border-stone-200 shadow-card text-center space-y-3">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
          <CheckCircle2 className="w-9 h-9" />
        </div>
        <h1 className="font-display font-black text-2xl sm:text-3xl text-stone-900">
          Order Successfully Placed!
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 max-w-md mx-auto">
          Thank you for choosing certified organic food. Your harvest is being carefully packed at our Indiranagar fulfillment hub.
        </p>
        <div className="pt-2">
          <span className="inline-block px-4 py-1.5 rounded-full bg-stone-100 font-mono text-xs font-bold text-stone-800 border border-stone-200">
            Order #{order.order_number}
          </span>
        </div>
      </div>

      {/* Live Order Status Stepper */}
      <div className="p-4 sm:p-6 rounded-3xl bg-white border border-stone-200 shadow-soft overflow-x-auto">
        <h3 className="font-display font-bold text-sm text-stone-900 mb-5">Live Order Tracking</h3>
        <div className="grid grid-cols-4 gap-1.5 sm:gap-2 text-center relative min-w-[280px]">
          
          {/* Step 1: Confirmed */}
          <div className="flex flex-col items-center">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-rootly-forest text-white flex items-center justify-center text-xs font-bold z-10 shadow-sm">
              <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3]" />
            </div>
            <p className="text-[11px] sm:text-xs font-bold text-stone-900 mt-2 leading-tight">Order Confirmed</p>
            <p className="text-[9px] sm:text-[10px] text-stone-400 mt-0.5 line-clamp-1 sm:line-clamp-none">Inventory reserved</p>
          </div>

          {/* Step 2: Packed */}
          <div className="flex flex-col items-center">
            <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold z-10 shadow-sm ${
              ['packed', 'out_for_delivery', 'delivered'].includes(order.status)
                ? 'bg-rootly-forest text-white'
                : 'bg-stone-100 text-stone-400 border border-stone-200'
            }`}>
              {['packed', 'out_for_delivery', 'delivered'].includes(order.status) ? (
                <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3]" />
              ) : (
                '2'
              )}
            </div>
            <p className="text-[11px] sm:text-xs font-bold text-stone-900 mt-2 leading-tight">Packing at Hub</p>
            <p className="text-[9px] sm:text-[10px] text-stone-400 mt-0.5 line-clamp-1 sm:line-clamp-none">Temperature safe</p>
          </div>

          {/* Step 3: Out for Delivery */}
          <div className="flex flex-col items-center">
            <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold z-10 shadow-sm ${
              ['out_for_delivery', 'delivered'].includes(order.status)
                ? 'bg-rootly-forest text-white'
                : 'bg-stone-100 text-stone-400 border border-stone-200'
            }`}>
              {['out_for_delivery', 'delivered'].includes(order.status) ? (
                <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3]" />
              ) : (
                '3'
              )}
            </div>
            <p className="text-[11px] sm:text-xs font-bold text-stone-900 mt-2 leading-tight">Out for Delivery</p>
            <p className="text-[9px] sm:text-[10px] text-stone-400 mt-0.5 line-clamp-1 sm:line-clamp-none">On the way</p>
          </div>

          {/* Step 4: Delivered */}
          <div className="flex flex-col items-center">
            <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold z-10 shadow-sm ${
              order.status === 'delivered'
                ? 'bg-rootly-forest text-white'
                : 'bg-stone-100 text-stone-400 border border-stone-200'
            }`}>
              {order.status === 'delivered' ? (
                <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3]" />
              ) : (
                '4'
              )}
            </div>
            <p className="text-[11px] sm:text-xs font-bold text-stone-900 mt-2 leading-tight">Delivered</p>
            <p className="text-[9px] sm:text-[10px] text-stone-400 mt-0.5 line-clamp-1 sm:line-clamp-none">To your doorstep</p>
          </div>

        </div>
      </div>

      {/* Delivery & Items Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Delivery Details Card */}
        <div className="p-6 rounded-3xl bg-white border border-stone-200 shadow-soft space-y-4">
          <h4 className="font-display font-bold text-sm text-stone-900 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-rootly-forest" />
            <span>Delivery Destination</span>
          </h4>
          <div className="text-xs text-stone-600 space-y-1">
            <p className="font-bold text-stone-900">{addressData.recipient_name} ({addressData.phone})</p>
            <p>{addressData.street}, {addressData.apartment || ''}</p>
            <p>{addressData.city} - {addressData.postal_code}</p>
          </div>

          <div className="pt-2 border-t border-stone-100">
            <h5 className="font-bold text-xs text-stone-800 flex items-center gap-1.5 mb-1">
              <Clock className="w-3.5 h-3.5 text-rootly-forest" />
              <span>Chosen Slot</span>
            </h5>
            <p className="text-xs text-stone-600">{order.delivery_slot}</p>
          </div>
        </div>

        {/* Invoice Summary Card */}
        <div className="p-6 rounded-3xl bg-white border border-stone-200 shadow-soft space-y-3">
          <h4 className="font-display font-bold text-sm text-stone-900">Payment Breakdown</h4>
          <div className="space-y-1.5 text-xs text-stone-600">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-semibold text-stone-900">₹{order.subtotal}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Organic Discount</span>
                <span>-₹{order.discount}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Delivery Fee</span>
              <span>{order.delivery_fee === 0 ? 'FREE' : `₹${order.delivery_fee}`}</span>
            </div>
            <div className="border-t border-stone-100 pt-2 flex justify-between text-sm font-extrabold text-stone-900">
              <span>Total Paid</span>
              <span className="text-rootly-forest">₹{order.total_amount}</span>
            </div>
            <div className="pt-1 text-[11px] text-stone-400">
              Payment Method: <strong className="uppercase text-stone-700">{order.payment_method}</strong> ({order.payment_status})
            </div>
          </div>
        </div>

      </div>

      {/* Itemized Order List */}
      <div className="p-6 rounded-3xl bg-white border border-stone-200 shadow-soft">
        <h4 className="font-display font-bold text-sm text-stone-900 mb-4">Items in this Delivery</h4>
        <div className="divide-y divide-stone-100">
          {order.items.map((item) => (
            <div key={item.id} className="py-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <img
                  src={item.image_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=200'}
                  alt={item.product_name}
                  className="w-12 h-12 rounded-xl object-cover border border-stone-100"
                />
                <div>
                  <p className="font-bold text-stone-900">{item.product_name}</p>
                  <p className="text-[11px] text-stone-500">{item.variant_name} × {item.quantity}</p>
                </div>
              </div>
              <p className="font-extrabold text-stone-900">₹{item.total_price}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
        <Link
          to="/account?tab=orders"
          className="text-xs font-bold text-rootly-forest hover:underline"
        >
          ← View All My Orders
        </Link>
        <Link
          to="/products"
          className="px-6 py-3 rounded-2xl bg-rootly-forest text-white font-bold text-xs shadow-lift hover:bg-rootly-dark transition-all"
        >
          Continue Shopping
        </Link>
      </div>

    </div>
  );
};

