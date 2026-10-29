import React from 'react';
import { useLocation } from 'react-router-dom';

export const PolicyPage: React.FC = () => {
  const { pathname } = useLocation();

  let title = 'Privacy Policy';
  let lastUpdated = 'October 2026';

  if (pathname.includes('shipping')) {
    title = 'Shipping & Delivery Policy';
  } else if (pathname.includes('returns')) {
    title = 'Returns & Refund Policy';
  } else if (pathname.includes('terms')) {
    title = 'Terms & Conditions';
  }

  return (
    <div className="max-w-4xl mx-auto px-2.5 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-6">
      <div className="border-b border-stone-200 pb-4">
        <h1 className="font-display font-black text-3xl text-stone-900">{title}</h1>
        <p className="text-xs text-stone-400 mt-1">Effective Date & Last Updated: {lastUpdated}</p>
      </div>

      <div className="prose prose-stone max-w-none text-xs sm:text-sm text-stone-600 leading-relaxed space-y-6">
        {pathname.includes('shipping') ? (
          <>
            <section className="space-y-2">
              <h3 className="font-bold text-stone-900 text-base">1. Express Quick-Commerce Delivery</h3>
              <p>Sri Adithya Organics operates localized micro-fulfillment hubs across Bengaluru and Tamil Nadu. Deliveries selected via Express Delivery are dispatched within 5 minutes of order packing and arrive in 15 to 30 minutes, subject to weather and traffic.</p>
            </section>
            <section className="space-y-2">
              <h3 className="font-bold text-stone-900 text-base">2. Scheduled Morning & Evening Slots</h3>
              <p>Morning harvest slots (7:00 AM - 9:30 AM) feature farm produce plucked the previous evening or daybreak. Evening slots operate from 5:30 PM to 8:00 PM.</p>
            </section>
            <section className="space-y-2">
              <h3 className="font-bold text-stone-900 text-base">3. Delivery Fees</h3>
              <p>All orders with subtotal ₹499 and above receive 100% Free Delivery. For orders below ₹499, a flat delivery partner charge of ₹39 is applicable.</p>
            </section>
          </>
        ) : pathname.includes('returns') ? (
          <>
            <section className="space-y-2">
              <h3 className="font-bold text-stone-900 text-base">1. No-Questions-Asked Freshness Guarantee</h3>
              <p>If any fresh organic vegetable, fruit, or grocery item arrives damaged, bruised, or below standard freshness, you can report it via WhatsApp or our in-app Customer Care within 24 hours of delivery.</p>
            </section>
            <section className="space-y-2">
              <h3 className="font-bold text-stone-900 text-base">2. Instant Refund Processing</h3>
              <p>Approved refunds are credited immediately to your Sri Adithya Organics account or processed back to your original payment method (UPI / Card) within 2-4 business days.</p>
            </section>
          </>
        ) : pathname.includes('terms') ? (
          <>
            <section className="space-y-2">
              <h3 className="font-bold text-stone-900 text-base">1. Acceptance of Terms</h3>
              <p>By accessing or purchasing from Sri Adithya Organics, you agree to comply with our terms of service, fair usage policies, and consumer standards under Indian Law.</p>
            </section>
            <section className="space-y-2">
              <h3 className="font-bold text-stone-900 text-base">2. Product Authenticity and Sourcing</h3>
              <p>We work exclusively with certified organic farmer collectives under Jaivik Bharat (FSSAI) and NPOP guidelines. Product descriptions, certifications, and origins are truthfully documented.</p>
            </section>
          </>
        ) : (
          <>
            <section className="space-y-2">
              <h3 className="font-bold text-stone-900 text-base">1. Information We Collect</h3>
              <p>We collect your name, delivery address, phone number, and order history strictly to fulfill your organic grocery orders and communicate delivery updates.</p>
            </section>
            <section className="space-y-2">
              <h3 className="font-bold text-stone-900 text-base">2. Data Security & Payment Information</h3>
              <p>We never sell your personal information. Payment transactions are processed via secure end-to-end encrypted gateways. Passwords are cryptographically salted and hashed.</p>
            </section>
          </>
        )}
      </div>
    </div>
  );
};

