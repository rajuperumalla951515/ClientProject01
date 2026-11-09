import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Minus, Heart, Sparkles, Check, Droplets } from 'lucide-react';
import { Product, ProductVariant } from '../types';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

interface ProductCardProps {
  product: Product;
  onWishlistToggle?: () => void;
}

/**
 * Format concise, clean title for high-density cards while preserving full name on hover and detail page.
 */
export function getCleanProductCardTitle(name: string): string {
  if (!name) return '';
  // Remove redundant repeated brand prefix for cleaner quick-commerce card scannability
  return name.replace(/^Sri\s+Adithya\s+(Organics\s+)?/i, '').trim();
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onWishlistToggle }) => {
  const { getItemQuantity, incrementItem, decrementItem, setItemQuantity } = useCart();
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

  // Directly read current quantity from CartContext
  const quantityInCart = getItemQuantity(product.id, selectedVariant.id);

  const discountPercent =
    selectedVariant.mrp > selectedVariant.price
      ? Math.round(((selectedVariant.mrp - selectedVariant.price) / selectedVariant.mrp) * 100)
      : 0;

  const isOutOfStock = selectedVariant.stock <= 0;

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) return;
    incrementItem(product.id, selectedVariant.id, selectedVariant.stock, product, selectedVariant);
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (quantityInCart >= selectedVariant.stock) {
      alert(`Only ${selectedVariant.stock} units available in stock.`);
      return;
    }
    incrementItem(product.id, selectedVariant.id, selectedVariant.stock, product, selectedVariant);
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    decrementItem(product.id, selectedVariant.id);
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

  const cleanTitle = getCleanProductCardTitle(product.name);

  return (
    <div className="group relative flex flex-col justify-between rounded-2xl bg-white border border-[#E6E7DD] hover:border-[#496B45]/50 shadow-soft hover:shadow-card transition-all overflow-hidden p-2.5 sm:p-3">
      {/* Top Badges & Product Image */}
      <div className="relative w-full aspect-square rounded-xl bg-[#FAF8F5] overflow-hidden mb-2 sm:mb-2.5">
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
          <span className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 px-1.5 sm:px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-extrabold bg-[#244B37] text-white shadow-sm tracking-tight">
            {discountPercent}% OFF
          </span>
        )}

        {/* Harvested Today Badge */}
        {product.is_fresh_today && (
          <span className="absolute bottom-1.5 left-1.5 sm:bottom-2 sm:left-2 px-1.5 sm:px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-bold bg-[#FAF8F5]/95 text-[#244B37] backdrop-blur-sm border border-stone-200/80 shadow-sm flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            Fresh Today
          </span>
        )}

        {/* Wishlist Button */}
        <button
          type="button"
          onClick={handleWishlist}
          aria-label={isWishlisted ? "Remove from wishlist" : "Save to wishlist"}
          className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/90 hover:bg-white text-stone-600 hover:text-red-500 shadow-sm transition-all flex items-center justify-center touch-manipulation"
          title="Save to Wishlist"
        >
          <Heart className={`w-3.5 h-3.5 ${isWishlisted ? 'fill-red-500 text-red-500' : ''}`} />
        </button>

        {/* Out of Stock Overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-[2px] flex items-center justify-center">
            <span className="px-2.5 py-1 rounded-lg bg-white text-stone-800 text-[11px] font-bold shadow-md">
              Sold Out
            </span>
          </div>
        )}
      </div>

      {/* Product Information */}
      <div className="flex-1 flex flex-col justify-between">
        <div>
          {/* Sourcing / Farm origin tag */}
          <div className="flex items-center gap-1 mb-1">
            <span className="text-[9px] sm:text-[10px] font-semibold text-[#496B45] truncate uppercase tracking-wider">
              {product.origin_farm || 'Organic Farm'}
            </span>
          </div>

          {/* Clean Short Product Name (Strict 2 lines) */}
          <Link
            to={`/products/${product.slug}`}
            className="font-bold text-stone-900 text-xs sm:text-[13px] leading-tight line-clamp-2 hover:text-[#244B37] transition-colors mb-1.5 min-h-[32px]"
            title={product.name}
          >
            {cleanTitle}
          </Link>

          {/* Unit / Pack Size Badge */}
          {product.variants && product.variants.length > 1 ? (
            <div className="mb-2">
              <select
                value={selectedVariant.id}
                onChange={(e) => {
                  const found = product.variants.find((v) => v.id === Number(e.target.value));
                  if (found) setSelectedVariant(found);
                }}
                className="w-full text-[11px] font-semibold py-1 px-1.5 rounded-lg bg-stone-50 border border-stone-200 text-stone-700 focus:outline-none focus:border-[#496B45]"
              >
                {product.variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.unit} — ₹{v.price} {v.stock <= 0 ? '(Out of stock)' : ''}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="inline-block px-1.5 py-0.5 rounded-md bg-[#FAF8F5] border border-stone-200/60 text-[10px] sm:text-[11px] font-medium text-stone-600 mb-2">
              {selectedVariant.unit}
            </div>
          )}
        </div>

        {/* Price & Action Row */}
        <div className="flex items-center justify-between gap-1 pt-1.5 border-t border-stone-100">
          <div className="leading-tight min-w-0 shrink">
            <div className="flex items-baseline gap-1">
              <span className="text-sm sm:text-base font-black text-[#244B37] tracking-tight">
                ₹{selectedVariant.price}
              </span>
              {selectedVariant.mrp > selectedVariant.price && (
                <span className="text-[10px] sm:text-[11px] font-medium text-stone-400 line-through">
                  ₹{selectedVariant.mrp}
                </span>
              )}
            </div>
            {discountPercent > 0 && (
              <span className="text-[9px] sm:text-[10px] font-bold text-[#496B45] block truncate">
                Save ₹{selectedVariant.mrp - selectedVariant.price}
              </span>
            )}
          </div>

          {/* Blinkit-Inspired Rock-Solid Add / Stepper Capsule */}
          {quantityInCart > 0 ? (
            <div className="flex items-center rounded-xl bg-[#244B37] text-white shadow-sm overflow-hidden h-7 sm:h-8 touch-manipulation shrink-0 ml-auto border border-[#244B37]">
              <button
                type="button"
                onClick={handleDecrement}
                aria-label={`Decrease ${product.name} quantity`}
                className="w-6 sm:w-7 h-full flex items-center justify-center hover:bg-[#1a3627] active:scale-90 transition-transform text-xs"
              >
                <Minus className="w-3 sm:w-3.5 h-3 sm:h-3.5 stroke-[2.5]" />
              </button>
              <span className="px-1.5 text-xs font-black min-w-[18px] text-center select-none">
                {quantityInCart}
              </span>
              <button
                type="button"
                onClick={handleIncrement}
                disabled={quantityInCart >= selectedVariant.stock}
                aria-label={`Increase ${product.name} quantity`}
                className="w-6 sm:w-7 h-full flex items-center justify-center hover:bg-[#1a3627] active:scale-90 transition-transform text-xs disabled:opacity-40"
              >
                <Plus className="w-3 sm:w-3.5 h-3 sm:h-3.5 stroke-[2.5]" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleAdd}
              disabled={isOutOfStock}
              aria-label={`Add ${product.name} to cart`}
              className={`h-7 sm:h-8 px-2.5 sm:px-3.5 rounded-xl text-xs font-black tracking-wide transition-all active:scale-95 flex items-center justify-center gap-1 shadow-sm touch-manipulation shrink-0 ml-auto ${
                isOutOfStock
                  ? 'bg-stone-100 text-stone-400 cursor-not-allowed border border-stone-200'
                  : 'bg-white text-[#244B37] border-2 border-[#244B37] hover:bg-[#244B37] hover:text-white'
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
    <div className="bg-white rounded-2xl border border-stone-200/80 p-2.5 sm:p-3 flex flex-col justify-between shadow-soft animate-pulse">
      <div>
        <div className="w-full aspect-square rounded-xl bg-stone-200/80 mb-2.5" />
        <div className="h-2.5 bg-stone-200 rounded w-1/3 mb-1.5" />
        <div className="h-3.5 bg-stone-200 rounded w-4/5 mb-1" />
        <div className="h-3.5 bg-stone-200 rounded w-2/3 mb-2" />
        <div className="h-5 bg-stone-100 rounded-md w-1/2 mb-2" />
      </div>

      <div className="flex items-center justify-between pt-1.5 border-t border-stone-100">
        <div className="space-y-1">
          <div className="h-4 bg-stone-200 rounded w-14" />
          <div className="h-2 bg-stone-100 rounded w-10" />
        </div>
        <div className="h-7 w-14 bg-stone-200 rounded-xl" />
      </div>
    </div>
  );
};
