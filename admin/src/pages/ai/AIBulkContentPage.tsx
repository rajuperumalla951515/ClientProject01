import React, { useState, useEffect } from 'react';
import {
  Wand2,
  Package,
  Layers,
  Sparkles,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Check,
  Save,
  Search,
  Filter,
  ArrowRight,
  ShieldCheck,
  CheckSquare,
  Square
} from 'lucide-react';
import { api, aiApi } from '../../services/api';
import { Product, AIBulkDraftItem } from '../../types';
import { useToast } from '../../context/ToastContext';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

export const AIBulkContentPage: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Selected Products for batch (capped at 5)
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [batchTone, setBatchTone] = useState<'traditional_organic' | 'premium' | 'health_focused' | 'modern_gourmet'>('traditional_organic');

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [drafts, setDrafts] = useState<AIBulkDraftItem[]>([]);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [isApplyingAll, setIsApplyingAll] = useState(false);

  useEffect(() => {
    loadCatalog();
  }, []);

  const loadCatalog = async () => {
    try {
      const data = await api.getProducts();
      setProducts(data);
    } catch (err) {
      console.error('Failed to load products for bulk studio', err);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const getCategoryTitle = (cat: any): string => {
    if (!cat) return 'General';
    if (typeof cat === 'string') return cat;
    if (typeof cat === 'object' && cat.name) return String(cat.name);
    return 'General';
  };

  const categories = ['all', ...Array.from(new Set(products.map(p => getCategoryTitle(p.category)).filter(Boolean)))];

  const filteredProducts = products.filter(p => {
    const catTitle = getCategoryTitle(p.category);
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || catTitle === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleSelectProduct = (id: string) => {
    const idStr = String(id);
    if (selectedProductIds.includes(idStr)) {
      setSelectedProductIds(prev => prev.filter(item => item !== idStr));
    } else {
      if (selectedProductIds.length >= 5) {
        showError('Strict Zero-Cost Quota Guard: Max 5 products allowed per batch run.');
        return;
      }
      setSelectedProductIds(prev => [...prev, idStr]);
    }
  };

  const handleSelectFirst5 = () => {
    const first5 = filteredProducts.slice(0, 5).map(p => String(p.id));
    setSelectedProductIds(first5);
  };

  const handleClearSelection = () => {
    setSelectedProductIds([]);
  };

  const handleRunBatch = async () => {
    if (selectedProductIds.length === 0) {
      showError('Please select at least 1 product.');
      return;
    }
    if (selectedProductIds.length > 5) {
      showError('Zero-cost quota allows up to 5 items per batch.');
      return;
    }

    setIsGenerating(true);
    setProgress(15);

    try {
      // Simulate progress progression for realistic UX
      const progressTimer = setInterval(() => {
        setProgress(prev => (prev < 85 ? prev + 15 : prev));
      }, 700);

      const response = await aiApi.generateBulkContent({
        product_ids: selectedProductIds,
        tone: batchTone
      });

      clearInterval(progressTimer);
      setProgress(100);
      setDrafts(response.drafts || []);
      showSuccess(`Generated ${response.drafts?.length || 0} drafts safely under free quota!`);
    } catch (err: any) {
      showError(err.message || 'Bulk batch generation failed.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplySingleDraft = async (draft: AIBulkDraftItem) => {
    try {
      await aiApi.applyContentToProduct({
        product_id: draft.product_id,
        name: draft.title,
        description: draft.detailed_description || draft.short_description
      });
      setAppliedIds(prev => new Set([...prev, draft.product_id]));
      showSuccess(`Applied "${draft.title}" to product catalog!`);
      await loadCatalog();
    } catch (err: any) {
      showError(err.message || 'Failed to apply draft to catalog.');
    }
  };

  const handleApplyAllDrafts = async () => {
    if (drafts.length === 0) return;
    setIsApplyingAll(true);
    let successCount = 0;
    try {
      for (const draft of drafts) {
        if (!appliedIds.has(draft.product_id)) {
          await aiApi.applyContentToProduct({
            product_id: draft.product_id,
            name: draft.title,
            description: draft.detailed_description || draft.short_description
          });
          setAppliedIds(prev => new Set([...prev, draft.product_id]));
          successCount++;
        }
      }
      showSuccess(`Applied ${successCount} drafts directly to Cloudflare D1!`);
      await loadCatalog();
    } catch (err: any) {
      showError(err.message || 'Error occurred while applying drafts.');
    } finally {
      setIsApplyingAll(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header & Guardrail Notice */}
      <div className="bg-white rounded-2xl border border-[#E6E7DD] p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#244B37] text-white flex items-center justify-center shadow-xs">
              <Wand2 className="w-5 h-5 text-[#8A9B69]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-[#26352B]">Bulk Batch Content Studio</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" /> Free Tier Guardrails (Max 5/batch)
                </span>
              </div>
              <p className="text-xs text-[#778176]">
                Generate uniform marketing titles, authentic wood-pressed descriptions, and product highlights for multiple products in reviewable draft mode.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Selection Left, Drafts Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Product Picker (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-[#E6E7DD] p-5 shadow-xs space-y-4 flex flex-col">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#26352B] flex items-center gap-2">
              <Package className="w-4 h-4 text-[#496B45]" /> Select Catalog Products
            </h2>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#F6F5EF] border border-[#E6E7DD] text-[#244B37]">
              {selectedProductIds.length} / 5 selected
            </span>
          </div>

          {/* Search & Category Filter */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#778176] absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-[#E6E7DD] bg-[#FAF9F5] focus:bg-white outline-none"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
              {categories.map((cat: any) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors capitalize shrink-0 ${
                    selectedCategory === cat
                      ? 'bg-[#244B37] text-white'
                      : 'bg-[#FAF9F5] text-[#778176] hover:bg-[#F6F5EF]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Select Helpers */}
          <div className="flex items-center justify-between text-xs pt-1">
            <button
              onClick={handleSelectFirst5}
              className="text-[#496B45] hover:text-[#244B37] font-semibold"
            >
              Select First 5
            </button>
            <button
              onClick={handleClearSelection}
              className="text-[#778176] hover:text-rose-600 font-semibold"
            >
              Clear Selection
            </button>
          </div>

          {/* Product Checklist */}
          <div className="flex-1 max-h-80 overflow-y-auto space-y-1.5 pr-1 border border-[#E6E7DD] rounded-xl p-2 bg-[#FAF9F5]">
            {isLoadingProducts ? (
              <div className="py-8 text-center">
                <LoadingSpinner size="sm" text="Loading catalog..." />
              </div>
            ) : filteredProducts.length === 0 ? (
              <p className="text-center py-6 text-xs text-[#778176]">No matching products found.</p>
            ) : (
              filteredProducts.map((p) => {
                const isSelected = selectedProductIds.includes(String(p.id));
                return (
                  <div
                    key={p.id}
                    onClick={() => toggleSelectProduct(String(p.id))}
                    className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-white border-[#244B37] shadow-xs'
                        : 'bg-white/60 border-transparent hover:bg-white hover:border-[#E6E7DD]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="text-[#244B37]">
                        {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-[#778176]" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#26352B] truncate">{p.name}</p>
                        <p className="text-[10px] text-[#778176] truncate">{getCategoryTitle(p.category)} • ₹{p.price ?? p.min_price}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Tone Selector */}
          <div>
            <label className="block text-xs font-bold text-[#26352B] mb-1">Batch Copywriting Tone</label>
            <select
              value={batchTone}
              onChange={(e: any) => setBatchTone(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-[#E6E7DD] bg-[#FAF9F5] focus:border-[#244B37] outline-none"
            >
              <option value="traditional_organic">Traditional Wood-Pressed Organic</option>
              <option value="premium">Premium Artisanal & Farm-Fresh</option>
              <option value="health_focused">Ayurvedic Health & Wellness</option>
              <option value="modern_gourmet">Modern Culinary Gourmet</option>
            </select>
          </div>

          {/* Run Batch Action */}
          <button
            onClick={handleRunBatch}
            disabled={isGenerating || selectedProductIds.length === 0}
            className="w-full py-2.5 rounded-xl bg-[#244B37] hover:bg-[#1B3829] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors disabled:opacity-50"
          >
            {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            Generate Drafts for {selectedProductIds.length} Products
          </button>
        </div>

        {/* Right Column: Drafts Review Table (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Progress Bar (Visible during generation) */}
          {isGenerating && (
            <div className="bg-white rounded-2xl border border-[#E6E7DD] p-4 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#244B37] flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#496B45]" />
                  Generating draft content across multi-model router...
                </span>
                <span className="font-mono text-[#778176]">{progress}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#F6F5EF] overflow-hidden">
                <div
                  className="h-full bg-[#244B37] transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Drafts List & Review */}
          <div className="bg-white rounded-2xl border border-[#E6E7DD] p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E6E7DD] pb-3">
              <div>
                <h2 className="text-sm font-bold text-[#26352B] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#496B45]" /> Generated Content Drafts
                </h2>
                <span className="text-xs text-[#778176]">
                  Review drafts carefully before applying changes to the live customer storefront.
                </span>
              </div>

              {drafts.length > 0 && (
                <button
                  onClick={handleApplyAllDrafts}
                  disabled={isApplyingAll}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  {isApplyingAll ? 'Applying to D1...' : 'Apply All to Catalog'}
                </button>
              )}
            </div>

            {drafts.length === 0 ? (
              <div className="py-16 text-center text-[#778176]">
                <Wand2 className="w-8 h-8 text-[#8A9B69] mx-auto mb-2 opacity-50" />
                <p className="text-xs font-semibold">No active drafts. Select products on the left and run batch generation.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {drafts.map((draft, idx) => {
                  const isApplied = appliedIds.has(draft.product_id);
                  return (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border border-[#E6E7DD] bg-[#FAF9F5] space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-bold text-[#496B45] uppercase tracking-wider block">
                            {getCategoryTitle(draft.category) || 'Product'}
                          </span>
                          <h3 className="text-sm font-bold text-[#26352B]">{draft.title}</h3>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {isApplied ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Applied
                            </span>
                          ) : (
                            <button
                              onClick={() => handleApplySingleDraft(draft)}
                              className="px-3 py-1 rounded-xl bg-[#244B37] hover:bg-[#1B3829] text-white text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors"
                            >
                              <Save className="w-3 h-3" />
                              Apply to Catalog
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Description Preview */}
                      <p className="text-xs text-[#26352B] leading-relaxed">
                        {draft.short_description}
                      </p>

                      {/* Highlights */}
                      {draft.highlights && draft.highlights.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {draft.highlights.map((h: string, hIdx: number) => (
                            <span
                              key={hIdx}
                              className="px-2 py-0.5 rounded-md bg-white border border-[#E6E7DD] text-[10px] text-[#244B37]"
                            >
                              ✓ {h}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Model & Status Footer */}
                      <div className="pt-2 border-t border-[#E6E7DD] flex items-center justify-between text-[10px] text-[#778176]">
                        <span>Model: {draft.model || 'Cloudflare Workers AI'}</span>
                        <span className="font-mono">ID: {draft.product_id}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIBulkContentPage;