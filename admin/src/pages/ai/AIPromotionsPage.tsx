import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Tag,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Percent,
  IndianRupee,
  RefreshCw,
  Package,
  Calendar,
  AlertTriangle,
  ArrowRight,
  Send,
  Sliders,
  Check
} from 'lucide-react';
import { api, aiApi } from '../../services/api';
import { Product, AIPromotion } from '../../types';
import { useToast } from '../../context/ToastContext';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

export const AIPromotionsPage: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [promotions, setPromotions] = useState<AIPromotion[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [goal, setGoal] = useState<'growth' | 'clear_stock' | 'festival' | 'retention'>('festival');
  const [minMargin, setMinMargin] = useState<number>(18);
  const [targetAudience, setTargetAudience] = useState('All Customers');

  // Generation & Publishing States
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentPromo, setCurrentPromo] = useState<AIPromotion | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [prodsData, promosData] = await Promise.all([
        api.getProducts(),
        aiApi.getPromotions()
      ]);
      setProducts(prodsData);
      setPromotions(promosData);
    } catch (err) {
      console.error('Failed to load promotions or products', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGeneratePromotion = async () => {
    setIsGenerating(true);
    try {
      const payload: any = {
        goal,
        min_margin_percent: minMargin,
        target_audience: targetAudience
      };
      if (selectedProductId) {
        payload.product_id = selectedProductId;
      }

      const generated = await aiApi.generatePromotion(payload);
      setCurrentPromo(generated);
      showSuccess(`Margin-safe promotion generated via ${generated.provider || 'AI'}!`);
      // Reload list to include newly created draft
      const updatedPromos = await aiApi.getPromotions();
      setPromotions(updatedPromos);
    } catch (err: any) {
      showError(err.message || 'Failed to generate promotion.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePublishPromotion = async (promoId: string) => {
    setIsPublishing(true);
    try {
      const res = await aiApi.publishPromotion(promoId);
      showSuccess(res.message || 'Promotion published and coupon activated in Cloudflare D1!');
      // Refresh current and list
      if (currentPromo && String(currentPromo.id) === promoId) {
        setCurrentPromo(prev => prev ? { ...prev, status: 'active' } : null);
      }
      const updatedPromos = await aiApi.getPromotions();
      setPromotions(updatedPromos);
    } catch (err: any) {
      showError(err.message || 'Failed to publish promotion.');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header with Strict Financial Margin Notice */}
      <div className="bg-white rounded-2xl border border-[#E6E7DD] p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#244B37] text-white flex items-center justify-center shadow-xs">
              <TrendingUp className="w-5 h-5 text-[#8A9B69]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-[#26352B]">Promotion & Pricing Intelligence</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" /> Margin Guardrails Active
                </span>
              </div>
              <p className="text-xs text-[#778176]">
                AI suggests marketing campaigns, but backend math deterministically clamps discounts to protect minimum profit margins.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Form Left, Financial Preview Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Promotion Generator Form (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-[#E6E7DD] p-5 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-[#26352B] flex items-center gap-2">
            <Tag className="w-4 h-4 text-[#496B45]" /> Campaign Strategy Inputs
          </h2>

          {/* Product Target */}
          <div>
            <label className="block text-xs font-bold text-[#26352B] mb-1">Target Product</label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-[#E6E7DD] bg-[#FAF9F5] text-[#26352B] focus:border-[#244B37] outline-none"
            >
              <option value="">Storewide / All Wood-Pressed Oils</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} (₹{p.price ?? p.min_price})
                </option>
              ))}
            </select>
          </div>

          {/* Goal Selector */}
          <div>
            <label className="block text-xs font-bold text-[#26352B] mb-1">Strategic Objective</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'festival', label: 'Festival Special' },
                { id: 'growth', label: 'Customer Growth' },
                { id: 'clear_stock', label: 'Clear Stock' },
                { id: 'retention', label: 'Repeat Orders' }
              ].map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setGoal(g.id as any)}
                  className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition-all text-left ${
                    goal === g.id
                      ? 'bg-[#244B37] text-white border-[#244B37] shadow-xs'
                      : 'bg-[#FAF9F5] text-[#26352B] border-[#E6E7DD] hover:bg-[#F6F5EF]'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          {/* Minimum Margin Slider */}
          <div className="p-3.5 rounded-xl bg-[#FAF9F5] border border-[#E6E7DD] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#26352B] flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-[#496B45]" /> Minimum Margin Guardrail
              </span>
              <span className="font-mono font-bold text-[#244B37]">{minMargin}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="35"
              step="1"
              value={minMargin}
              onChange={(e) => setMinMargin(Number(e.target.value))}
              className="w-full accent-[#244B37] cursor-pointer"
            />
            <p className="text-[10px] text-[#778176]">
              Discounts will be mathematically reduced if they would push gross profit below this threshold.
            </p>
          </div>

          {/* Target Audience */}
          <div>
            <label className="block text-xs font-bold text-[#26352B] mb-1">Target Customer Segment</label>
            <input
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="e.g. First time buyers, Loyal monthly subscribers"
              className="w-full px-3 py-2 text-xs rounded-xl border border-[#E6E7DD] bg-[#FAF9F5] focus:border-[#244B37] outline-none"
            />
          </div>

          <button
            onClick={handleGeneratePromotion}
            disabled={isGenerating}
            className="w-full py-2.5 rounded-xl bg-[#244B37] hover:bg-[#1B3829] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors disabled:opacity-50"
          >
            {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Generate Margin-Safe Campaign
          </button>
        </div>

        {/* Right Column: Financial Card & Strategic Preview (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {currentPromo ? (
            <div className="bg-white rounded-2xl border border-[#E6E7DD] p-5 shadow-xs space-y-4">
              <div className="flex items-start justify-between gap-3 border-b border-[#E6E7DD] pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-[#244B37] text-white font-mono text-xs font-bold tracking-wider">
                      {currentPromo.coupon_code || currentPromo.suggested_code}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      currentPromo.status === 'active'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}>
                      {currentPromo.status}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-[#26352B] mt-1">{currentPromo.title}</h3>
                </div>

                {currentPromo.status === 'draft' ? (
                  <button
                    onClick={() => handlePublishPromotion(String(currentPromo.id))}
                    disabled={isPublishing}
                    className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors shrink-0 disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {isPublishing ? 'Publishing...' : 'Approve & Publish Coupon'}
                  </button>
                ) : (
                  <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                    <Check className="w-4 h-4" /> Live on Storefront
                  </span>
                )}
              </div>

              {/* Financial Guardrail Alert if Clamped */}
              {currentPromo.was_margin_adjusted && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-xs text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Backend Financial Rule Triggered:</span> The AI suggested a higher discount, but the backend automatically clamped it to {currentPromo.discount_percent ?? Math.round(((currentPromo.original_price - (currentPromo.final_price || currentPromo.discounted_price || 0)) / (currentPromo.original_price || 1)) * 100)}% to preserve your {minMargin}% profit margin.
                  </div>
                </div>
              )}

              {/* Financial Breakdown Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-[#FAF9F5] border border-[#E6E7DD]">
                  <span className="text-[10px] font-bold text-[#778176] uppercase">Original Retail</span>
                  <p className="text-sm font-bold text-[#26352B] mt-0.5">₹{currentPromo.original_price?.toFixed(2) || '0.00'}</p>
                </div>

                <div className="p-3 rounded-xl bg-[#FAF9F5] border border-[#E6E7DD]">
                  <span className="text-[10px] font-bold text-[#778176] uppercase">Discount %</span>
                  <p className="text-sm font-bold text-rose-700 mt-0.5">
                    -{currentPromo.discount_percent ?? Math.round(((currentPromo.original_price - (currentPromo.final_price || currentPromo.discounted_price || 0)) / (currentPromo.original_price || 1)) * 100)}%
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-[#FAF9F5] border border-[#E6E7DD]">
                  <span className="text-[10px] font-bold text-[#778176] uppercase">Final Price</span>
                  <p className="text-sm font-bold text-[#244B37] mt-0.5">₹{(currentPromo.final_price || currentPromo.discounted_price)?.toFixed(2) || '0.00'}</p>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase">Gross Margin</span>
                  <p className="text-sm font-bold text-emerald-900 mt-0.5">+{currentPromo.calculated_margin_percent ?? currentPromo.calculated_margin}%</p>
                </div>
              </div>

              {/* AI Strategic Reasoning */}
              <div className="p-3.5 rounded-xl bg-[#FAF9F5] border border-[#E6E7DD] space-y-1">
                <span className="text-[10px] font-bold text-[#496B45] uppercase tracking-wider block">
                  Campaign Strategic Reasoning
                </span>
                <p className="text-xs text-[#26352B] leading-relaxed">
                  {currentPromo.reasoning || currentPromo.description}
                </p>
              </div>

              {/* Guardrail Guarantee Banner */}
              <div className="p-3 rounded-xl bg-[#F6F5EF] border border-[#E6E7DD] flex items-center justify-between text-[11px] text-[#778176]">
                <span className="flex items-center gap-1.5 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Deterministic Python margin formulas executed on Cloudflare Workers.
                </span>
                <span className="font-mono text-[10px]">ID: {currentPromo.id}</span>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-dashed border-[#E6E7DD] p-12 text-center text-[#778176] shadow-xs">
              <TrendingUp className="w-8 h-8 text-[#8A9B69] mx-auto mb-2 opacity-50" />
              <p className="text-xs font-semibold">
                Configure your campaign parameters on the left to generate margin-safe promotions.
              </p>
            </div>
          )}

          {/* Past & Active Promotions Table */}
          <div className="bg-white rounded-2xl border border-[#E6E7DD] p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-[#244B37] uppercase tracking-wider">
              Campaign History & Active Coupons
            </h3>

            {promotions.length === 0 ? (
              <p className="text-xs text-[#778176] py-3">No promotions in database yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E6E7DD] text-[#778176]">
                      <th className="pb-2 font-bold">Code</th>
                      <th className="pb-2 font-bold">Campaign</th>
                      <th className="pb-2 font-bold">Discount</th>
                      <th className="pb-2 font-bold">Margin</th>
                      <th className="pb-2 font-bold">Status</th>
                      <th className="pb-2 font-bold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E6E7DD]">
                    {promotions.map((p) => (
                      <tr key={p.id} className="hover:bg-[#FAF9F5]">
                        <td className="py-2.5 font-mono font-bold text-[#244B37]">{p.coupon_code || p.suggested_code}</td>
                        <td className="py-2.5 text-[#26352B] font-medium">{p.title}</td>
                        <td className="py-2.5 text-rose-700 font-bold">
                          {p.discount_percent ?? Math.round(((p.original_price - (p.final_price || p.discounted_price || 0)) / (p.original_price || 1)) * 100)}%
                        </td>
                        <td className="py-2.5 text-emerald-800 font-bold">+{p.calculated_margin_percent ?? p.calculated_margin}%</td>
                        <td className="py-2.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            p.status === 'active'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="py-2.5 text-right">
                          {p.status === 'draft' && (
                            <button
                              onClick={() => handlePublishPromotion(String(p.id))}
                              className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900"
                            >
                              Publish
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIPromotionsPage;