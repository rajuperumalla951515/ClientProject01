import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Type,
  FileText,
  Search,
  Languages,
  Check,
  Copy,
  RefreshCw,
  Package,
  Layers,
  ArrowRight,
  ExternalLink,
  HelpCircle,
  ShieldCheck,
  Save,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { api, aiApi } from '../../services/api';
import { Product, AITitleResponse, AIDescriptionResponse, AISEOResponse, AITransformResponse } from '../../types';
import { useToast } from '../../context/ToastContext';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

type StudioTab = 'title' | 'description' | 'seo' | 'transform';

export const AIContentStudioPage: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const [activeTab, setActiveTab] = useState<StudioTab>('title');
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  // Common Form State
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState('Wood-Pressed Oils');
  const [tone, setTone] = useState<'traditional_organic' | 'premium' | 'health_focused' | 'modern_gourmet'>('traditional_organic');
  const [keyFeatures, setKeyFeatures] = useState('Wood-pressed in Vaagai wood pestle, zero chemical refinement, pure unheated extraction, unadulterated farm produce');

  // Generation Loading States
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Results State
  const [titleResult, setTitleResult] = useState<AITitleResponse | null>(null);
  const [descResult, setDescResult] = useState<AIDescriptionResponse | null>(null);
  const [seoResult, setSeoResult] = useState<AISEOResponse | null>(null);
  const [transformResult, setTransformResult] = useState<AITransformResponse | null>(null);

  // Transform Tab State
  const [transformInput, setTransformInput] = useState('');
  const [transformMode, setTransformMode] = useState<'rewrite' | 'grammar' | 'concise' | 'expand' | 'telugu' | 'bilingual'>('bilingual');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const data = await api.getProducts();
      setProducts(data);
    } catch (err) {
      console.error('Failed to load products for studio selector', err);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const handleProductSelect = (prodId: string) => {
    setSelectedProductId(prodId);
    if (!prodId) return;
    const prod = products.find(p => String(p.id) === prodId);
    if (prod) {
      setProductName(prod.name);
      if (prod.category) setCategory(prod.category);
      if (prod.description) {
        setTransformInput(prod.description);
      }
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showSuccess('Copied to clipboard');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // 1. Generate Title
  const handleGenerateTitle = async () => {
    if (!productName.trim()) {
      showError('Please enter a product name');
      return;
    }
    setIsGenerating(true);
    try {
      const res = await aiApi.generateTitle({
        product_name: productName,
        category,
        tone
      });
      setTitleResult(res);
      showSuccess(`Titles generated via ${res.provider}!`);
    } catch (err: any) {
      showError(err.message || 'Failed to generate title');
    } finally {
      setIsGenerating(false);
    }
  };

  // 2. Generate Description
  const handleGenerateDescription = async () => {
    if (!productName.trim()) {
      showError('Please enter a product name');
      return;
    }
    setIsGenerating(true);
    try {
      const featuresArray = keyFeatures.split(/[,;\n]+/).map(f => f.trim()).filter(Boolean);
      const res = await aiApi.generateDescription({
        product_name: productName,
        category,
        key_features: featuresArray,
        tone
      });
      setDescResult(res);
      showSuccess(`Description generated via ${res.provider}!`);
    } catch (err: any) {
      showError(err.message || 'Failed to generate description');
    } finally {
      setIsGenerating(false);
    }
  };

  // 3. Generate SEO
  const handleGenerateSEO = async () => {
    if (!productName.trim()) {
      showError('Please enter a product name');
      return;
    }
    setIsGenerating(true);
    try {
      const res = await aiApi.generateSEO({
        product_name: productName,
        category
      });
      setSeoResult(res);
      showSuccess(`SEO metadata generated via ${res.provider}!`);
    } catch (err: any) {
      showError(err.message || 'Failed to generate SEO metadata');
    } finally {
      setIsGenerating(false);
    }
  };

  // 4. Transform Content
  const handleTransformContent = async () => {
    if (!transformInput.trim()) {
      showError('Please enter text to transform');
      return;
    }
    setIsGenerating(true);
    try {
      const res = await aiApi.transformContent({
        text: transformInput,
        mode: transformMode,
        target_language: transformMode === 'telugu' ? 'te' : undefined
      });
      setTransformResult(res);
      showSuccess(`Content transformed via ${res.provider}!`);
    } catch (err: any) {
      showError(err.message || 'Failed to transform content');
    } finally {
      setIsGenerating(false);
    }
  };

  // Apply to Product Catalog
  const handleApplyToProduct = async (type: 'title' | 'description' | 'seo') => {
    if (!selectedProductId) {
      showError('Please select a target product from your catalog first');
      return;
    }
    setIsApplying(true);
    try {
      let payload: any = { product_id: selectedProductId };
      if (type === 'title' && titleResult) {
        payload.name = titleResult.primary_title;
      } else if (type === 'description' && descResult) {
        payload.description = descResult.detailed_description || descResult.short_description;
      } else if (type === 'seo' && seoResult) {
        payload.meta_title = seoResult.meta_title;
        payload.meta_description = seoResult.meta_description;
        payload.keywords = seoResult.keywords?.join(', ');
      }
      await aiApi.applyContentToProduct(payload);
      showSuccess('Applied successfully to Cloudflare D1 product catalog!');
      await loadProducts();
    } catch (err: any) {
      showError(err.message || 'Failed to apply changes to catalog');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="bg-white rounded-2xl border border-[#E6E7DD] p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#244B37] text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5 text-[#8A9B69]" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#26352B]">AI Content & Copywriting Studio</h1>
              <p className="text-xs text-[#778176]">
                Generate authentic, organic marketing titles, detailed descriptions, regional Telugu translations, and SEO metadata.
              </p>
            </div>
          </div>

          {/* Product Quick-Loader Dropdown */}
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-[#8A9B69] shrink-0" />
            <select
              value={selectedProductId}
              onChange={(e) => handleProductSelect(e.target.value)}
              className="px-3 py-2 text-xs font-semibold rounded-xl border border-[#E6E7DD] bg-[#FAF9F5] text-[#26352B] focus:border-[#244B37] outline-none"
            >
              <option value="">-- Load from Existing Product --</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.category || 'General'})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Studio Navigation Tabs */}
        <div className="mt-6 flex border-b border-[#E6E7DD] gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('title')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'title'
                ? 'border-[#244B37] text-[#244B37]'
                : 'border-transparent text-[#778176] hover:text-[#26352B]'
            }`}
          >
            <Type className="w-4 h-4" />
            Title Generator
          </button>

          <button
            onClick={() => setActiveTab('description')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'description'
                ? 'border-[#244B37] text-[#244B37]'
                : 'border-transparent text-[#778176] hover:text-[#26352B]'
            }`}
          >
            <FileText className="w-4 h-4" />
            Description & Highlights
          </button>

          <button
            onClick={() => setActiveTab('seo')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'seo'
                ? 'border-[#244B37] text-[#244B37]'
                : 'border-transparent text-[#778176] hover:text-[#26352B]'
            }`}
          >
            <Search className="w-4 h-4" />
            SEO & Meta Generator
          </button>

          <button
            onClick={() => setActiveTab('transform')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'transform'
                ? 'border-[#244B37] text-[#244B37]'
                : 'border-transparent text-[#778176] hover:text-[#26352B]'
            }`}
          >
            <Languages className="w-4 h-4" />
            Telugu & Content Transformer
          </button>
        </div>
      </div>

      {/* TAB 1: TITLE GENERATOR */}
      {activeTab === 'title' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Input Form */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-[#E6E7DD] p-5 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-[#26352B] flex items-center gap-2">
              <Type className="w-4 h-4 text-[#496B45]" /> Product Details
            </h2>

            <div>
              <label className="block text-xs font-bold text-[#26352B] mb-1">Product Name</label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="e.g. Wood-Pressed Groundnut Oil"
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#E6E7DD] bg-[#FAF9F5] focus:border-[#244B37] focus:bg-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#26352B] mb-1">Category</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Wood-Pressed Oils, Forest Honey, Ghee"
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#E6E7DD] bg-[#FAF9F5] focus:border-[#244B37] focus:bg-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#26352B] mb-1">Tone & Voice</label>
              <select
                value={tone}
                onChange={(e: any) => setTone(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#E6E7DD] bg-[#FAF9F5] focus:border-[#244B37] focus:bg-white outline-none"
              >
                <option value="traditional_organic">Traditional & Authentic Organic</option>
                <option value="premium">Premium Artisanal & Farm-to-Table</option>
                <option value="health_focused">Ayurvedic & Health-Conscious</option>
                <option value="modern_gourmet">Modern Gourmet Culinary</option>
              </select>
            </div>

            <button
              onClick={handleGenerateTitle}
              disabled={isGenerating || !productName.trim()}
              className="w-full py-2.5 rounded-xl bg-[#244B37] hover:bg-[#1B3829] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors disabled:opacity-50"
            >
              {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Generate High-Converting Titles
            </button>
          </div>

          {/* Results Output */}
          <div className="lg:col-span-7 space-y-4">
            {titleResult ? (
              <div className="bg-white rounded-2xl border border-[#E6E7DD] p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-[#E6E7DD] pb-3">
                  <div>
                    <h3 className="text-xs font-bold text-[#244B37] uppercase tracking-wider">
                      Generated Titles
                    </h3>
                    <span className="text-[10px] text-[#778176]">
                      Powered by {titleResult.provider} ({titleResult.model})
                    </span>
                  </div>

                  {selectedProductId && (
                    <button
                      onClick={() => handleApplyToProduct('title')}
                      disabled={isApplying}
                      className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Apply Primary to Catalog
                    </button>
                  )}
                </div>

                {/* Primary Title */}
                <div className="p-3 rounded-xl bg-[#FAF9F5] border border-[#E6E7DD] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#496B45] uppercase">Primary Title</span>
                    <button
                      onClick={() => copyToClipboard(titleResult.primary_title, 'prim_title')}
                      className="text-xs text-[#778176] hover:text-[#244B37] flex items-center gap-1"
                    >
                      {copiedKey === 'prim_title' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                  <p className="text-sm font-bold text-[#26352B]">{titleResult.primary_title}</p>
                </div>

                {/* Short Title */}
                <div className="p-3 rounded-xl bg-[#FAF9F5] border border-[#E6E7DD] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#778176] uppercase">Short Title (Mobile Cards)</span>
                    <button
                      onClick={() => copyToClipboard(titleResult.short_title, 'short_title')}
                      className="text-xs text-[#778176] hover:text-[#244B37] flex items-center gap-1"
                    >
                      {copiedKey === 'short_title' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                  <p className="text-xs font-semibold text-[#26352B]">{titleResult.short_title}</p>
                </div>

                {/* SEO Title */}
                <div className="p-3 rounded-xl bg-[#FAF9F5] border border-[#E6E7DD] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#778176] uppercase">SEO Title</span>
                    <button
                      onClick={() => copyToClipboard(titleResult.seo_title, 'seo_title')}
                      className="text-xs text-[#778176] hover:text-[#244B37] flex items-center gap-1"
                    >
                      {copiedKey === 'seo_title' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                  <p className="text-xs font-semibold text-[#26352B]">{titleResult.seo_title}</p>
                </div>

                {/* Telugu Regional Name */}
                {(titleResult.regional_telugu_name || titleResult.traditional_name) && (
                  <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-amber-800 uppercase flex items-center gap-1">
                        <Languages className="w-3 h-3" /> Traditional Telugu Name
                      </span>
                      <button
                        onClick={() => copyToClipboard((titleResult.regional_telugu_name || titleResult.traditional_name)!, 'te_title')}
                        className="text-xs text-[#778176] hover:text-[#244B37] flex items-center gap-1"
                      >
                        {copiedKey === 'te_title' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                    <p className="text-sm font-semibold text-amber-950 font-sans">
                      {titleResult.regional_telugu_name || titleResult.traditional_name}
                    </p>
                  </div>
                )}

                {/* Alternative Titles */}
                {titleResult.alternatives && titleResult.alternatives.length > 0 && (
                  <div className="space-y-1.5 pt-2">
                    <span className="text-[10px] font-bold text-[#778176] uppercase">Alternative Suggestions</span>
                    <div className="space-y-1">
                      {titleResult.alternatives.map((alt, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 rounded-lg bg-[#FAF9F5] border border-[#E6E7DD] text-xs text-[#26352B]"
                        >
                          <span>{alt}</span>
                          <button
                            onClick={() => copyToClipboard(alt, `alt_${idx}`)}
                            className="text-[#778176] hover:text-[#244B37] transition-colors"
                          >
                            {copiedKey === `alt_${idx}` ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-dashed border-[#E6E7DD] p-12 text-center text-[#778176] shadow-xs">
                <Type className="w-8 h-8 text-[#8A9B69] mx-auto mb-2 opacity-50" />
                <p className="text-xs font-semibold">Enter product details and click generate to craft compelling titles.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: DESCRIPTION GENERATOR */}
      {activeTab === 'description' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white rounded-2xl border border-[#E6E7DD] p-5 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-[#26352B] flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#496B45]" /> Description Inputs
            </h2>

            <div>
              <label className="block text-xs font-bold text-[#26352B] mb-1">Product Name</label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="e.g. Wood-Pressed Sesame (Gingelly) Oil"
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#E6E7DD] bg-[#FAF9F5] focus:border-[#244B37] focus:bg-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#26352B] mb-1">Category</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#E6E7DD] bg-[#FAF9F5] focus:border-[#244B37] focus:bg-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#26352B] mb-1">Key Features / Extraction Method</label>
              <textarea
                rows={4}
                value={keyFeatures}
                onChange={(e) => setKeyFeatures(e.target.value)}
                placeholder="e.g. Cold pressed in wooden pestle, unrefined, zero sulfur, direct farm procurement..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#E6E7DD] bg-[#FAF9F5] focus:border-[#244B37] focus:bg-white outline-none"
              />
            </div>

            <button
              onClick={handleGenerateDescription}
              disabled={isGenerating || !productName.trim()}
              className="w-full py-2.5 rounded-xl bg-[#244B37] hover:bg-[#1B3829] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors disabled:opacity-50"
            >
              {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Generate Full Description & FAQs
            </button>
          </div>

          <div className="lg:col-span-7 space-y-4">
            {descResult ? (
              <div className="bg-white rounded-2xl border border-[#E6E7DD] p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-[#E6E7DD] pb-3">
                  <div>
                    <h3 className="text-xs font-bold text-[#244B37] uppercase tracking-wider">
                      Generated Product Content
                    </h3>
                    <span className="text-[10px] text-[#778176]">
                      Powered by {descResult.provider} ({descResult.model})
                    </span>
                  </div>

                  {selectedProductId && (
                    <button
                      onClick={() => handleApplyToProduct('description')}
                      disabled={isApplying}
                      className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Apply to Catalog
                    </button>
                  )}
                </div>

                {/* Short Description */}
                <div className="p-3 rounded-xl bg-[#FAF9F5] border border-[#E6E7DD] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#496B45] uppercase">Short Description</span>
                    <button
                      onClick={() => copyToClipboard(descResult.short_description, 'short_desc')}
                      className="text-xs text-[#778176] hover:text-[#244B37]"
                    >
                      {copiedKey === 'short_desc' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                  <p className="text-xs text-[#26352B] leading-relaxed">{descResult.short_description}</p>
                </div>

                {/* Detailed Narrative */}
                <div className="p-3 rounded-xl bg-[#FAF9F5] border border-[#E6E7DD] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#496B45] uppercase">Detailed Description</span>
                    <button
                      onClick={() => copyToClipboard(descResult.detailed_description, 'full_desc')}
                      className="text-xs text-[#778176] hover:text-[#244B37]"
                    >
                      {copiedKey === 'full_desc' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                  <div className="text-xs text-[#26352B] whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                    {descResult.detailed_description}
                  </div>
                </div>

                {/* Highlights */}
                {descResult.highlights && (
                  <div className="p-3 rounded-xl bg-[#FAF9F5] border border-[#E6E7DD] space-y-1">
                    <span className="text-[10px] font-bold text-[#496B45] uppercase">Key Highlights</span>
                    <ul className="list-disc list-inside text-xs text-[#26352B] space-y-1">
                      {descResult.highlights.map((h, i) => (
                        <li key={i}>{h}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Storage & Shelf Life */}
                {descResult.storage_instructions && (
                  <div className="p-3 rounded-xl bg-amber-50/40 border border-amber-200 text-xs text-amber-950">
                    <span className="font-bold block mb-1">Storage Instructions:</span>
                    {descResult.storage_instructions}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-dashed border-[#E6E7DD] p-12 text-center text-[#778176] shadow-xs">
                <FileText className="w-8 h-8 text-[#8A9B69] mx-auto mb-2 opacity-50" />
                <p className="text-xs font-semibold">Generate organic storytelling and detailed descriptions for your catalog.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: SEO GENERATOR */}
      {activeTab === 'seo' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white rounded-2xl border border-[#E6E7DD] p-5 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-[#26352B] flex items-center gap-2">
              <Search className="w-4 h-4 text-[#496B45]" /> SEO Parameters
            </h2>

            <div>
              <label className="block text-xs font-bold text-[#26352B] mb-1">Product Name</label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="e.g. Wood-Pressed Coconut Oil"
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#E6E7DD] bg-[#FAF9F5] focus:border-[#244B37] focus:bg-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#26352B] mb-1">Category</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#E6E7DD] bg-[#FAF9F5] focus:border-[#244B37] focus:bg-white outline-none"
              />
            </div>

            <button
              onClick={handleGenerateSEO}
              disabled={isGenerating || !productName.trim()}
              className="w-full py-2.5 rounded-xl bg-[#244B37] hover:bg-[#1B3829] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors disabled:opacity-50"
            >
              {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Generate Organic E-Commerce SEO
            </button>
          </div>

          <div className="lg:col-span-7 space-y-4">
            {seoResult ? (
              <div className="bg-white rounded-2xl border border-[#E6E7DD] p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-[#E6E7DD] pb-3">
                  <div>
                    <h3 className="text-xs font-bold text-[#244B37] uppercase tracking-wider">
                      SEO Optimization Results
                    </h3>
                    <span className="text-[10px] text-[#778176]">
                      Powered by {seoResult.provider} ({seoResult.model})
                    </span>
                  </div>

                  {selectedProductId && (
                    <button
                      onClick={() => handleApplyToProduct('seo')}
                      disabled={isApplying}
                      className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Apply SEO to Catalog
                    </button>
                  )}
                </div>

                {/* Google Snippet Search Preview */}
                <div className="p-4 rounded-xl bg-[#FAF9F5] border border-[#E6E7DD] space-y-1">
                  <span className="text-[10px] font-bold text-[#778176] uppercase block mb-1">
                    Google Search Snippet Preview
                  </span>
                  <div className="text-xs text-emerald-800 truncate">
                    https://sriadithyaorganics.pages.dev/product/{seoResult.slug || seoResult.slug_suggestion || 'wood-pressed-oil'}
                  </div>
                  <div className="text-sm font-semibold text-blue-700 hover:underline cursor-pointer">
                    {seoResult.meta_title}
                  </div>
                  <p className="text-xs text-[#26352B] line-clamp-2">
                    {seoResult.meta_description}
                  </p>
                </div>

                {/* Meta Title with Character Counter */}
                <div className="p-3 rounded-xl bg-[#FAF9F5] border border-[#E6E7DD] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#496B45] uppercase">
                      Meta Title ({seoResult.meta_title?.length || 0} chars)
                    </span>
                    <button
                      onClick={() => copyToClipboard(seoResult.meta_title, 'seo_meta_title')}
                      className="text-xs text-[#778176] hover:text-[#244B37]"
                    >
                      {copiedKey === 'seo_meta_title' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                  <p className="text-xs font-bold text-[#26352B]">{seoResult.meta_title}</p>
                </div>

                {/* Meta Description with Character Counter */}
                <div className="p-3 rounded-xl bg-[#FAF9F5] border border-[#E6E7DD] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#496B45] uppercase">
                      Meta Description ({seoResult.meta_description?.length || 0} chars)
                    </span>
                    <button
                      onClick={() => copyToClipboard(seoResult.meta_description, 'seo_meta_desc')}
                      className="text-xs text-[#778176] hover:text-[#244B37]"
                    >
                      {copiedKey === 'seo_meta_desc' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                  <p className="text-xs text-[#26352B] leading-relaxed">{seoResult.meta_description}</p>
                </div>

                {/* Keywords Chips */}
                {seoResult.keywords && (
                  <div className="p-3 rounded-xl bg-[#FAF9F5] border border-[#E6E7DD] space-y-2">
                    <span className="text-[10px] font-bold text-[#496B45] uppercase">Target Organic Keywords</span>
                    <div className="flex flex-wrap gap-1.5">
                      {seoResult.keywords.map((kw, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-lg bg-white border border-[#E6E7DD] text-[11px] font-medium text-[#244B37]"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-dashed border-[#E6E7DD] p-12 text-center text-[#778176] shadow-xs">
                <Search className="w-8 h-8 text-[#8A9B69] mx-auto mb-2 opacity-50" />
                <p className="text-xs font-semibold">Generate high-ranking Google e-commerce SEO titles, tags, and slugs.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: TRANSFORMER & TELUGU */}
      {activeTab === 'transform' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-[#E6E7DD] p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-[#26352B] flex items-center gap-2">
                  <Languages className="w-4 h-4 text-[#496B45]" /> Content Transformation & Regional Language
                </h2>
                <p className="text-xs text-[#778176]">
                  Transform existing copy into polished marketing text, concise mobile summaries, or authentic Telugu translations.
                </p>
              </div>

              {/* Mode Selector */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-[#26352B]">Mode:</label>
                <select
                  value={transformMode}
                  onChange={(e: any) => setTransformMode(e.target.value)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-[#E6E7DD] bg-[#FAF9F5] text-[#26352B] outline-none"
                >
                  <option value="bilingual">Bilingual (English + Telugu)</option>
                  <option value="telugu">Telugu Translation Only (తెలుగు)</option>
                  <option value="rewrite">Fresh Organic Copywriting</option>
                  <option value="grammar">Grammar & Tone Polish</option>
                  <option value="concise">Shorten for Mobile Cards</option>
                  <option value="expand">Rich Narrative Expand</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Source Text Input */}
              <div>
                <label className="block text-xs font-bold text-[#26352B] mb-1">Source Text</label>
                <textarea
                  rows={8}
                  value={transformInput}
                  onChange={(e) => setTransformInput(e.target.value)}
                  placeholder="Paste product description, email text, or promotional copy here..."
                  className="w-full px-3 py-2.5 text-xs rounded-xl border border-[#E6E7DD] bg-[#FAF9F5] focus:border-[#244B37] focus:bg-white outline-none leading-relaxed"
                />
              </div>

              {/* Transformed Result Output */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-[#244B37]">AI Transformed Result</label>
                  {transformResult && (
                    <button
                      onClick={() => copyToClipboard(transformResult.transformed_text, 'trans_out')}
                      className="text-xs text-[#778176] hover:text-[#244B37] flex items-center gap-1"
                    >
                      {copiedKey === 'trans_out' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      Copy Result
                    </button>
                  )}
                </div>
                <div className="w-full h-44 md:h-52 p-3 text-xs rounded-xl border border-[#E6E7DD] bg-white overflow-y-auto leading-relaxed whitespace-pre-wrap">
                  {transformResult ? (
                    transformResult.transformed_text
                  ) : (
                    <span className="text-[#778176] italic">Transformed output will appear here...</span>
                  )}
                </div>
                {transformResult && (
                  <div className="mt-1 text-[10px] text-[#778176] flex items-center justify-between">
                    <span>Provider: {transformResult.provider} ({transformResult.model})</span>
                    <span>Mode: {transformResult.mode}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleTransformContent}
                disabled={isGenerating || !transformInput.trim()}
                className="px-6 py-2.5 rounded-xl bg-[#244B37] hover:bg-[#1B3829] text-white text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50"
              >
                {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Run Content Transformation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIContentStudioPage;