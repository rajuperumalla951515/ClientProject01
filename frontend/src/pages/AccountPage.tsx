import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  User, Package, MapPin, Heart, LogOut, Plus, Edit2, Trash2, Home,
  Briefcase, Building, ChevronRight, Clock, ShieldCheck, Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Order, Address, Product } from '../types';
import { ProductCard } from '../components/ProductCard';

export const AccountPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'orders';

  const { user, logout, refreshUser } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [wishlistItems, setWishlistItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Address modal
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [newLabel, setNewLabel] = useState('Home');
  const [newRecipient, setNewRecipient] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newStreet, setNewStreet] = useState('');
  const [newPostalCode, setNewPostalCode] = useState('560038');

  // Profile Edit modal
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    setEditName(user.name);
    setEditPhone(user.phone || '');
    setNewRecipient(user.name);
    setNewPhone(user.phone || '');

    const loadData = async () => {
      setIsLoading(true);
      try {
        const [ord, addr, wish] = await Promise.all([
          api.getOrders(),
          api.getAddresses(),
          api.getWishlist(),
        ]);
        setOrders(ord);
        setAddresses(addr);
        setWishlistItems(wish);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [user, navigate]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.updateProfile({ name: editName, phone: editPhone });
      await refreshUser();
      setIsEditingProfile(false);
    } catch (err: any) {
      alert(err.message || 'Failed to update profile.');
    }
  };

  const handleCreateAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await api.createAddress({
        label: newLabel,
        recipient_name: newRecipient,
        phone: newPhone,
        street: newStreet,
        city: 'Bengaluru',
        state: 'Karnataka',
        postal_code: newPostalCode,
        is_default: addresses.length === 0,
      });
      setAddresses([...addresses, created]);
      setIsAddingAddress(false);
    } catch (err: any) {
      alert(err.message || 'Failed to add address.');
    }
  };

  const handleDeleteAddress = async (id: number) => {
    if (!confirm('Are you sure you want to delete this address?')) return;
    try {
      await api.deleteAddress(id);
      setAddresses(addresses.filter((a) => a.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete address.');
    }
  };

  const handleSetDefaultAddress = async (id: number) => {
    try {
      await api.setDefaultAddress(id);
      setAddresses(
        addresses.map((a) => ({
          ...a,
          is_default: a.id === id,
        }))
      );
    } catch (err: any) {
      alert(err.message || 'Failed to set default.');
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
      
      {/* User Overview Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-stone-200 shadow-soft flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-rootly-forest text-white flex items-center justify-center font-display font-black text-2xl uppercase shadow-md">
            {user.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display font-black text-xl sm:text-2xl text-stone-900">{user.name}</h1>
              {user.role === 'admin' && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                  Admin
                </span>
              )}
            </div>
            <p className="text-xs text-stone-500 mt-0.5">{user.email} • {user.phone || 'No phone set'}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsEditingProfile(true)}
            className="px-4 py-2 rounded-xl border border-stone-200 hover:border-rootly-forest text-xs font-bold text-stone-700 hover:text-rootly-forest transition-all flex items-center gap-1.5"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Edit Profile</span>
          </button>
          <button
            onClick={logout}
            className="px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-xs font-bold text-red-600 transition-all flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Tabs Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Tab Sidebar / Mobile Segmented Control */}
        <div className="lg:col-span-3 flex lg:flex-col gap-2 overflow-x-auto no-scrollbar pb-1 lg:pb-0">
          <button
            onClick={() => setSearchParams({ tab: 'orders' })}
            className={`flex-1 sm:flex-initial lg:w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all shrink-0 ${
              currentTab === 'orders'
                ? 'bg-rootly-forest text-white shadow-sm'
                : 'bg-white hover:bg-stone-50 text-stone-700 border border-stone-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              <span className="hidden sm:inline">My Orders</span>
              <span className="sm:hidden">Orders</span>
            </div>
            <span className="text-[11px] opacity-80 bg-black/10 px-1.5 py-0.5 rounded-full">{orders.length}</span>
          </button>

          <button
            onClick={() => setSearchParams({ tab: 'addresses' })}
            className={`flex-1 sm:flex-initial lg:w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all shrink-0 ${
              currentTab === 'addresses'
                ? 'bg-rootly-forest text-white shadow-sm'
                : 'bg-white hover:bg-stone-50 text-stone-700 border border-stone-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              <span className="hidden sm:inline">Saved Addresses</span>
              <span className="sm:hidden">Addresses</span>
            </div>
            <span className="text-[11px] opacity-80 bg-black/10 px-1.5 py-0.5 rounded-full">{addresses.length}</span>
          </button>

          <button
            onClick={() => setSearchParams({ tab: 'wishlist' })}
            className={`flex-1 sm:flex-initial lg:w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all shrink-0 ${
              currentTab === 'wishlist'
                ? 'bg-rootly-forest text-white shadow-sm'
                : 'bg-white hover:bg-stone-50 text-stone-700 border border-stone-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4" />
              <span className="hidden sm:inline">My Wishlist</span>
              <span className="sm:hidden">Wishlist</span>
            </div>
            <span className="text-[11px] opacity-80 bg-black/10 px-1.5 py-0.5 rounded-full">{wishlistItems.length}</span>
          </button>

          {user.role === 'admin' && (
            <Link
              to="/admin"
              className="lg:w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 transition-all shrink-0"
            >
              <span>Admin Dashboard →</span>
            </Link>
          )}
        </div>

        {/* Tab Content */}
        <div className="lg:col-span-9">
          
          {/* TAB 1: MY ORDERS */}
          {currentTab === 'orders' && (
            <div className="space-y-4">
              <h3 className="font-display font-bold text-lg text-stone-900">Past Orders & Invoices</h3>
              
              {orders.length === 0 ? (
                <div className="p-12 text-center rounded-3xl bg-white border border-stone-200">
                  <Package className="w-12 h-12 text-stone-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-stone-800">No orders yet</p>
                  <p className="text-xs text-stone-500 mt-1 mb-4">When you place an organic order, it will appear here.</p>
                  <Link to="/products" className="px-5 py-2.5 rounded-xl bg-rootly-forest text-white text-xs font-bold">
                    Start Shopping
                  </Link>
                </div>
              ) : (
                orders.map((ord) => (
                  <div
                    key={ord.id}
                    className="p-5 sm:p-6 rounded-3xl bg-white border border-stone-200 shadow-soft space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-100">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-extrabold text-stone-900">
                            #{ord.order_number}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            ord.status === 'delivered' ? 'bg-emerald-100 text-emerald-800' :
                            ord.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                            ord.status === 'out_for_delivery' ? 'bg-purple-100 text-purple-800' :
                            'bg-stone-100 text-stone-700'
                          }`}>
                            {ord.status.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-400 mt-0.5">
                          {new Date(ord.created_at).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                        </p>
                      </div>

                      <div className="text-left sm:text-right">
                        <span className="font-display font-black text-base text-stone-900">₹{ord.total_amount}</span>
                        <p className="text-[10px] text-stone-400 capitalize">{ord.payment_method} • {ord.payment_status}</p>
                      </div>
                    </div>

                    {/* Order items */}
                    <div className="space-y-2">
                      {ord.items.map((item) => (
                        <div key={item.id} className="flex justify-between items-center text-xs">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={item.image_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=150'}
                              alt={item.product_name}
                              className="w-10 h-10 rounded-lg object-cover border border-stone-100"
                            />
                            <div>
                              <p className="font-bold text-stone-800">{item.product_name}</p>
                              <p className="text-[10px] text-stone-400">{item.variant_name} × {item.quantity}</p>
                            </div>
                          </div>
                          <p className="font-bold text-stone-900">₹{item.total_price}</p>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-stone-100 flex justify-between items-center text-xs">
                      <span className="text-stone-500 font-medium">Slot: {ord.delivery_slot}</span>
                      <Link
                        to={`/order-confirmation/${ord.id}`}
                        className="font-bold text-rootly-forest hover:underline"
                      >
                        View Full Receipt & Tracking →
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 2: SAVED ADDRESSES */}
          {currentTab === 'addresses' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-lg text-stone-900">Delivery Addresses</h3>
                <button
                  onClick={() => setIsAddingAddress(!isAddingAddress)}
                  className="px-4 py-2 rounded-xl bg-rootly-forest text-white text-xs font-bold hover:bg-rootly-dark transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add New Address</span>
                </button>
              </div>

              {/* Add form */}
              {isAddingAddress && (
                <form onSubmit={handleCreateAddress} className="p-6 rounded-3xl bg-white border border-stone-200 shadow-soft space-y-3">
                  <h4 className="font-bold text-sm text-stone-900">New Address Details</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">Label</label>
                      <select
                        value={newLabel}
                        onChange={(e) => setNewLabel(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-stone-200 text-xs font-semibold"
                      >
                        <option value="Home">Home</option>
                        <option value="Work">Work</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">Recipient Name</label>
                      <input
                        type="text"
                        required
                        value={newRecipient}
                        onChange={(e) => setNewRecipient(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-stone-200 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">Phone</label>
                      <input
                        type="tel"
                        required
                        value={newPhone}
                        onChange={(e) => setNewPhone(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-stone-200 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">PIN Code (Bengaluru)</label>
                      <input
                        type="text"
                        maxLength={6}
                        required
                        value={newPostalCode}
                        onChange={(e) => setNewPostalCode(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-stone-200 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">Street Address</label>
                    <input
                      type="text"
                      required
                      value={newStreet}
                      onChange={(e) => setNewStreet(e.target.value)}
                      placeholder="Flat No, Apartment, Street name"
                      className="w-full p-2.5 rounded-xl border border-stone-200 text-xs"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingAddress(false)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-rootly-forest text-white text-xs font-bold"
                    >
                      Save Address
                    </button>
                  </div>
                </form>
              )}

              {/* List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {addresses.map((addr) => {
                  const Icon = addr.label.toLowerCase() === 'work' ? Briefcase : addr.label.toLowerCase() === 'home' ? Home : Building;
                  return (
                    <div
                      key={addr.id}
                      className="p-5 rounded-3xl bg-white border border-stone-200 shadow-soft flex flex-col justify-between space-y-3"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-900">
                            <Icon className="w-4 h-4 text-rootly-forest" />
                            {addr.label}
                          </span>
                          {addr.is_default && (
                            <span className="text-[10px] font-bold text-rootly-forest bg-rootly-sageMist px-2 py-0.5 rounded-md">
                              Default Address
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-bold text-stone-800">{addr.recipient_name} ({addr.phone})</p>
                        <p className="text-xs text-stone-600 mt-1">{addr.street}</p>
                        <p className="text-[11px] text-stone-400 font-mono">{addr.city} - {addr.postal_code}</p>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-stone-100 text-xs">
                        {!addr.is_default ? (
                          <button
                            onClick={() => handleSetDefaultAddress(addr.id)}
                            className="text-stone-500 hover:text-rootly-forest font-semibold"
                          >
                            Set as default
                          </button>
                        ) : (
                          <span />
                        )}
                        <button
                          onClick={() => handleDeleteAddress(addr.id)}
                          className="text-red-500 hover:underline font-semibold"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: WISHLIST */}
          {currentTab === 'wishlist' && (
            <div className="space-y-4">
              <h3 className="font-display font-bold text-lg text-stone-900">My Saved Wishlist</h3>
              {wishlistItems.length === 0 ? (
                <div className="p-12 text-center rounded-3xl bg-white border border-stone-200">
                  <Heart className="w-12 h-12 text-stone-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-stone-800">Your wishlist is empty</p>
                  <p className="text-xs text-stone-500 mt-1 mb-4">Click the heart icon on any product to save it here for later.</p>
                  <Link to="/products" className="px-5 py-2.5 rounded-xl bg-rootly-forest text-white text-xs font-bold">
                    Browse Products
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {wishlistItems.map((item) => (
                    <ProductCard key={item.id} product={item.product} />
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

      </div>

      {/* Edit Profile Modal */}
      {isEditingProfile && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div onClick={() => setIsEditingProfile(false)} className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm" />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-stone-200">
              <h3 className="font-display font-bold text-lg text-stone-900 mb-4">Edit Profile</h3>
              <form onSubmit={handleUpdateProfile} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-stone-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-stone-200 text-xs"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-rootly-forest text-white text-xs font-bold"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

