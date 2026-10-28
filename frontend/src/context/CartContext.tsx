import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartData } from '../types';
import { api } from '../services/api';

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
      setCart(data);
    } catch (err) {
      console.warn('Error fetching cart:', err);
    }
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
      openDrawer(); // Blinkit / Quick-commerce style: open side drawer so user sees instant cart update
    } catch (err: any) {
      alert(err.message || 'Could not add product to cart');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const updateQuantity = async (itemId: number, quantity: number) => {
    setIsLoading(true);
    try {
      const updated = await api.updateCartItem(itemId, quantity);
      setCart(updated);
    } catch (err: any) {
      alert(err.message || 'Could not update quantity');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const removeFromCart = async (itemId: number) => {
    setIsLoading(true);
    try {
      const updated = await api.removeCartItem(itemId);
      setCart(updated);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const clearCart = async () => {
    setIsLoading(true);
    try {
      const updated = await api.clearCart();
      setCart(updated);
    } catch (err: any) {
      console.error(err);
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

