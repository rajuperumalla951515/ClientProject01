import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, ArrowRight, ShieldCheck, AlertCircle, Database } from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useToast } from '../context/ToastContext';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('admin@sriadithyaorganics.com');
  const [password, setPassword] = useState('admin123');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { login } = useAdminAuth();
  const { showSuccess } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      await login(email, password);
      showSuccess('Welcome back to Sri Adithya Organics Admin Console!', 'Authentication Successful');
      navigate('/');
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F5EF] flex flex-col justify-center items-center p-4 relative font-sans text-[#26352B]">
      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center mb-2">
            <img
              src="/brand/sri-adithya-logo.png"
              alt="Sri Adithya Organics"
              className="h-20 sm:h-24 w-auto object-contain select-none"
              loading="eager"
              draggable={false}
            />
          </div>
          <h1 className="text-xl font-bold text-[#244B37] tracking-tight">
            Sri Adithya Organics
          </h1>
          <p className="text-xs font-semibold text-[#778176] tracking-wider mt-0.5">
            Enterprise Management System
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-3xl p-7 sm:p-8 shadow-card border border-[#E6E7DD]">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#E6E7DD]">
            <div>
              <h2 className="text-base font-bold text-[#26352B]">Sign In to Management</h2>
              <p className="text-xs text-[#778176] mt-0.5">Enter your verified store credentials</p>
            </div>
            <div className="w-8 h-8 rounded-xl bg-[#F1F4EC] text-[#244B37] flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-[#496B45]" />
            </div>
          </div>

          {errorMsg && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#26352B] mb-1.5 uppercase tracking-wider">
                Administrator Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#778176] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@sriadithyaorganics.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#FAF9F5] border border-[#E6E7DD] rounded-xl text-xs sm:text-sm text-[#26352B] placeholder-[#778176] focus:outline-none focus:border-[#496B45] focus:bg-white transition-all font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#26352B] mb-1.5 uppercase tracking-wider">
                Security Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#778176] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#FAF9F5] border border-[#E6E7DD] rounded-xl text-xs sm:text-sm text-[#26352B] placeholder-[#778176] focus:outline-none focus:border-[#496B45] focus:bg-white transition-all font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-[#244B37] hover:bg-[#1C3C2C] text-white font-bold text-xs uppercase tracking-wider shadow-xs hover:shadow-card-hover transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span>{isLoading ? 'Authorizing Access...' : 'Sign In to Portal'}</span>
              {!isLoading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          {/* Quick Credential Hint */}
          <div className="mt-5 p-3 rounded-xl bg-[#FAF9F5] border border-[#E6E7DD] text-center">
            <p className="text-[11px] text-[#778176]">
              Store Administrator Account: <span className="font-bold text-[#26352B]">admin@sriadithyaorganics.com</span>
            </p>
          </div>
        </div>

        {/* System Footnote */}
        <div className="mt-6 text-center text-xs text-[#778176] flex items-center justify-center gap-2">
          <Database className="w-3.5 h-3.5 text-[#496B45]" />
          <span>Cloudflare D1 Serverless Edge SQL & FastAPIBase</span>
        </div>
      </div>
    </div>
  );
};
