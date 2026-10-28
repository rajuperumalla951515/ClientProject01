import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight, Sparkles, ShieldCheck, Truck, Leaf, Clock, ChevronRight,
  Flame, Award, Heart, CheckCircle2, RefreshCw, Droplet
} from 'lucide-react';
import { api } from '../services/api';
import { Category, Product } from '../types';
import { ProductCard, ProductCardSkeleton } from '../components/ProductCard';
import { getShortNavLabel } from '../utils/navigationLabels';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [bestSellers, setBestSellers] = useState<Product[]>([]);
  const [freshToday, setFreshToday] = useState<Product[]>([]);
  const [deals, setDeals] = useState<Product[]>([]);
  const [coldPressedOils, setColdPressedOils] = useState<Product[]>([]);
  const [essentials, setEssentials] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cats, best, fresh, dls, oils, ess] = await Promise.all([
          api.getCategories(),
          api.getProducts({ collection: 'best_sellers', limit: 8 }),
          api.getProducts({ collection: 'fresh_today', limit: 8 }),
          api.getProducts({ collection: 'deals', limit: 8 }),
          api.getProducts({ category_slug: 'cold-pressed-oils', limit: 4 }),
          api.getProducts({ limit: 8, sort: 'popular' }),
        ]);
        setCategories(cats);
        setBestSellers(best);
        setFreshToday(fresh);
        setDeals(dls);
        setColdPressedOils(oils);
        setEssentials(ess);
      } catch (err) {
        console.error('Failed to load homepage data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-12 sm:space-y-16 pb-16">
      
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-b from-rootly-creamDark/60 to-rootly-cream pt-4 pb-8 sm:py-16 border-b border-stone-200/60">
        <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 items-center">
            
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-4 sm:space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-rootly-forest text-rootly-sagePale text-[10px] sm:text-xs font-semibold shadow-sm max-w-full">
                <Sparkles className="w-3.5 h-3.5 text-rootly-sagePale shrink-0" />
                <span className="font-bold">Sri Adithya Organics</span>
                <span className="w-1 h-1 rounded-full bg-rootly-sagePale shrink-0" />
                <span className="text-white truncate">Traditional Wood-Pressed & Organics</span>
              </div>

              <h1 className="font-display font-black text-2xl xs:text-3xl sm:text-5xl lg:text-6xl text-stone-900 tracking-tight leading-[1.15]">
                Pure from Nature, <br />
                <span className="text-rootly-forest italic font-serif font-normal">Cold-Pressed with Heritage.</span>
              </h1>

              <p className="text-stone-600 text-xs sm:text-base max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Welcome to <strong>Sri Adithya Organics</strong>. Authentic wood-pressed edible oils (Marachekku), farm-fresh chemical-free produce, heirloom millets, unpolished pulses, and pure A2 cow ghee delivered fresh to your doorstep in minutes.
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5 sm:gap-4 pt-1">
                <Link
                  to="/products?category=cold-pressed-oils"
                  className="px-5 sm:px-6 py-3 sm:py-3.5 rounded-2xl bg-rootly-forest hover:bg-rootly-dark text-white font-bold text-xs sm:text-sm shadow-lift hover:shadow-card transition-all flex items-center gap-2 group min-h-[44px]"
                >
                  <Droplet className="w-4 h-4 text-amber-300" />
                  <span>Shop Wood-Pressed Oils</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link
                  to="/products"
                  className="px-5 sm:px-6 py-3 sm:py-3.5 rounded-2xl bg-white hover:bg-stone-50 text-stone-800 font-bold text-xs sm:text-sm border border-stone-200 shadow-sm transition-all min-h-[44px] flex items-center"
                >
                  Explore All Groceries
                </Link>
              </div>

              {/* Trust Badges */}
              <div className="pt-3 grid grid-cols-3 gap-2 sm:gap-3 max-w-md mx-auto lg:mx-0 text-left">
                <div className="p-2 sm:p-2.5 rounded-xl bg-white/80 border border-stone-200/80 shadow-soft">
                  <p className="text-[11px] sm:text-xs font-black text-rootly-forest">⚡ 15-30 Mins</p>
                  <p className="text-[9px] sm:text-[10px] text-stone-500 font-medium">Express delivery</p>
                </div>
                <div className="p-2 sm:p-2.5 rounded-xl bg-white/80 border border-stone-200/80 shadow-soft">
                  <p className="text-[11px] sm:text-xs font-black text-rootly-forest">🪵 Marachekku</p>
                  <p className="text-[9px] sm:text-[10px] text-stone-500 font-medium">Wood ghani pressed</p>
                </div>
                <div className="p-2 sm:p-2.5 rounded-xl bg-white/80 border border-stone-200/80 shadow-soft">
                  <p className="text-[11px] sm:text-xs font-black text-rootly-forest">🌱 100% Pure</p>
                  <p className="text-[9px] sm:text-[10px] text-stone-500 font-medium">Zero chemical</p>
                </div>
              </div>
            </div>

            {/* Right Hero Visual Banner */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md lg:max-w-none rounded-3xl overflow-hidden shadow-2xl border-4 border-white bg-white">
                <img
                  src="/products/sri-adithya-wood-pressed-groundnut-oil.jpg"
                  alt="Sri Adithya Wood-Pressed Cold-Pressed Groundnut Oil"
                  className="w-full h-80 sm:h-96 object-cover hover:scale-105 transition-transform duration-700"
                />
                
                {/* Overlay Floating Card */}
                <div className="absolute bottom-4 left-4 right-4 p-3.5 rounded-2xl bg-white/95 backdrop-blur-md border border-stone-200 shadow-lift flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-700">
                      <Droplet className="w-5 h-5 text-amber-600 fill-amber-500" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-stone-900">Flagship Wood-Pressed Groundnut Oil</p>
                      <p className="text-[11px] text-stone-500">100% Traditional Marachekku Extraction</p>
                    </div>
                  </div>
                  <Link
                    to="/products/wood-pressed-groundnut-oil"
                    className="p-2 rounded-xl bg-rootly-forest text-white hover:bg-rootly-dark transition-all"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 2. CATEGORY NAVIGATION CARDS */}
      <section className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8">
        <div className="flex items-baseline justify-between mb-4 sm:mb-6">
          <div>
            <h2 className="font-display font-extrabold text-xl sm:text-2xl text-stone-900 tracking-tight">
              Explore by Category
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">Pure staples, wood-pressed oils, and farm-fresh greens for healthy kitchens.</p>
          </div>
          <Link
            to="/products"
            className="text-xs font-bold text-rootly-forest hover:text-rootly-dark flex items-center gap-1 group"
          >
            <span>View All</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 sm:gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="p-3 rounded-2xl bg-white border border-stone-200/80 shadow-soft animate-pulse flex flex-col items-center">
                <div className="w-full aspect-square rounded-xl bg-stone-200 mb-2.5" />
                <div className="h-4 bg-stone-200 rounded w-3/4 mb-1" />
                <div className="h-3 bg-stone-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 sm:gap-4">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/products?category=${cat.slug}`}
                className="group p-2.5 sm:p-3 rounded-2xl bg-white border border-stone-200/90 shadow-soft hover:shadow-card hover:border-rootly-sage transition-all flex flex-col items-center text-center"
              >
                <div className="w-full aspect-square rounded-xl bg-rootly-cream overflow-hidden mb-2">
                  <img
                    src={cat.image_url || 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&q=80&w=400'}
                    alt={cat.name}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-300"
                  />
                </div>
                <h3 className="font-bold text-xs sm:text-sm text-stone-900 group-hover:text-rootly-forest transition-colors line-clamp-1">
                  <span className="hidden sm:inline">{cat.name}</span>
                  <span className="sm:hidden">{getShortNavLabel(cat.name)}</span>
                </h3>
                <p className="text-[10px] text-stone-400 mt-0.5">
                  {cat.product_count ? `${cat.product_count} items` : 'Explore →'}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* 3. SRI ADITHYA WOOD-PRESSED OILS SPOTLIGHT */}
      <section className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8">
        <div className="p-4 sm:p-8 rounded-3xl bg-gradient-to-r from-[#2B1E12] via-[#382618] to-[#1C2C1D] text-white shadow-xl relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6 pb-4 sm:pb-6 border-b border-white/10">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 text-[11px] font-bold uppercase tracking-wider mb-2">
                <Droplet className="w-3 h-3 fill-amber-300" />
                Sri Adithya Specialty
              </div>
              <h2 className="font-display font-black text-xl sm:text-3xl text-white">
                Traditional Wood-Pressed (Marachekku) Oils
              </h2>
              <p className="text-xs sm:text-sm text-amber-100/80 mt-1 max-w-xl">
                Extracted using ancestral Vaagai wood ghanis at temperatures strictly below 40°C. 100% unrefined, free of hexanes and chemical bleaches, with rich natural aroma and authentic flavor.
              </p>
            </div>
            <Link
              to="/products?category=cold-pressed-oils"
              className="px-4 sm:px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-extrabold text-xs shrink-0 self-start sm:self-center transition-all shadow-md min-h-[40px] flex items-center"
            >
              View All Traditional Oils →
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)
            ) : (
              coldPressedOils.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))
            )}
          </div>
        </div>
      </section>

      {/* 4. BEST SELLERS COLLECTION */}
      <section className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8">
        <div className="flex items-baseline justify-between mb-4 sm:mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-emerald-100 text-emerald-800">
                <Award className="w-4 h-4" />
              </span>
              <h2 className="font-display font-extrabold text-xl sm:text-2xl text-stone-900 tracking-tight">
                Customer Favorites & Best Sellers
              </h2>
            </div>
            <p className="text-xs text-stone-500 mt-1">Our most loved daily staples, unpolished dals, and fresh produce.</p>
          </div>
          <Link
            to="/products?collection=best_sellers"
            className="text-xs font-bold text-rootly-forest hover:text-rootly-dark flex items-center gap-1 group"
          >
            <span>View All</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-5">
          {isLoading ? (
            Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)
          ) : (
            bestSellers.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))
          )}
        </div>
      </section>

      {/* 5. FRESH TODAY (HARVESTED TODAY) */}
      <section className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8">
        <div className="p-4 sm:p-8 rounded-3xl bg-rootly-forest text-white shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6 pb-4 sm:pb-6 border-b border-white/10">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rootly-sage text-white text-[11px] font-bold uppercase tracking-wider mb-2">
                <Clock className="w-3 h-3" />
                Harvested This Morning
              </div>
              <h2 className="font-display font-black text-xl sm:text-3xl text-white">
                Fresh Today from the Soil
              </h2>
              <p className="text-xs sm:text-sm text-rootly-sagePale/90 mt-1 max-w-lg">
                Delivered from farm to your kitchen within hours of harvesting. Zero cold storage or chemical carbide ripening.
              </p>
            </div>
            <Link
              to="/products?collection=fresh_today"
              className="px-4 sm:px-5 py-2.5 rounded-xl bg-white text-rootly-forest hover:bg-rootly-cream font-bold text-xs shrink-0 self-start sm:self-center transition-all shadow-md min-h-[40px] flex items-center"
            >
              Shop Morning Harvest →
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)
            ) : (
              freshToday.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))
            )}
          </div>
        </div>
      </section>

      {/* 6. DEALS OF THE DAY */}
      <section className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8">
        <div className="flex items-baseline justify-between mb-4 sm:mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-amber-100 text-amber-800">
                <Flame className="w-4 h-4 text-amber-600" />
              </span>
              <h2 className="font-display font-extrabold text-xl sm:text-2xl text-stone-900 tracking-tight">
                Deals of the Day
              </h2>
            </div>
            <p className="text-xs text-stone-500 mt-1">Special harvest discounts on certified organic staples.</p>
          </div>
          <Link
            to="/products?collection=deals"
            className="text-xs font-bold text-rootly-forest hover:text-rootly-dark flex items-center gap-1 group"
          >
            <span>View All</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-5">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)
          ) : (
            deals.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))
          )}
        </div>
      </section>

      {/* 7. TRUST & SOURCING TRANSPARENCY SECTION */}
      <section className="bg-white border-y border-stone-200/90 py-10 sm:py-16">
        <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-rootly-forest">
              Sri Adithya Organics
            </span>
            <h2 className="font-display font-black text-2xl sm:text-4xl text-stone-900 mt-1 tracking-tight">
              Our Purity & Transparency Standard
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 mt-2 leading-relaxed">
              We never invent certifications or make unverified claims. Every product comes directly from trusted organic farmers and traditional wooden chekku mills.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-8">
            <div className="p-5 sm:p-6 rounded-2xl bg-[#FAF8F5] border border-stone-200/80 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-rootly-forest text-rootly-sagePale flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-rootly-sagePale" />
              </div>
              <h3 className="font-bold text-base text-stone-900">Verified Origin Traceability</h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Every bottle of wood-pressed oil, unpolished grain, and farm vegetable lists its exact cluster, processing mill, and verification standard.
              </p>
            </div>

            <div className="p-5 sm:p-6 rounded-2xl bg-[#FAF8F5] border border-stone-200/80 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-rootly-forest text-rootly-sagePale flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-rootly-sagePale" />
              </div>
              <h3 className="font-bold text-base text-stone-900">Zero Chemical Residue Lab Testing</h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Randomized batch testing for pesticide residues, heavy metals, and adulterants. Zero paraffin wax, zero mineral oil polish, and zero artificial sulfur.
              </p>
            </div>

            <div className="p-5 sm:p-6 rounded-2xl bg-[#FAF8F5] border border-stone-200/80 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-rootly-forest text-rootly-sagePale flex items-center justify-center">
                <RefreshCw className="w-6 h-6 text-rootly-sagePale" />
              </div>
              <h3 className="font-bold text-base text-stone-900">Eco-Conscious Packaging</h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                We use recyclable glass bottles and food-grade packaging for oils and ghee, and biodegradable vegetable wrapping rather than harmful multi-layer plastics.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 8. FARM TO HOME ESSENTIALS */}
      <section className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8">
        <div className="flex items-baseline justify-between mb-4 sm:mb-6">
          <div>
            <h2 className="font-display font-extrabold text-xl sm:text-2xl text-stone-900 tracking-tight">
              Pantry & Farm-to-Home Essentials
            </h2>
            <p className="text-xs text-stone-500 mt-1">Staples that nourish your family every single day.</p>
          </div>
          <Link
            to="/products"
            className="text-xs font-bold text-rootly-forest hover:text-rootly-dark flex items-center gap-1 group"
          >
            <span>View All</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-5">
          {isLoading ? (
            Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)
          ) : (
            essentials.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))
          )}
        </div>
      </section>

    </div>
  );
};

