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
    delivery_fee,
    taxes: 0,
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
  addToCart: (
    productId: number,
    variantId: number,
    quantity?: number,
    product?: Product,
    variant?: ProductVariant
  ) => Promise<void>;
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

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  // Debounce timers map to batch rapid clicks (+ + +) on the same item into 1 request
  const debounceTimers = useRef<Map<number, any>>(new Map());

  // Dynamically recompute totals when delivery settings change
  useEffect(() => {
    setCart((prev) => calculateCartTotals(prev.items, freeDeliveryThreshold, standardDeliveryFee));
  }, [freeDeliveryThreshold, standardDeliveryFee]);

  const refreshCart = async () => {
    try {
      const data = await api.getCart();
      if (data && Array.isArray(data.items)) {
        setCart(data);
        try {
          localStorage.setItem('sri_adithya_local_cart', JSON.stringify(data));
        } catch {}
        return;
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

  // Optimistic Add To Cart (< 10ms UI update)
  const addToCart = async (
    productId: number,
    variantId: number,
    quantity = 1,
    product?: Product,
    variant?: ProductVariant
  ) => {
    // 1. Synchronously update local cart
    setCart((prev) => {
      const existingIdx = prev.items.findIndex(
        (i) => i.product_id === productId && i.variant_id === variantId
      );
      let newItems = [...prev.items];
      if (existingIdx >= 0) {
        newItems[existingIdx] = {
          ...newItems[existingIdx],
          quantity: newItems[existingIdx].quantity + quantity,
        };
      } else if (product && variant) {
        newItems.push({
          id: Date.now(), // temporary optimistic ID
          product_id: productId,
          variant_id: variantId,
          quantity,
          product,
          variant,
        });
      }
      const updated = calculateCartTotals(newItems, freeDeliveryThreshold, standardDeliveryFee);
      try {
        localStorage.setItem('sri_adithya_local_cart', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // 2. Open drawer immediately
    openDrawer();

    // 3. Sync to backend asynchronously
    try {
      const serverCart = await api.addToCart(productId, variantId, quantity);
      setCart(serverCart);
      try {
        localStorage.setItem('sri_adithya_local_cart', JSON.stringify(serverCart));
      } catch {}
    } catch (err: any) {
      console.error('Failed to sync item to cart on server:', err);
      // Reconcile with latest server state on error
      await refreshCart();
      throw err;
    }
  };

  // Optimistic Quantity Stepper with Request Debouncing (< 10ms UI update)
  const updateQuantity = (itemId: number, quantity: number) => {
    // 1. Immediately update UI state
    setCart((prev) => {
      let newItems: CartItem[];
      if (quantity <= 0) {
        newItems = prev.items.filter((i) => i.id !== itemId);
      } else {
        newItems = prev.items.map((i) => (i.id === itemId ? { ...i, quantity } : i));
      }
      const updated = calculateCartTotals(newItems, freeDeliveryThreshold, standardDeliveryFee);
      try {
        localStorage.setItem('sri_adithya_local_cart', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // 2. Debounce backend network sync (300ms window)
    if (debounceTimers.current.has(itemId)) {
      clearTimeout(debounceTimers.current.get(itemId));
    }

    const timer = setTimeout(async () => {
      debounceTimers.current.delete(itemId);
      try {
        const serverCart = await api.updateCartItem(itemId, quantity);
        setCart(serverCart);
        try {
          localStorage.setItem('sri_adithya_local_cart', JSON.stringify(serverCart));
        } catch {}
      } catch (err: any) {
        console.error('Failed to sync quantity with backend:', err);
        await refreshCart();
      }
    }, 300);

    debounceTimers.current.set(itemId, timer);
  };

  // Optimistic Remove From Cart (< 10ms UI update)
  const removeFromCart = async (itemId: number) => {
    setCart((prev) => {
      const newItems = prev.items.filter((i) => i.id !== itemId);
      const updated = calculateCartTotals(newItems, freeDeliveryThreshold, standardDeliveryFee);
      try {
        localStorage.setItem('sri_adithya_local_cart', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    try {
      const serverCart = await api.removeCartItem(itemId);
      setCart(serverCart);
      try {
        localStorage.setItem('sri_adithya_local_cart', JSON.stringify(serverCart));
      } catch {}
    } catch (err: any) {
      console.error('Failed to remove item from server cart:', err);
      await refreshCart();
    }
  };

  const clearCart = async () => {
    setCart(defaultCart);
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

