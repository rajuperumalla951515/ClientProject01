import React from 'react';
import { Link } from 'react-router-dom';
import { BrandLogo } from './BrandLogo';
import { ShieldCheck, Truck, RefreshCw, Leaf, Mail, Phone, MapPin, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#182C1E] text-stone-300 pt-16 pb-12 border-t border-stone-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Value Props Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pb-12 border-b border-stone-800 text-stone-200">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-rootly-forestLight/50 flex items-center justify-center text-rootly-sagePale shrink-0 border border-rootly-sage/30">
              <Leaf className="w-5 h-5 text-rootly-sagePale" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">100% Certified Farms</h4>
              <p className="text-xs text-stone-400 mt-0.5">Directly sourced from verified zero-chemical organic growers.</p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-rootly-forestLight/50 flex items-center justify-center text-rootly-sagePale shrink-0 border border-rootly-sage/30">
              <Truck className="w-5 h-5 text-rootly-sagePale" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">15-30 Min Delivery</h4>
              <p className="text-xs text-stone-400 mt-0.5">Quick-commerce delivery with temperature-safe packing.</p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-rootly-forestLight/50 flex items-center justify-center text-rootly-sagePale shrink-0 border border-rootly-sage/30">
              <ShieldCheck className="w-5 h-5 text-rootly-sagePale" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Full Sourcing Truth</h4>
              <p className="text-xs text-stone-400 mt-0.5">Every farm origin, harvest date, and lab check verified.</p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-rootly-forestLight/50 flex items-center justify-center text-rootly-sagePale shrink-0 border border-rootly-sage/30">
              <RefreshCw className="w-5 h-5 text-rootly-sagePale" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">No-Questions Return</h4>
              <p className="text-xs text-stone-400 mt-0.5">Instant refund or replacement if produce isn't completely fresh.</p>
            </div>
          </div>
        </div>

        {/* Footer Navigation Columns */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 py-12 border-b border-stone-800">
          
          {/* Brand & Mission */}
          <div className="md:col-span-2 pr-0 md:pr-6">
            <BrandLogo size="lg" inverted={true} />
            <p className="mt-4 text-xs text-stone-400 leading-relaxed max-w-sm">
              Sri Adithya Organics brings pure, traditional wood-pressed oils (Marachekku) and certified organic groceries directly from regenerative Indian family farms to your kitchen. 100% natural, chemical-free and freshly harvested.
            </p>
            <div className="mt-6 flex items-center gap-3 text-xs text-stone-400">
              <span className="px-2.5 py-1 rounded bg-stone-800/80 border border-stone-700 font-mono text-[11px]">
                FSSAI #11224334000891
              </span>
              <span className="px-2.5 py-1 rounded bg-stone-800/80 border border-stone-700 font-mono text-[11px]">
                NPOP / Jaivik Bharat
              </span>
            </div>
          </div>

          {/* Quick Categories */}
          <div>
            <h5 className="text-xs font-bold uppercase tracking-wider text-white mb-4">Categories</h5>
            <ul className="space-y-2.5 text-xs text-stone-400">
              <li><Link to="/products?category=fresh-vegetables" className="hover:text-white transition-colors">Fresh Vegetables</Link></li>
              <li><Link to="/products?category=fresh-fruits" className="hover:text-white transition-colors">Fresh Fruits</Link></li>
              <li><Link to="/products?category=rice-millets" className="hover:text-white transition-colors">Rice & Millets</Link></li>
              <li><Link to="/products?category=cold-pressed-oils" className="hover:text-white transition-colors">Cold-Pressed Oils</Link></li>
              <li><Link to="/products?category=dairy-alternatives" className="hover:text-white transition-colors">A2 Ghee & Dairy</Link></li>
              <li><Link to="/products?category=natural-sweeteners" className="hover:text-white transition-colors">Raw Honey & Gur</Link></li>
            </ul>
          </div>

          {/* Company & Support */}
          <div>
            <h5 className="text-xs font-bold uppercase tracking-wider text-white mb-4">Company</h5>
            <ul className="space-y-2.5 text-xs text-stone-400">
              <li><Link to="/about" className="hover:text-white transition-colors">About Us</Link></li>
              <li><Link to="/contact" className="hover:text-white transition-colors">Contact Support</Link></li>
              <li><Link to="/faq" className="hover:text-white transition-colors">Frequently Asked Questions</Link></li>
              <li><Link to="/shipping-policy" className="hover:text-white transition-colors">Shipping & Delivery</Link></li>
              <li><Link to="/returns-policy" className="hover:text-white transition-colors">Returns & Refunds</Link></li>
            </ul>
          </div>

          {/* Legal & Customer Care */}
          <div>
            <h5 className="text-xs font-bold uppercase tracking-wider text-white mb-4">Help & Legal</h5>
            <ul className="space-y-2.5 text-xs text-stone-400">
              <li><Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
              <li className="pt-2 text-stone-300 font-semibold flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-rootly-sagePale" />
                <span>+91 80 4912 3400</span>
              </li>
              <li className="text-stone-300 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-rootly-sagePale" />
                <span>care@sriadithyaorganics.com</span>
              </li>
              <li className="text-stone-400 text-[11px] leading-tight pt-1">
                Sri Adithya Organics Mill & Fulfilment Hub, Bengaluru & Tamil Nadu
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-500 gap-4">
          <p>© {new Date().getFullYear()} Sri Adithya Organics Private Limited. All rights reserved.</p>
          <p className="flex items-center gap-1 text-stone-400">
            Grown with respect for the soil <Heart className="w-3.5 h-3.5 text-rootly-earth fill-rootly-earth" /> in India.
          </p>
        </div>
      </div>
    </footer>
  );
};

