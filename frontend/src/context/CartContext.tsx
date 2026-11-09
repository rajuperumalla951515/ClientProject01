import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { CartData, CartItem, Product, ProductVariant } from '../types';
import { api } from '../services/api';
import { useStoreSettings } from './SettingsContext';

const defaultCart: CartData = {
  items: [],
  item_count: 0,
  subtotal: 0,
  discount: 0,
  delivery_fee: 0,
  taxes: 0,
  total_amount: 0,
  free_delivery_threshold: 499,
  free_delivery_progress: 0,
  amount_needed_for_free_delivery: 499,
};

function calculateCartTotals(items: CartItem[], freeThreshold = 499, standardFee = 39): CartData {
  const subtotal = items.reduce((acc, i) => acc + (i.variant?.price || 0) * i.quantity, 0);
  const totalMrp = items.reduce((acc, i) => acc + (i.variant?.mrp || i.variant?.price || 0) * i.quantity, 0);
  const discount = Math.max(0, totalMrp - subtotal);
  const delivery_fee = subtotal >= freeThreshold || subtotal === 0 ? 0 : standardFee;
  return {
    items,
    item_count: items.reduce((acc, i) => acc + i.quantity, 0),
    subtotal: Math.round(subtotal * 100) / 100,
    discount: Math.round(discount * 100) / 100,
    mrp_savings: Math.round(discount * 100) / 100,
    delivery_fee,
    taxes: 0,
    // FINAL RULE: Customer pays selling price (subtotal) + applicable delivery fee. Never subtract MRP savings!
    total_amount: Math.round((subtotal + delivery_fee) * 100) / 100,
    free_delivery_threshold: freeThreshold,
    free_delivery_progress: subtotal === 0 ? 0 : Math.min(100, Math.round((subtotal / freeThreshold) * 100)),
    amount_needed_for_free_delivery: Math.max(0, Math.round((freeThreshold - subtotal) * 100) / 100),
  };
}

interface CartContextType {
  cart: CartData;
  isLoading: boolean;
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  // Core actions
  addToCart: (
    productId: number,
    variantId: number,
    quantity?: number,
    product?: Product,
    variant?: ProductVariant
  ) => Promise<void>;
  incrementItem: (
    productId: number,
    variantId: number,
    maxStock?: number,
    product?: Product,
    variant?: ProductVariant
  ) => void;
  decrementItem: (productId: number, variantId: number) => void;
  setItemQuantity: (
    productId: number,
    variantId: number,
    quantity: number,
    maxStock?: number,
    product?: Product,
    variant?: ProductVariant
  ) => void;
  // Compatibility helpers
  updateQuantity: (itemId: number, quantity: number) => void;
  removeFromCart: (itemId: number) => Promise<void>;
  clearCart: () => Promise<void>;
  getItemQuantity: (productId: number, variantId?: number) => number;
  getItemByProductAndVariant: (productId: number, variantId?: number) => { id: number; quantity: number } | null;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { freeDeliveryThreshold, standardDeliveryFee } = useStoreSettings();

  // Instant hydration from local storage for 0ms initial cart display
  const [cart, setCart] = useState<CartData>(() => {
    try {
      const saved = localStorage.getItem('sri_adithya_local_cart');
      if (saved) return JSON.parse(saved);
    } catch {}
    return defaultCart;
  });

  // Always keep ref aligned to state for synchronous reading during rapid event firing
  const cartRef = useRef<CartData>(cart);
  cartRef.current = cart;

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  // Per-item debounce timers and sequence version tracking
  const debounceTimers = useRef<Map<string, any>>(new Map());
  const requestSeqRef = useRef<Map<string, number>>(new Map());

  // Dynamically recompute totals when delivery settings change
  useEffect(() => {
    setCart((prev) => calculateCartTotals(prev.items, freeDeliveryThreshold, standardDeliveryFee));
  }, [freeDeliveryThreshold, standardDeliveryFee]);

  const refreshCart = async () => {
    try {
      const data = await api.getCart();
      if (data && Array.isArray(data.items)) {
        setCart(data);
        cartRef.current = data;
        try {
          localStorage.setItem('sri_adithya_local_cart', JSON.stringify(data));
        } catch {}
      }
    } catch (err) {
      console.warn('Backend cart refresh notice:', err);
    }
  };

  useEffect(() => {
    refreshCart();
  }, []);

  const openDrawer = () => setIsDrawerOpen(true);
  const closeDrawer = () => setIsDrawerOpen(false);

