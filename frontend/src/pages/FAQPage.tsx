import React, { useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';

const FAQS = [
  {
    q: 'How fast is the delivery in Bengaluru?',
    a: 'Orders placed with Express Delivery are dispatched from our Indiranagar and Koramangala micro-fulfillment hubs and delivered within 15 to 30 minutes. You can also schedule morning (7:00 AM - 9:30 AM) or evening slots for freshly harvested vegetable baskets.'
  },
  {
    q: 'How do you verify that products are genuinely 100% organic?',
    a: 'Every grower collective on Sri Adithya Organics must hold verified certification under NPOP (National Programme for Organic Production), Jaivik Bharat (FSSAI), or PGS-India. Additionally, our traditional wood-pressed oils are extracted at temperatures below 40°C with zero chemical solvents or artificial bleaches.'
  },
  {
    q: 'Why are some vegetables not uniform in size or color?',
    a: 'Real organic produce grows naturally without chemical hormones or waxing agents. Variations in shape, natural earthy aromas, and small imperfections are authentic markers of living soil cultivation.'
  },
  {
    q: 'What is your Return and Refund policy if produce is not fresh?',
    a: 'We have a hassle-free, no-questions-asked refund policy. If any item is damaged or not up to standard upon arrival, simply report it via WhatsApp or our Customer Care within 24 hours for an instant wallet credit or UPI refund.'
  },
  {
    q: 'Is there a minimum order amount or free delivery threshold?',
    a: 'Our standard free delivery threshold is ₹499. For orders below ₹499, a nominal delivery partner fee of ₹39 applies. The minimum order value is ₹99.'
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept UPI (Google Pay, PhonePe, Paytm), Credit & Debit cards (Visa, Mastercard, RuPay), NetBanking across all major Indian banks, and Cash on Delivery (COD).'
  }
];

export const FAQPage: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="max-w-4xl mx-auto px-2.5 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-6 sm:space-y-8">
      <div className="text-center space-y-2 max-w-xl mx-auto">
        <span className="text-xs font-bold uppercase tracking-wider text-rootly-forest bg-rootly-sageMist px-3 py-1 rounded-full">
          Customer FAQs
        </span>
        <h1 className="font-display font-black text-3xl sm:text-4xl text-stone-900">
          Frequently Asked Questions
        </h1>
        <p className="text-xs text-stone-500">
          Everything you need to know about our organic sourcing, express delivery, and quality checks.
        </p>
      </div>

      <div className="space-y-3">
        {FAQS.map((faq, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={idx}
              className="rounded-2xl bg-white border border-stone-200/90 shadow-soft overflow-hidden transition-all"
            >
              <button
                onClick={() => setOpenIndex(isOpen ? null : idx)}
                className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 font-bold text-xs sm:text-sm text-stone-900 hover:text-rootly-forest transition-colors"
              >
                <span>{faq.q}</span>
                {isOpen ? (
                  <ChevronUp className="w-4 h-4 text-rootly-forest shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-stone-400 shrink-0" />
                )}
              </button>
              {isOpen && (
                <div className="px-5 pb-5 text-xs text-stone-600 leading-relaxed border-t border-stone-100 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

