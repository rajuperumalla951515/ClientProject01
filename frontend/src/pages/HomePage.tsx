import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight, Sparkles, ShieldCheck, Truck, Leaf, Clock, ChevronRight,
  Flame, Award, Heart, CheckCircle2, RefreshCw, Droplet, Zap
} from 'lucide-react';
import { api } from '../services/api';
import { Category, Product } from '../types';
import { ProductCard, ProductCardSkeleton } from '../components/ProductCard';
import { MainHeroBannerCarousel } from '../components/MainHeroBannerCarousel';
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
          api.getProducts({ collection: 'best_sellers', limit: 12 }),
          api.getProducts({ collection: 'fresh_today', limit: 12 }),
          api.getProducts({ collection: 'deals', limit: 12 }),
          api.getProducts({ category_slug: 'cold-pressed-oils', limit: 6 }),
          api.getProducts({ limit: 12, sort: 'popular' }),
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
    <div className="w-full space-y-10 sm:space-y-14 pb-16 overflow-x-hidden">
      
      {/* 1. HERO SECTION - Premium Animated Main Banner Carousel & Trust Strip */}
      <section className="w-full max-w-[1600px] mx-auto px-3.5 sm:px-6 lg:px-8 xl:px-10 pt-3 sm:pt-6 space-y-4 sm:space-y-6">
        {/* Animated Hero Carousel with Subtle Ken Burns Zoom & One-Slide Transitions */}
        <MainHeroBannerCarousel />

        {/* Organic Trust Pillars Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
          <div className="p-3 sm:p-3.5 rounded-2xl bg-white border border-[#E6E7DD] shadow-soft flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-700 shrink-0">
              <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 fill-amber-500" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-black text-[#1B3B22] truncate">15–30 Mins Express</p>
              <p className="text-[10px] sm:text-[11px] text-stone-500 truncate">Local Mill delivery & Pan-India Courier</p>
            </div>
          </div>

          <div className="p-3 sm:p-3.5 rounded-2xl bg-white border border-[#E6E7DD] shadow-soft flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-[#1B3B22] shrink-0">
              <Award className="w-4 h-4 sm:w-5 sm:h-5 text-[#1B3B22]" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-black text-[#1B3B22] truncate">Ancestral Marachekku</p>
              <p className="text-[10px] sm:text-[11px] text-stone-500 truncate">Wood ghani pressed below 40°C</p>
            </div>
          </div>

          <div className="p-3 sm:p-3.5 rounded-2xl bg-white border border-[#E6E7DD] shadow-soft flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-700 shrink-0">
              <Leaf className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-black text-[#1B3B22] truncate">100% Pure & Unrefined</p>
              <p className="text-[10px] sm:text-[11px] text-stone-500 truncate">Zero hexanes & zero chemicals</p>
            </div>
          </div>

          <div className="p-3 sm:p-3.5 rounded-2xl bg-white border border-[#E6E7DD] shadow-soft flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-700 shrink-0">
              <Droplet className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 fill-amber-500" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-black text-[#1B3B22] truncate">Bottled at Source</p>
              <p className="text-[10px] sm:text-[11px] text-stone-500 truncate">Fresh batch from Kothagudem Mill</p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. CATEGORY NAVIGATION TILES - High-Density Layout */}
      <section className="w-full max-w-[1600px] mx-auto px-3.5 sm:px-6 lg:px-8 xl:px-10">
        <div className="flex items-baseline justify-between mb-3.5 sm:mb-5">
          <div>
            <h2 className="font-display font-black text-xl sm:text-2xl text-stone-900 tracking-tight">
              Explore by Category
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">Wood-pressed oils, unpolished grains, pure staples, and farm-fresh produce.</p>
          </div>
          <Link
            to="/products"
            className="text-xs font-bold text-[#244B37] hover:underline flex items-center gap-1 group"
          >
            <span>View All</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2.5 sm:gap-3.5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="p-2.5 rounded-2xl bg-white border border-[#E6E7DD] shadow-soft animate-pulse flex flex-col items-center">
                <div className="w-full aspect-square rounded-xl bg-stone-200 mb-2" />
                <div className="h-3 bg-stone-200 rounded w-3/4 mb-1" />
                <div className="h-2.5 bg-stone-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2.5 sm:gap-3.5">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/products?category=${cat.slug}`}
                className="group p-2 sm:p-2.5 rounded-2xl bg-white border border-[#E6E7DD] hover:border-[#496B45]/60 shadow-soft hover:shadow-card transition-all flex flex-col items-center text-center"
              >
                <div className="w-full aspect-square rounded-xl bg-[#FAF8F5] overflow-hidden mb-2">
                  <img
                    src={cat.image_url || 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&q=80&w=400'}
                    alt={cat.name}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-300"
                  />
                </div>
                <h3 className="font-bold text-[11px] sm:text-xs text-stone-900 group-hover:text-[#244B37] transition-colors line-clamp-1">
                  <span className="hidden sm:inline">{cat.name}</span>
                  <span className="sm:hidden">{getShortNavLabel(cat.name)}</span>
                </h3>
                <p className="text-[9px] text-stone-400 mt-0.5">
                  {cat.product_count ? `${cat.product_count} items` : 'Explore →'}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* 3. SRI ADITHYA WOOD-PRESSED OILS SPOTLIGHT - Full Screen Banner */}
      <section className="w-full max-w-[1600px] mx-auto px-3.5 sm:px-6 lg:px-8 xl:px-10">
        <div className="p-4 sm:p-7 rounded-3xl bg-gradient-to-r from-[#241A10] via-[#332214] to-[#172718] text-white shadow-xl relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6 pb-4 sm:pb-5 border-b border-white/10">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider mb-1.5">
                <Droplet className="w-3 h-3 fill-amber-300" />
                Sri Adithya Specialty
              </div>
              <h2 className="font-display font-black text-xl sm:text-3xl text-white">
                Traditional Wood-Pressed (Marachekku) Oils
              </h2>
              <p className="text-xs sm:text-sm text-amber-100/80 mt-1 max-w-2xl">
                Extracted using ancestral Vaagai wood ghanis strictly below 40°C. 100% unrefined, zero hexanes, zero chemical bleaches, with rich natural aroma.
              </p>
            </div>
            <Link
              to="/products?category=cold-pressed-oils"
              className="px-4 sm:px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-extrabold text-xs shrink-0 self-start sm:self-center transition-all shadow-md min-h-[40px] flex items-center"
            >
              View All Traditional Oils →
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => <ProductCardSkeleton key={i} />)
            ) : (
              coldPressedOils.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))
            )}
          </div>
        </div>
      </section>

      {/* 4. BEST SELLERS COLLECTION */}
      <section className="w-full max-w-[1600px] mx-auto px-3.5 sm:px-6 lg:px-8 xl:px-10">
        <div className="flex items-baseline justify-between mb-3.5 sm:mb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-emerald-100 text-[#244B37]">
                <Award className="w-4 h-4" />
              </span>
              <h2 className="font-display font-black text-xl sm:text-2xl text-stone-900 tracking-tight">
                Customer Favorites & Best Sellers
              </h2>
            </div>
            <p className="text-xs text-stone-500 mt-1">Our most loved daily staples, unpolished dals, and fresh produce.</p>
          </div>
          <Link
            to="/products?collection=best_sellers"
            className="text-xs font-bold text-[#244B37] hover:underline flex items-center gap-1 group"
          >
            <span>View All</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-5">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => <ProductCardSkeleton key={i} />)
          ) : (
            bestSellers.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))
          )}
        </div>
      </section>

      {/* 5. FRESH TODAY (HARVESTED TODAY) */}
      <section className="w-full max-w-[1600px] mx-auto px-3.5 sm:px-6 lg:px-8 xl:px-10">
        <div className="p-4 sm:p-7 rounded-3xl bg-[#244B37] text-white shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6 pb-4 sm:pb-5 border-b border-white/10">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-800 text-emerald-100 border border-emerald-600/50 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider mb-1.5">
                <Clock className="w-3 h-3 text-emerald-300" />
                Harvested This Morning
              </div>
              <h2 className="font-display font-black text-xl sm:text-3xl text-white">
                Fresh Today from the Soil
              </h2>
              <p className="text-xs sm:text-sm text-emerald-100/90 mt-1 max-w-xl">
                Delivered from farm to your kitchen within hours of harvesting. Zero cold storage or chemical carbide ripening.
              </p>
            </div>
            <Link
              to="/products?collection=fresh_today"
              className="px-4 sm:px-5 py-2.5 rounded-xl bg-white text-[#244B37] hover:bg-stone-100 font-bold text-xs shrink-0 self-start sm:self-center transition-all shadow-md min-h-[40px] flex items-center"
            >
              Shop Morning Harvest →
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => <ProductCardSkeleton key={i} />)
            ) : (
              freshToday.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))
            )}
          </div>
        </div>
      </section>

      {/* 6. DEALS OF THE DAY */}
      <section className="w-full max-w-[1600px] mx-auto px-3.5 sm:px-6 lg:px-8 xl:px-10">
        <div className="flex items-baseline justify-between mb-3.5 sm:mb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-amber-100 text-amber-800">
                <Flame className="w-4 h-4 text-amber-600" />
              </span>
              <h2 className="font-display font-black text-xl sm:text-2xl text-stone-900 tracking-tight">
                Deals of the Day
              </h2>
            </div>
            <p className="text-xs text-stone-500 mt-1">Special harvest discounts on certified organic staples.</p>
          </div>
          <Link
            to="/products?collection=deals"
            className="text-xs font-bold text-[#244B37] hover:underline flex items-center gap-1 group"
          >
            <span>View All</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-5">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => <ProductCardSkeleton key={i} />)
          ) : (
            deals.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))
          )}
        </div>
      </section>

      {/* 7. TRUST & SOURCING TRANSPARENCY SECTION */}
      <section className="w-full bg-[#FAF8F5] border-y border-[#E6E7DD] py-10 sm:py-14">
        <div className="w-full max-w-[1600px] mx-auto px-3.5 sm:px-6 lg:px-8 xl:px-10">
          <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-[#244B37]">
              Sri Adithya Organics
            </span>
            <h2 className="font-display font-black text-2xl sm:text-4xl text-stone-900 mt-1 tracking-tight">
              Our Purity & Transparency Standard
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 mt-2 leading-relaxed">
              We never invent certifications or make unverified claims. Every product comes directly from trusted organic farmers and traditional wooden chekku mills.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            <div className="p-5 sm:p-6 rounded-2xl bg-white border border-[#E6E7DD] shadow-soft space-y-3">
              <div className="w-11 h-11 rounded-xl bg-[#244B37] text-white flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-emerald-200" />
              </div>
              <h3 className="font-bold text-base text-stone-900">Verified Origin Traceability</h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Every bottle of wood-pressed oil, unpolished grain, and farm vegetable lists its exact cluster, processing mill, and verification standard.
              </p>
            </div>

            <div className="p-5 sm:p-6 rounded-2xl bg-white border border-[#E6E7DD] shadow-soft space-y-3">
              <div className="w-11 h-11 rounded-xl bg-[#244B37] text-white flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-200" />
              </div>
              <h3 className="font-bold text-base text-stone-900">Zero Chemical Residue Lab Testing</h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Randomized batch testing for pesticide residues, heavy metals, and adulterants. Zero paraffin wax, zero mineral oil polish, and zero artificial sulfur.
              </p>
            </div>

            <div className="p-5 sm:p-6 rounded-2xl bg-white border border-[#E6E7DD] shadow-soft space-y-3">
              <div className="w-11 h-11 rounded-xl bg-[#244B37] text-white flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-emerald-200" />
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
      <section className="w-full max-w-[1600px] mx-auto px-3.5 sm:px-6 lg:px-8 xl:px-10">
        <div className="flex items-baseline justify-between mb-3.5 sm:mb-5">
          <div>
            <h2 className="font-display font-black text-xl sm:text-2xl text-stone-900 tracking-tight">
              Pantry & Farm-to-Home Essentials
            </h2>
            <p className="text-xs text-stone-500 mt-1">Staples that nourish your family every single day.</p>
          </div>
          <Link
            to="/products"
            className="text-xs font-bold text-[#244B37] hover:underline flex items-center gap-1 group"
          >
            <span>View All</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-5">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => <ProductCardSkeleton key={i} />)
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
