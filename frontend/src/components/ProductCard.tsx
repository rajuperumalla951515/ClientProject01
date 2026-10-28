import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Minus, Heart, Sparkles, Check } from 'lucide-react';
import { Product, ProductVariant } from '../types';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

interface ProductCardProps {
  product: Product;
  onWishlistToggle?: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onWishlistToggle }) => {
  const { cart, addToCart, updateQuantity, getItemByProductAndVariant } = useCart();
  const { user, openLoginModal } = useAuth();

  // Selected variant: default to default variant or first variant
  const defaultVar = product.variants?.find((v) => v.is_default) || product.variants?.[0] || {
    id: 0,
    unit: '1 pack',
    price: product.min_price || 0,
    mrp: product.mrp || product.min_price || 0,
    stock: 50,
    pack_size: 'Standard',
    is_default: true,
  };

  const [selectedVariant, setSelectedVariant] = useState<ProductVariant>(defaultVar as ProductVariant);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Check if selected variant is in cart
  const cartItem = getItemByProductAndVariant(product.id, selectedVariant.id);
  const quantityInCart = cartItem ? cartItem.quantity : 0;

  const discountPercent =
    selectedVariant.mrp > selectedVariant.price
      ? Math.round(((selectedVariant.mrp - selectedVariant.price) / selectedVariant.mrp) * 100)
      : 0;

  const isOutOfStock = selectedVariant.stock <= 0;

  const handleAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) return;
    setIsActionLoading(true);
    try {
      await addToCart(product.id, selectedVariant.id, 1);
    } catch (err) {
      console.error(err);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleIncrement = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!cartItem) return;
    if (quantityInCart >= selectedVariant.stock) {
      alert(`Only ${selectedVariant.stock} units available in stock.`);
      return;
    }
    setIsActionLoading(true);
    try {
      await updateQuantity(cartItem.id, quantityInCart + 1);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDecrement = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!cartItem) return;
    setIsActionLoading(true);
    try {
      await updateQuantity(cartItem.id, quantityInCart - 1);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      openLoginModal();
      return;
    }
    try {
      const res = await api.toggleWishlist(product.id);
      setIsWishlisted(res.in_wishlist);
      if (onWishlistToggle) onWishlistToggle();
    } catch (err) {
      console.error(err);
    }
  };

  const primaryImage =
    product.primary_image ||
    product.images?.[0]?.image_url ||
    'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=600';

  return (
    <div className="group relative flex flex-col justify-between rounded-2xl bg-white border border-stone-200/90 shadow-soft hover:shadow-card hover:border-rootly-sage/40 transition-all overflow-hidden p-2.5 sm:p-3.5">
      {/* Top Badges & Wishlist Button */}
      <div className="relative w-full aspect-square rounded-xl bg-rootly-cream/50 overflow-hidden mb-2.5 sm:mb-3">
        <Link to={`/products/${product.slug}`} className="block w-full h-full">
          <img
            src={primaryImage}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
          />
        </Link>

        {/* Discount Badge */}
        {discountPercent > 0 && (
          <span className="absolute top-2 left-2 px-1.5 sm:px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-extrabold bg-rootly-earth text-white shadow-sm tracking-tight">
            {discountPercent}% OFF
          </span>
        )}

        {/* Fresh Today or Verified Badge */}
        {product.is_fresh_today && (
          <span className="absolute bottom-2 left-2 px-1.5 sm:px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-bold bg-[#FAF8F5]/90 text-rootly-forest backdrop-blur-sm border border-stone-200/80 shadow-sm flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            Harvested Today
          </span>
        )}

        {/* Wishlist Button */}
        <button
          type="button"
          onClick={handleWishlist}
          aria-label={isWishlisted ? "Remove from wishlist" : "Save to wishlist"}
          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-stone-600 hover:text-red-500 shadow-sm transition-all flex items-center justify-center touch-manipulation"
          title="Save to Wishlist"
        >
          <Heart className={`w-3.5 h-3.5 ${isWishlisted ? 'fill-red-500 text-red-500' : ''}`} />
        </button>

        {/* Out of Stock Overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-[2px] flex items-center justify-center">
            <span className="px-3 py-1 rounded-lg bg-white text-stone-800 text-xs font-bold shadow-md">
              Sold Out
            </span>
          </div>
        )}
      </div>

      {/* Product Information */}
      <div className="flex-1 flex flex-col justify-between">
        <div>
          {/* Sourcing / Farm origin tag */}
          <p className="text-[10px] font-semibold text-rootly-moss/90 truncate uppercase tracking-wider mb-1 flex items-center gap-1">
            <span>{product.origin_farm || 'Certified Organic Farm'}</span>
          </p>

          {/* Product Name */}
          <Link
            to={`/products/${product.slug}`}
            className="font-bold text-stone-900 text-xs sm:text-sm leading-snug line-clamp-2 hover:text-rootly-forest transition-colors mb-1.5"
            title={product.name}
          >
            {product.name}
          </Link>

          {/* Variants Selector (if more than 1 variant) */}
          {product.variants && product.variants.length > 1 ? (
            <div className="mb-2.5">
              <select
                value={selectedVariant.id}
                onChange={(e) => {
                  const found = product.variants.find((v) => v.id === Number(e.target.value));
                  if (found) setSelectedVariant(found);
                }}
                className="w-full text-[11px] font-semibold py-1 px-2 rounded-lg bg-stone-50 border border-stone-200 text-stone-700 focus:outline-none focus:border-rootly-sage"
              >
                {product.variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.unit} — ₹{v.price} {v.stock <= 0 ? '(Out of stock)' : ''}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <p className="text-[11px] font-semibold text-stone-500 mb-2.5">
              {selectedVariant.unit}
            </p>
          )}
        </div>

        {/* Price & Action Row */}
        <div className="flex flex-wrap xs:flex-nowrap items-center justify-between gap-1 pt-2 border-t border-stone-100">
          <div className="leading-tight min-w-0 shrink">
            <div className="flex items-baseline gap-1">
              <span className="text-xs sm:text-base font-extrabold text-stone-900 truncate">
                ₹{selectedVariant.price}
              </span>
              {selectedVariant.mrp > selectedVariant.price && (
                <span className="text-[10px] sm:text-[11px] font-medium text-stone-400 line-through">
                  ₹{selectedVariant.mrp}
                </span>
              )}
            </div>
            {discountPercent > 0 && (
              <span className="text-[9px] sm:text-[10px] font-bold text-emerald-700 block truncate">
                Save ₹{selectedVariant.mrp - selectedVariant.price}
              </span>
            )}
          </div>

          {/* Add / Stepper Button - Touch Friendly & Accessible */}
          {quantityInCart > 0 ? (
            <div className="flex items-center rounded-xl bg-rootly-forest text-white shadow-sm overflow-hidden h-8 touch-manipulation shrink-0 ml-auto">
              <button
                type="button"
                onClick={handleDecrement}
                disabled={isActionLoading}
                aria-label={`Decrease ${product.name} quantity`}
                className="w-7 h-full flex items-center justify-center hover:bg-rootly-dark active:scale-90 transition-all text-xs"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="px-1 text-xs font-extrabold min-w-[16px] text-center select-none">
                {quantityInCart}
              </span>
              <button
                type="button"
                onClick={handleIncrement}
                disabled={isActionLoading || quantityInCart >= selectedVariant.stock}
                aria-label={`Increase ${product.name} quantity`}
                className="w-7 h-full flex items-center justify-center hover:bg-rootly-dark active:scale-90 transition-all text-xs disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleAdd}
              disabled={isOutOfStock || isActionLoading}
              aria-label={`Add ${product.name} to cart`}
              className={`h-8 px-2.5 sm:px-3.5 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1 shadow-sm touch-manipulation shrink-0 ml-auto ${
                isOutOfStock
                  ? 'bg-stone-100 text-stone-400 cursor-not-allowed border border-stone-200'
                  : 'bg-rootly-sageMist text-rootly-forest border border-rootly-sage/50 hover:bg-rootly-forest hover:text-white'
              }`}
            >
              <span>ADD</span>
              <Plus className="w-3 h-3 stroke-[3]" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export const ProductCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl border border-stone-200/80 p-3 sm:p-3.5 flex flex-col justify-between shadow-soft animate-pulse">
      <div>
        {/* Image Placeholder */}
        <div className="w-full aspect-square rounded-xl bg-stone-200/80 mb-3" />

        {/* Title & Category Line */}
        <div className="h-3 bg-stone-200 rounded w-1/3 mb-2" />
        <div className="h-4 bg-stone-200 rounded w-4/5 mb-1" />
        <div className="h-4 bg-stone-200 rounded w-2/3 mb-3" />

        {/* Variant selector placeholder */}
        <div className="h-6 bg-stone-100 rounded-lg w-1/2 mb-3" />
      </div>

      {/* Price & Button Line */}
      <div className="flex items-center justify-between pt-2 border-t border-stone-100">
        <div className="space-y-1">
          <div className="h-4 bg-stone-200 rounded w-16" />
          <div className="h-2.5 bg-stone-100 rounded w-10" />
        </div>
        <div className="h-7 w-16 bg-stone-200 rounded-xl" />
      </div>
    </div>
  );
};