  /**
   * Atomic Quantity Setter (Rock-Solid Optimistic UI with Debounced Server Sync)
   * Prevents quantity jumping, eliminates temporary ID mismatches, and handles zero deletion.
   */
  const setItemQuantity = (
    productId: number,
    variantId: number,
    quantity: number,
    maxStock = 999,
    product?: Product,
    variant?: ProductVariant
  ) => {
    const key = `${productId}_${variantId}`;
    const targetQty = Math.max(0, Math.min(quantity, maxStock));

    // 1. Immediately update local state synchronously
    setCart((prev) => {
      const existingIdx = prev.items.findIndex(
        (i) => i.product_id === productId && i.variant_id === variantId
      );
      let newItems = [...prev.items];

      if (targetQty <= 0) {
        newItems = newItems.filter(
          (i) => !(i.product_id === productId && i.variant_id === variantId)
        );
      } else if (existingIdx >= 0) {
        newItems[existingIdx] = {
          ...newItems[existingIdx],
          quantity: targetQty,
        };
      } else if (product && variant) {
        newItems.push({
          id: Date.now(),
          product_id: productId,
          variant_id: variantId,
          quantity: targetQty,
          product,
          variant,
        });
      }

      const updated = calculateCartTotals(newItems, freeDeliveryThreshold, standardDeliveryFee);
      cartRef.current = updated;
      try {
        localStorage.setItem('sri_adithya_local_cart', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // 2. Increment sequence version to ignore any stale out-of-order network responses
    const nextSeq = (requestSeqRef.current.get(key) || 0) + 1;
    requestSeqRef.current.set(key, nextSeq);

    // 3. Clear existing debounce timer for this item
    if (debounceTimers.current.has(key)) {
      clearTimeout(debounceTimers.current.get(key));
    }

    // 4. Batch rapid clicks (+ + +) into 1 network sync
    const timer = setTimeout(async () => {
      debounceTimers.current.delete(key);
      try {
        const serverCart = await api.setCartQuantity(productId, variantId, targetQty);
        // Only accept server state if no newer client action occurred for this item
        if (requestSeqRef.current.get(key) === nextSeq) {
          setCart(serverCart);
          cartRef.current = serverCart;
          try {
            localStorage.setItem('sri_adithya_local_cart', JSON.stringify(serverCart));
          } catch {}
        }
      } catch (err: any) {
        console.warn('Cart quantity sync warning:', err);
        if (requestSeqRef.current.get(key) === nextSeq) {
          await refreshCart();
        }
      }
    }, 280);

    debounceTimers.current.set(key, timer);
  };

  /**
   * Fast Increment Item (One-Click / Rapid-Click Safe)
   */
  const incrementItem = (
    productId: number,
    variantId: number,
    maxStock = 999,
    product?: Product,
    variant?: ProductVariant
  ) => {
    const existing = cartRef.current.items.find(
      (i) => i.product_id === productId && i.variant_id === variantId
    );
    const currentQty = existing ? existing.quantity : 0;
    if (currentQty >= maxStock) return;
    setItemQuantity(productId, variantId, currentQty + 1, maxStock, product, variant);
  };

  /**
   * Fast Decrement Item (Safe Step-down & Removal at 0)
   */
  const decrementItem = (productId: number, variantId: number) => {
    const existing = cartRef.current.items.find(
      (i) => i.product_id === productId && i.variant_id === variantId
    );
    const currentQty = existing ? existing.quantity : 0;
    if (currentQty <= 0) return;
    setItemQuantity(productId, variantId, currentQty - 1);
  };

  /**
   * Standard Add to Cart (Opens drawer, updates UI immediately)
   */
  const addToCart = async (
    productId: number,
    variantId: number,
    quantity = 1,
    product?: Product,
    variant?: ProductVariant
  ) => {
    const existing = cartRef.current.items.find(
      (i) => i.product_id === productId && i.variant_id === variantId
    );
    const currentQty = existing ? existing.quantity : 0;
    const stock = variant?.stock || 999;
    setItemQuantity(productId, variantId, currentQty + quantity, stock, product, variant);
    openDrawer();
  };

  /**
   * Backward-Compatible updateQuantity by itemId (Maps to setItemQuantity)
   */
  const updateQuantity = (itemId: number, quantity: number) => {
    const item = cartRef.current.items.find((i) => i.id === itemId);
    if (item) {
      setItemQuantity(item.product_id, item.variant_id, quantity, item.variant?.stock || 999);
      return;
    }
    // Fallback: sync directly with backend if item ID only
    api.updateCartItem(itemId, quantity).then((serverCart) => {
      setCart(serverCart);
      cartRef.current = serverCart;
    }).catch(refreshCart);
  };

  /**
   * Backward-Compatible removeFromCart
   */
  const removeFromCart = async (itemId: number) => {
    const item = cartRef.current.items.find((i) => i.id === itemId);
    if (item) {
      setItemQuantity(item.product_id, item.variant_id, 0);
      return;
    }
    try {
      const serverCart = await api.removeCartItem(itemId);
      setCart(serverCart);
      cartRef.current = serverCart;
      try {
        localStorage.setItem('sri_adithya_local_cart', JSON.stringify(serverCart));
      } catch {}
    } catch (err) {
      console.warn('Remove cart item error:', err);
      await refreshCart();
    }
  };

  /**
   * Clear Cart
   */
  const clearCart = async () => {
    setCart(defaultCart);
    cartRef.current = defaultCart;
    try {
      localStorage.removeItem('sri_adithya_local_cart');
    } catch {}

    try {
      await api.clearCart();
    } catch (err) {
      console.warn('Failed to clear remote cart:', err);
    }
  };

  const getItemQuantity = (productId: number, variantId?: number): number => {
    if (!cart.items || cart.items.length === 0) return 0;
    const match = cart.items.find((item) => {
      if (variantId) {
        return item.product_id === productId && item.variant_id === variantId;
      }
      return item.product_id === productId;
    });
    return match ? match.quantity : 0;
  };

  const getItemByProductAndVariant = (productId: number, variantId?: number) => {
    if (!cart.items || cart.items.length === 0) return null;
    const match = cart.items.find((item) => {
      if (variantId) {
        return item.product_id === productId && item.variant_id === variantId;
      }
      return item.product_id === productId;
    });
    return match ? { id: match.id, quantity: match.quantity } : null;
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        isLoading,
        isDrawerOpen,
        openDrawer,
        closeDrawer,
        addToCart,
        incrementItem,
        decrementItem,
        setItemQuantity,
        updateQuantity,
        removeFromCart,
        clearCart,
        getItemQuantity,
        getItemByProductAndVariant,
        refreshCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
