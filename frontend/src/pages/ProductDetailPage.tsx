import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ShieldCheck, Truck, Leaf, Clock, Plus, Minus, Heart, ArrowRight,
  CheckCircle2, AlertCircle, Sparkles, ChevronRight, Share2
} from 'lucide-react';
import { api } from '../services/api';
import { Product, ProductVariant } from '../types';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { ProductCard } from '../components/ProductCard';

export const ProductDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { addToCart, updateQuantity, getItemByProductAndVariant } = useCart();
  const { user, openLoginModal } = useAuth();

  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [activeImage, setActiveImage] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [activeTab, setActiveTab] = useState<'origin' | 'storage' | 'nutrition'>('origin');

  useEffect(() => {
    if (!slug) return;
    const fetchDetail = async () => {
      setIsLoading(true);
      try {
        const prod = await api.getProduct(slug);
        setProduct(prod);
        const defVar = prod.variants?.find((v) => v.is_default) || prod.variants?.[0] || null;
        setSelectedVariant(defVar);
        setActiveImage(prod.primary_image || prod.images?.[0]?.image_url || '');

        const related = await api.getRelatedProducts(prod.id, 4);
        setRelatedProducts(related);
      } catch (err) {
        console.error('Failed to load product details:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDetail();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [slug]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 py-6 sm:py-8 animate-pulse">
        {/* Breadcrumb skeleton */}
        <div className="h-4 bg-stone-200 rounded w-48 mb-6" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Gallery Skeleton */}
          <div className="lg:col-span-6 space-y-4">
            <div className="w-full aspect-square rounded-3xl bg-stone-200" />
            <div className="flex gap-3">
              <div className="w-20 h-20 rounded-xl bg-stone-200" />
              <div className="w-20 h-20 rounded-xl bg-stone-200" />
            </div>
          </div>

          {/* Details Skeleton */}
          <div className="lg:col-span-6 space-y-6">
            <div className="space-y-3">
              <div className="h-4 bg-stone-200 rounded w-28" />
              <div className="h-8 bg-stone-200 rounded w-3/4" />
              <div className="h-4 bg-stone-200 rounded w-1/2" />
            </div>

            {/* Price block */}
            <div className="p-4 rounded-2xl bg-stone-100/80 space-y-2">
              <div className="h-7 bg-stone-200 rounded w-32" />
              <div className="h-3 bg-stone-200 rounded w-40" />
            </div>

            {/* Variant choices */}
            <div className="space-y-2">
              <div className="h-3 bg-stone-200 rounded w-24" />
              <div className="flex gap-2">
                <div className="h-10 w-28 bg-stone-200 rounded-xl" />
                <div className="h-10 w-28 bg-stone-200 rounded-xl" />
              </div>
            </div>

            {/* Add button */}
            <div className="h-12 bg-stone-200 rounded-2xl w-full" />

            {/* Sourcing guarantee box */}
            <div className="p-4 rounded-2xl bg-stone-100/60 h-28" />
          </div>
        </div>
      </div>
    );
  }

  if (!product || !selectedVariant) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <h2 className="font-display font-bold text-xl text-stone-900">Product not found</h2>
        <p className="text-xs text-stone-500 mt-1 mb-6">This item may have moved or is temporarily out of season.</p>
        <Link to="/products" className="px-5 py-2.5 rounded-xl bg-rootly-forest text-white text-xs font-bold">
          Browse All Products
        </Link>
      </div>
    );
  }

  const cartItem = getItemByProductAndVariant(product.id, selectedVariant.id);
  const quantityInCart = cartItem ? cartItem.quantity : 0;
  const isOutOfStock = selectedVariant.stock <= 0;

  const discountPercent =
    selectedVariant.mrp > selectedVariant.price
      ? Math.round(((selectedVariant.mrp - selectedVariant.price) / selectedVariant.mrp) * 100)
      : 0;

  const handleWishlist = async () => {
    if (!user) {
      openLoginModal();
      return;
    }
    const res = await api.toggleWishlist(product.id);
    setIsWishlisted(res.in_wishlist);
  };

  return (
    <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8 sm:space-y-12">
      
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-stone-400">
        <Link to="/" className="hover:text-stone-700">Home</Link>
        <span>/</span>
        <Link to={`/products?category=${product.category?.slug}`} className="hover:text-stone-700">
          {product.category?.name || 'Category'}
        </Link>
        <span>/</span>
        <span className="text-stone-700 font-semibold truncate max-w-xs">{product.name}</span>
      </nav>

      {/* Main Product Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        
        {/* Gallery */}
        <div className="lg:col-span-6 space-y-4">
          <div className="aspect-square w-full rounded-3xl bg-white border border-stone-200 overflow-hidden shadow-card relative">
            <img
              src={activeImage || product.primary_image}
              alt={product.name}
              className="w-full h-full object-cover object-center"
            />
            {discountPercent > 0 && (
              <span className="absolute top-4 left-4 px-3 py-1 rounded-lg text-xs font-black bg-rootly-earth text-white shadow-md">
                {discountPercent}% OFF
              </span>
            )}
            <button
              onClick={handleWishlist}
              className="absolute top-4 right-4 p-2.5 rounded-full bg-white/90 hover:bg-white text-stone-600 hover:text-red-500 shadow-md transition-all"
            >
              <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-red-500 text-red-500' : ''}`} />
            </button>
          </div>

          {/* Thumbnails */}
          {product.images && product.images.length > 1 && (
            <div className="flex items-center gap-3 overflow-x-auto pb-2">
              {product.images.map((img) => (
                <button
                  key={img.id}
                  onClick={() => setActiveImage(img.image_url)}
                  className={`w-20 h-20 rounded-2xl overflow-hidden border-2 transition-all shrink-0 ${
                    activeImage === img.image_url ? 'border-rootly-forest shadow-md' : 'border-stone-200 opacity-70'
                  }`}
                >
                  <img src={img.image_url} alt={img.alt_text || ''} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details & Actions */}
        <div className="lg:col-span-6 space-y-6">
          <div>
            {/* Origin Farm Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rootly-sageMist text-rootly-forest text-xs font-bold uppercase tracking-wider mb-2.5">
              <Leaf className="w-3.5 h-3.5 text-rootly-sage" />
              <span>{product.origin_farm || 'Certified Organic Grower Collective'}</span>
            </div>

            <h1 className="font-display font-black text-2xl sm:text-4xl text-stone-900 tracking-tight leading-tight">
              {product.name}
            </h1>
            <p className="text-stone-600 text-xs sm:text-sm mt-2 leading-relaxed">
              {product.short_description || product.description}
            </p>
          </div>

          {/* Pricing Box */}
          <div className="p-4 rounded-2xl bg-white border border-stone-200/90 shadow-soft space-y-1">
            <div className="flex items-baseline gap-2.5">
              <span className="font-display font-black text-2xl sm:text-3xl text-stone-900">
                ₹{selectedVariant.price}
              </span>
              {selectedVariant.mrp > selectedVariant.price && (
                <span className="text-sm font-semibold text-stone-400 line-through">
                  ₹{selectedVariant.mrp}
                </span>
              )}
              {discountPercent > 0 && (
                <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  Save ₹{selectedVariant.mrp - selectedVariant.price}
                </span>
              )}
            </div>
            <p className="text-[11px] text-stone-400">Inclusive of all taxes • Guaranteed fresh delivery</p>
          </div>

          {/* Pack Size / Variant Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-2">
              Select Pack Size
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {product.variants.map((v) => {
                const isSelected = selectedVariant.id === v.id;
                return (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVariant(v)}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      isSelected
                        ? 'border-rootly-forest bg-rootly-sageMist/30 shadow-sm'
                        : 'border-stone-200 bg-white hover:border-stone-300'
                    }`}
                  >
                    <p className={`text-xs font-bold ${isSelected ? 'text-rootly-forest' : 'text-stone-800'}`}>
                      {v.unit}
                    </p>
                    <p className="text-xs font-extrabold text-stone-900 mt-0.5">₹{v.price}</p>
                    {v.stock <= 0 && <span className="text-[10px] text-red-500 font-semibold block mt-0.5">Out of stock</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Button: Add or Stepper */}
          <div className="pt-2">
            {quantityInCart > 0 ? (
              <div className="flex items-center gap-4">
                <div className="flex items-center rounded-2xl bg-rootly-forest text-white shadow-lift overflow-hidden h-12 px-2">
                  <button
                    onClick={() => updateQuantity(cartItem!.id, quantityInCart - 1)}
                    className="p-2 hover:bg-rootly-dark active:scale-95 transition-all"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="px-4 font-display font-extrabold text-base min-w-[32px] text-center">
                    {quantityInCart}
                  </span>
                  <button
                    onClick={() => updateQuantity(cartItem!.id, quantityInCart + 1)}
                    disabled={quantityInCart >= selectedVariant.stock}
                    className="p-2 hover:bg-rootly-dark active:scale-95 transition-all disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <span className="text-xs font-bold text-rootly-forest">
                  Added to your cart!
                </span>
              </div>
            ) : (
              <button
                onClick={() => addToCart(product.id, selectedVariant.id, 1)}
                disabled={isOutOfStock}
                className={`w-full sm:w-auto px-8 py-3.5 rounded-2xl font-bold text-sm shadow-lift transition-all active:scale-95 flex items-center justify-center gap-2 ${
                  isOutOfStock
                    ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                    : 'bg-rootly-forest hover:bg-rootly-dark text-white'
                }`}
              >
                <span>{isOutOfStock ? 'Sold Out' : 'Add to Cart'}</span>
                {!isOutOfStock && <ArrowRight className="w-4 h-4" />}
              </button>
            )}
          </div>

          {/* Quick Perks Strip */}
          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-stone-200">
            <div className="flex items-center gap-2.5 text-xs text-stone-700">
              <Truck className="w-4 h-4 text-rootly-forest shrink-0" />
              <span>Delivered in <strong>15-30 Mins</strong></span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-stone-700">
              <ShieldCheck className="w-4 h-4 text-rootly-forest shrink-0" />
              <span><strong>100% Honest</strong> Lab Verified</span>
            </div>
          </div>
        </div>

      </div>

      {/* Sourcing, Storage, and Nutrition Information Tabs */}
      <section className="bg-white rounded-3xl border border-stone-200/90 p-6 sm:p-8 shadow-card">
        <div className="flex border-b border-stone-200 gap-6 text-sm font-bold pb-4 overflow-x-auto no-scrollbar whitespace-nowrap">
          <button
            onClick={() => setActiveTab('origin')}
            className={`pb-2 border-b-2 transition-all ${
              activeTab === 'origin' ? 'border-rootly-forest text-rootly-forest' : 'border-transparent text-stone-400 hover:text-stone-700'
            }`}
          >
            Honest Farm Origin
          </button>
          <button
            onClick={() => setActiveTab('storage')}
            className={`pb-2 border-b-2 transition-all ${
              activeTab === 'storage' ? 'border-rootly-forest text-rootly-forest' : 'border-transparent text-stone-400 hover:text-stone-700'
            }`}
          >
            Storage & Shelf Life
          </button>
          <button
            onClick={() => setActiveTab('nutrition')}
            className={`pb-2 border-b-2 transition-all ${
              activeTab === 'nutrition' ? 'border-rootly-forest text-rootly-forest' : 'border-transparent text-stone-400 hover:text-stone-700'
            }`}
          >
            Ingredients & Details
          </button>
        </div>

        <div className="pt-6 text-xs sm:text-sm text-stone-600 leading-relaxed max-w-3xl">
          {activeTab === 'origin' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-rootly-cream border border-stone-200/60">
                <h4 className="font-bold text-stone-900 mb-1">Cultivation & Origin</h4>
                <p>{product.origin_farm || 'Grown by verified natural organic farmer cooperatives across Karnataka and Tamil Nadu.'}</p>
              </div>
              <div className="p-4 rounded-2xl bg-rootly-cream border border-stone-200/60">
                <h4 className="font-bold text-stone-900 mb-1">Certifications Verified</h4>
                <p>{product.certifications || 'Tested according to Jaivik Bharat (FSSAI) & NPOP organic farming standards.'}</p>
              </div>
            </div>
          )}

          {activeTab === 'storage' && (
            <div className="p-4 rounded-2xl bg-rootly-cream border border-stone-200/60">
              <h4 className="font-bold text-stone-900 mb-1">Best Storage Practices</h4>
              <p>{product.storage_instructions || 'Store in a cool, ventilated dry place away from heat. Refrigerate fresh greens in perforated cotton bags.'}</p>
            </div>
          )}

          {activeTab === 'nutrition' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-rootly-cream border border-stone-200/60">
                <h4 className="font-bold text-stone-900 mb-1">Ingredients</h4>
                <p>{product.ingredients || `100% Pure Organic ${product.name}. Zero added preservatives, bleaches, or artificial colors.`}</p>
              </div>
              {product.allergens && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
                  <h4 className="font-bold text-amber-900 mb-1">Allergen Advice</h4>
                  <p className="text-amber-800">{product.allergens}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className="space-y-6">
          <h3 className="font-display font-extrabold text-xl text-stone-900">
            You Might Also Like
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
            {relatedProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

    </div>
  );
};

