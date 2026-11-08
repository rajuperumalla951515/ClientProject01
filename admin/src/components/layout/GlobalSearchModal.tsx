import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ShoppingBag, Package, Users, ArrowRight, X, Loader2 } from 'lucide-react';
import { api } from '../../services/api';
import { Product, Order, CustomerMetric } from '../../types';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<CustomerMetric[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setProducts([]);
      setOrders([]);
      setCustomers([]);
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setProducts([]);
      setOrders([]);
      setCustomers([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const [prodsRes, ordersRes, custsRes] = await Promise.allSettled([
          api.getProducts({ search: query, limit: 5 }),
          api.getAllOrders({ search: query, limit: 5 }),
          api.getCustomers(query),
        ]);

        if (prodsRes.status === 'fulfilled') setProducts(prodsRes.value || []);
        if (ordersRes.status === 'fulfilled') setOrders(ordersRes.value || []);
        if (custsRes.status === 'fulfilled') setCustomers((custsRes.value || []).slice(0, 5));
      } catch (err) {
        console.error('Search error', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const handleSelect = (url: string) => {
    onClose();
    navigate(url);
  };

  const hasResults = products.length > 0 || orders.length > 0 || customers.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-[#244B37]/25 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="fixed inset-0"
        onClick={onClose}
      />
      <div className="relative w-full max-w-2xl bg-white rounded-2xl border border-[#E6E7DD] shadow-2xl overflow-hidden z-10 flex flex-col max-h-[80vh]">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#E6E7DD] bg-[#FDFCF9]">
          <Search className="w-5 h-5 text-[#496B45] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products, orders (#SAO-...), customers by name or phone..."
            className="flex-1 bg-transparent text-sm text-[#26352B] placeholder-[#778176] focus:outline-none font-medium"
          />
          {loading && <Loader2 className="w-4 h-4 text-[#496B45] animate-spin shrink-0" />}
          {query && !loading && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-[#778176] hover:text-[#26352B] rounded-md transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-semibold text-[#778176] bg-[#F6F5EF] border border-[#E6E7DD] rounded-md">
            ESC
          </kbd>
        </div>

        {/* Results Body */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {!query && (
            <div className="py-6 px-4 text-center">
              <p className="text-xs font-semibold text-[#778176] uppercase tracking-wider mb-3">
                Quick Navigation
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { label: 'Orders', path: '/orders', icon: ShoppingBag },
                  { label: 'Products', path: '/products', icon: Package },
                  { label: 'Inventory', path: '/inventory', icon: Package },
                  { label: 'Customers', path: '/customers', icon: Users },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.path}
                      onClick={() => handleSelect(item.path)}
                      className="flex items-center gap-2 p-2.5 rounded-xl border border-[#E6E7DD] bg-[#F6F5EF]/60 hover:bg-[#F6F5EF] hover:border-[#8A9B69] transition-all text-xs font-semibold text-[#26352B]"
                    >
                      <Icon className="w-4 h-4 text-[#496B45]" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {query && !loading && !hasResults && (
            <div className="py-10 text-center">
              <p className="text-sm font-semibold text-[#26352B]">No records found for "{query}"</p>
              <p className="text-xs text-[#778176] mt-1">Try searching by product name, order ID, phone number or email</p>
            </div>
          )}

          {/* Orders Section */}
          {orders.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[11px] font-bold text-[#496B45] uppercase tracking-wider flex items-center justify-between">
                <span>Orders ({orders.length})</span>
                <span className="text-[10px] text-[#778176]">Press to open</span>
              </div>
              <div className="mt-1 space-y-1">
                {orders.map((ord) => (
                  <button
                    key={ord.id}
                    onClick={() => handleSelect('/orders')}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-[#F6F5EF] transition-colors text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#E2E8D7] text-[#244B37] flex items-center justify-center font-bold text-xs">
                        <ShoppingBag className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#26352B] group-hover:text-[#244B37]">
                          #{ord.order_number}
                        </p>
                        <p className="text-[11px] text-[#778176]">
                          {ord.customer_name || 'Direct Customer'} • ₹{ord.total_amount.toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-white border border-[#E6E7DD] text-[#26352B]">
                        {ord.status}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#778176] group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Products Section */}
          {products.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[11px] font-bold text-[#496B45] uppercase tracking-wider flex items-center justify-between">
                <span>Products ({products.length})</span>
                <span className="text-[10px] text-[#778176]">Catalogue</span>
              </div>
              <div className="mt-1 space-y-1">
                {products.map((prod) => (
                  <button
                    key={prod.id}
                    onClick={() => handleSelect('/products')}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-[#F6F5EF] transition-colors text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[#F6F5EF] border border-[#E6E7DD] overflow-hidden shrink-0">
                        {prod.primary_image ? (
                          <img
                            src={prod.primary_image}
                            alt={prod.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package className="w-4 h-4 text-[#778176] m-auto mt-2.5" />
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#26352B] group-hover:text-[#244B37] line-clamp-1">
                          {prod.name}
                        </p>
                        <p className="text-[11px] text-[#778176]">
                          ₹{prod.min_price} • {prod.brand || 'Sri Adithya'} • {prod.in_stock ? 'In Stock' : 'Out of Stock'}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-[#778176] group-hover:translate-x-0.5 transition-transform" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Customers Section */}
          {customers.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[11px] font-bold text-[#496B45] uppercase tracking-wider flex items-center justify-between">
                <span>Customers ({customers.length})</span>
                <span className="text-[10px] text-[#778176]">Directory</span>
              </div>
              <div className="mt-1 space-y-1">
                {customers.map((cust) => (
                  <button
                    key={cust.id}
                    onClick={() => handleSelect('/customers')}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-[#F6F5EF] transition-colors text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#244B37] text-white flex items-center justify-center font-bold text-xs">
                        {cust.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#26352B] group-hover:text-[#244B37]">
                          {cust.name}
                        </p>
                        <p className="text-[11px] text-[#778176]">
                          {cust.phone || cust.email} • {cust.total_orders} orders • ₹{cust.total_spend.toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-[#778176] group-hover:translate-x-0.5 transition-transform" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2.5 bg-[#FAF9F5] border-t border-[#E6E7DD] flex items-center justify-between text-[11px] text-[#778176]">
          <span>Navigation: Select any result to jump to management view</span>
          <span className="hidden sm:inline">Sri Adithya Organics Admin System</span>
        </div>
      </div>
    </div>
  );
};
