import React, { useState } from 'react';
import { Mail, Phone, MapPin, Clock, MessageSquare, Send, CheckCircle2 } from 'lucide-react';

export const ContactPage: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="max-w-6xl mx-auto px-2.5 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 sm:space-y-12">
      
      {/* Title */}
      <div className="text-center space-y-2 max-w-xl mx-auto">
        <h1 className="font-display font-black text-3xl sm:text-4xl text-stone-900">
          We're Here to Help
        </h1>
        <p className="text-xs sm:text-sm text-stone-500">
          Questions about our organic produce, delivery hubs, or your recent orders? Our customer care team responds in minutes.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Contact Info Cards */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-6 rounded-3xl bg-white border border-stone-200/90 shadow-soft space-y-4">
            <h3 className="font-display font-bold text-base text-stone-900">Direct Support Channels</h3>
            
            <div className="flex items-start gap-3 text-xs text-stone-600">
              <div className="w-9 h-9 rounded-xl bg-rootly-sageMist flex items-center justify-center text-rootly-forest shrink-0">
                <Phone className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-stone-900">Phone Support</p>
                <p>+91 80 4912 3400 (Toll Free)</p>
                <p className="text-[10px] text-stone-400 mt-0.5">Mon - Sun, 6:00 AM - 11:00 PM</p>
              </div>
            </div>

            <div className="flex items-start gap-3 text-xs text-stone-600">
              <div className="w-9 h-9 rounded-xl bg-rootly-sageMist flex items-center justify-center text-rootly-forest shrink-0">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-stone-900">Email Enquiries</p>
                <p>care@sriadithyaorganics.com</p>
                <p className="text-[10px] text-stone-400 mt-0.5">Average reply in under 30 minutes</p>
              </div>
            </div>

            <div className="flex items-start gap-3 text-xs text-stone-600">
              <div className="w-9 h-9 rounded-xl bg-rootly-sageMist flex items-center justify-center text-rootly-forest shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-stone-900">Fulfillment Hubs</p>
                <p>Sri Adithya Organics, Bengaluru Hub & Coimbatore Farm Mill, Tamil Nadu</p>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-rootly-forest text-white shadow-card space-y-2">
            <h4 className="font-bold text-sm">Instant WhatsApp Assistance</h4>
            <p className="text-xs text-rootly-sagePale leading-relaxed">
              Have an issue with delivery or produce quality? Send a quick photo to our WhatsApp line at <strong>+91 98450 12345</strong> for instant credit or replacement.
            </p>
          </div>
        </div>

        {/* Message Form */}
        <div className="lg:col-span-7">
          <div className="p-8 rounded-3xl bg-white border border-stone-200 shadow-card">
            {submitted ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="font-display font-bold text-lg text-stone-900">Message Received!</h3>
                <p className="text-xs text-stone-500 max-w-sm mx-auto">
                  Thank you for reaching out, {name}. Our customer success team will contact you shortly via email.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="px-5 py-2 rounded-xl bg-stone-100 text-stone-700 text-xs font-bold hover:bg-stone-200"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h3 className="font-display font-bold text-lg text-stone-900">Send us a Message</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">Your Name</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Priyesh Nair"
                      className="w-full p-2.5 rounded-xl border border-stone-200 text-xs focus:outline-none focus:border-rootly-forest"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full p-2.5 rounded-xl border border-stone-200 text-xs focus:outline-none focus:border-rootly-forest"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Subject</label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Question about organic honey verification"
                    className="w-full p-2.5 rounded-xl border border-stone-200 text-xs focus:outline-none focus:border-rootly-forest"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Message</label>
                  <textarea
                    rows={4}
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="How can we help you?"
                    className="w-full p-2.5 rounded-xl border border-stone-200 text-xs focus:outline-none focus:border-rootly-forest"
                  />
                </div>

                <button
                  type="submit"
                  className="px-6 py-3 rounded-xl bg-rootly-forest hover:bg-rootly-dark text-white font-bold text-xs shadow-md transition-all active:scale-95 flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Message</span>
                </button>
              </form>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

