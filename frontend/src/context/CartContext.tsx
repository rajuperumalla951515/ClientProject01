import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartData, CartItem } from '../types';
import { api } from '../services/api';
import { FALLBACK_PRODUCTS } from '../services/fallbackData';

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

function calculateCartTotals(items: CartItem[]): CartData {
  const subtotal = items.reduce((acc, i) => acc + i.variant.price * i.quantity, 0);
  const totalMrp = items.reduce((acc, i) => acc + (i.variant.mrp || i.variant.price) * i.quantity, 0);
  const discount = Math.max(0, totalMrp - subtotal);
  const delivery_fee = subtotal >= 499 || subtotal === 0 ? 0 : 39;
  return {
    items,
    item_count: items.reduce((acc, i) => acc + i.quantity, 0),
    subtotal: Math.round(subtotal * 100) / 100,
    discount: Math.round(discount * 100) / 100,
    delivery_fee,
    taxes: 0,
    total_amount: Math.round((subtotal + delivery_fee) * 100) / 100,
    free_delivery_threshold: 499,
    free_delivery_progress: subtotal === 0 ? 0 : Math.min(100, Math.round((subtotal / 499) * 100)),
    amount_needed_for_free_delivery: Math.max(0, Math.round((499 - subtotal) * 100) / 100),
  };
}

interface CartContextType {
  cart: CartData;
  isLoading: boolean;
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  addToCart: (productId: number, variantId: number, quantity?: number) => Promise<void>;
  updateQuantity: (itemId: number, quantity: number) => Promise<void>;
  removeFromCart: (itemId: number) => Promise<void>;
  clearCart: () => Promise<void>;
  getItemQuantity: (productId: number, variantId?: number) => number;
  getItemByProductAndVariant: (productId: number, variantId?: number) => { id: number; quantity: number } | null;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartData>(defaultCart);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  const refreshCart = async () => {
    try {
      const data = await api.getCart();
      if (data && Array.isArray(data.items)) {
        setCart(data);
        return;
      }
    } catch (err) {
      console.warn('Backend cart fetch notice:', err);
    }
    // Load local cart if present
    try {
      const saved = localStorage.getItem('sri_adithya_local_cart');
      if (saved) {
        setCart(JSON.parse(saved));
      }
    } catch {}
  };

  useEffect(() => {
    refreshCart();
  }, []);

  const openDrawer = () => setIsDrawerOpen(true);
  const closeDrawer = () => setIsDrawerOpen(false);

  const addToCart = async (productId: number, variantId: number, quantity = 1) => {
    setIsLoading(true);
    try {
      const updated = await api.addToCart(productId, variantId, quantity);
      setCart(updated);
      try {
        localStorage.setItem('sri_adithya_local_cart', JSON.stringify(updated));
      } catch {}
      openDrawer();
    } catch (err: any) {
      console.warn('Remote cart sync offline, updating local cart:', err);
      setCart((prev) => {
        const product = FALLBACK_PRODUCTS.find((p) => p.id === productId);
        if (!product) return prev;
        const variant = product.variants.find((v) => v.id === variantId) || product.variants[0];
        const existingIdx = prev.items.findIndex(
          (i) => i.product_id === productId && i.variant_id === variantId
        );
        let newItems = [...prev.items];
        if (existingIdx >= 0) {
          newItems[existingIdx] = {
            ...newItems[existingIdx],
            quantity: newItems[existingIdx].quantity + quantity,
          };
        } else {
          newItems.push({
            id: Date.now(),
            product_id: productId,
            variant_id: variantId,
            quantity,
            product,
            variant,
          });
        }
        const updatedCart = calculateCartTotals(newItems);
        try {
          localStorage.setItem('sri_adithya_local_cart', JSON.stringify(updatedCart));
        } catch {}
        return updatedCart;
      });
      openDrawer();
    } finally {
      setIsLoading(false);
    }
  };

  const updateQuantity = async (itemId: number, quantity: number) => {
    setIsLoading(true);
    try {
      const updated = await api.updateCartItem(itemId, quantity);
      setCart(updated);
      try {
        localStorage.setItem('sri_adithya_local_cart', JSON.stringify(updated));
      } catch {}
    } catch (err: any) {
      console.warn('Remote cart sync offline, updating local cart item:', err);
      setCart((prev) => {
        let newItems: CartItem[];
        if (quantity <= 0) {
          newItems = prev.items.filter((i) => i.id !== itemId);
        } else {
          newItems = prev.items.map((i) => (i.id === itemId ? { ...i, quantity } : i));
        }
        const updatedCart = calculateCartTotals(newItems);
        try {
          localStorage.setItem('sri_adithya_local_cart', JSON.stringify(updatedCart));
        } catch {}
        return updatedCart;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const removeFromCart = async (itemId: number) => {
    setIsLoading(true);
    try {
      const updated = await api.removeCartItem(itemId);
      setCart(updated);
      try {
        localStorage.setItem('sri_adithya_local_cart', JSON.stringify(updated));
      } catch {}
    } catch (err: any) {
      setCart((prev) => {
        const newItems = prev.items.filter((i) => i.id !== itemId);
        const updatedCart = calculateCartTotals(newItems);
        try {
          localStorage.setItem('sri_adithya_local_cart', JSON.stringify(updatedCart));
        } catch {}
        return updatedCart;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearCart = async () => {
    setIsLoading(true);
    try {
      const updated = await api.clearCart();
      setCart(updated);
      try {
        localStorage.removeItem('sri_adithya_local_cart');
      } catch {}
    } catch (err: any) {
      setCart(defaultCart);
      try {
        localStorage.removeItem('sri_adithya_local_cart');
      } catch {}
    } finally {
      setIsLoading(false);
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

