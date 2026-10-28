import React, { useState } from 'react';
import { X, Mail, Lock, User, Phone, ArrowRight, ShieldCheck, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { BrandLogo } from './BrandLogo';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen, closeAuthModal, authModalMode, openLoginModal, openRegisterModal,
    login, register
  } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (authModalMode === 'login') {
        await login(email, password);
      } else {
        if (!name.trim()) throw new Error('Please enter your full name.');
        await register(name, email, password, phone);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillDemoCustomer = () => {
    setEmail('arjun.sharma@example.com');
    setPassword('customer123');
    setError(null);
  };

  const fillDemoAdmin = () => {
    setEmail('admin@sriadithyaorganics.com');
    setPassword('admin123');
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div onClick={closeAuthModal} className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm transition-opacity" />

      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-md rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-stone-200">
          
          {/* Close button */}
          <button
            onClick={closeAuthModal}
            className="absolute top-5 right-5 p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-3">
              <BrandLogo size="md" showTagline={false} />
            </div>
            <h3 className="font-display font-bold text-xl text-stone-900">
              {authModalMode === 'login' ? 'Welcome Back' : 'Create an Account'}
            </h3>
            <p className="text-xs text-stone-500 mt-1">
              {authModalMode === 'login'
                ? 'Sign in to access your saved organic groceries and fast checkout.'
                : 'Join Sri Adithya Organics for traditional wood-pressed oils & pure organic grocery delivery.'}
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {authModalMode === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Full Name</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Arjun Sharma"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-medium focus:outline-none focus:border-rootly-forest"
                    />
                    <User className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Mobile Number</label>
                  <div className="relative">
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98450 12345"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-medium focus:outline-none focus:border-rootly-forest"
                    />
                    <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-medium focus:outline-none focus:border-rootly-forest"
                />
                <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">Password</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-medium focus:outline-none focus:border-rootly-forest"
                />
                <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-rootly-forest hover:bg-rootly-dark text-white font-bold text-xs shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <span>{authModalMode === 'login' ? 'Sign In' : 'Create Account'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* 1-Click Demo Accounts */}
          {authModalMode === 'login' && (
            <div className="mt-5 pt-4 border-t border-stone-100">
              <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400 text-center mb-2.5">
                Quick Demo Accounts (1-Click Fill)
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={fillDemoCustomer}
                  className="p-2 rounded-xl bg-stone-50 hover:bg-rootly-sageMist/50 border border-stone-200 text-left transition-all"
                >
                  <p className="text-xs font-bold text-stone-900">Arjun Sharma</p>
                  <p className="text-[10px] text-stone-500">Customer demo</p>
                </button>
                <button
                  type="button"
                  onClick={fillDemoAdmin}
                  className="p-2 rounded-xl bg-stone-50 hover:bg-amber-50 border border-stone-200 text-left transition-all"
                >
                  <p className="text-xs font-bold text-amber-900">Sri Adithya Admin</p>
                  <p className="text-[10px] text-stone-500">Admin dashboard</p>
                </button>
              </div>
            </div>
          )}

          {/* Toggle Login / Register */}
          <div className="mt-5 text-center text-xs text-stone-500">
            {authModalMode === 'login' ? (
              <p>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={openRegisterModal}
                  className="font-bold text-rootly-forest hover:underline"
                >
                  Register now
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={openLoginModal}
                  className="font-bold text-rootly-forest hover:underline"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

