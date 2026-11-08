import React, { useEffect, useState, useMemo } from 'react';
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  Package,
  Search,
  CheckCircle,
  XCircle,
  FolderTree,
  ExternalLink,
  SlidersHorizontal,
  Sparkles,
  Check
} from 'lucide-react';
import { api, aiApi } from '../services/api';
import { Category } from '../types';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { useToast } from '../context/ToastContext';

export const CategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // AI Suggestion State
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<{
    description?: string;
    short_summary?: string;
    slug?: string;
    seo_title?: string;
    keywords?: string[];
  } | null>(null);

  // Unsplash Banner Picker State
  const [unsplashModalOpen, setUnsplashModalOpen] = useState(false);
  const [unsplashSearchQuery, setUnsplashSearchQuery] = useState('');
  const [unsplashResults, setUnsplashResults] = useState<any[]>([]);
  const [isLoadingUnsplash, setIsLoadingUnsplash] = useState(false);

  // Delete State
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { showSuccess, showError } = useToast();

  const loadCategories = async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const data = await api.getCategories();
      setCategories(data);
      if (isManual) {
        showSuccess('Categories synced from Cloudflare D1.', 'Synchronized');
      }
    } catch (err: any) {
      showError(err.message || 'Failed to load categories.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const openAddModal = () => {
    setEditingCategory(null);
    setFormName('');
    setFormSlug('');
    setFormDescription('');
    setFormImageUrl('https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600');
    setFormIsActive(true);
    setAiSuggestion(null);
    setIsModalOpen(true);
  };

  const openEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setFormName(cat.name);
    setFormSlug(cat.slug || '');
    setFormDescription(cat.description || '');
    setFormImageUrl(cat.image_url || '');
    setFormIsActive(cat.is_active !== false);
    setAiSuggestion(null);
    setIsModalOpen(true);
  };

  const handleAiSuggestCategory = async () => {
    if (!formName.trim()) {
      showError('Please enter a Category Name first.');
      return;
    }
    setIsGeneratingAI(true);
    try {
      const res = await aiApi.suggestCategory(formName.trim());
      setAiSuggestion(res);
      showSuccess('AI suggestions generated. Review and click Accept below.', 'AI Ready');
    } catch (err: any) {
      showError(err.message || 'Failed to generate category suggestions.');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const applyAiSuggestion = () => {
    if (!aiSuggestion) return;
    if (aiSuggestion.description) setFormDescription(aiSuggestion.description);
    if (aiSuggestion.slug) setFormSlug(aiSuggestion.slug);
    showSuccess('AI suggestions applied to form.');
    setAiSuggestion(null);
  };

  // Generate slug automatically when name changes (if new category or slug not manually customized)
  const handleNameChange = (val: string) => {
    setFormName(val);
    if (!editingCategory) {
      setFormSlug(
        val
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-')
          .trim()
      );
    }
  };

  const handleOpenUnsplashBanner = async () => {
    const q = (formName || 'organic farm banner').trim();
    setUnsplashSearchQuery(q);
    setUnsplashModalOpen(true);
    setIsLoadingUnsplash(true);
    try {
      const res = await aiApi.searchUnsplash(q, 'Category Banner', 12);
      setUnsplashResults(res.results || []);
    } catch (err: any) {
      showError(err.message || 'Failed to fetch Unsplash banners.');
    } finally {
      setIsLoadingUnsplash(false);
    }
  };

  const handleSearchUnsplashBannerSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!unsplashSearchQuery.trim()) return;
    setIsLoadingUnsplash(true);
    try {
      const res = await aiApi.searchUnsplash(unsplashSearchQuery.trim(), 'Category Banner', 12);
      setUnsplashResults(res.results || []);
    } catch (err: any) {
      showError(err.message || 'Failed to search Unsplash banners.');
    } finally {
      setIsLoadingUnsplash(false);
    }
  };

  const handleSelectBanner = (url: string) => {
    setFormImageUrl(url);
    setUnsplashModalOpen(false);
    showSuccess('Unsplash banner image applied.');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      showError('Category name is required.');
      return;
    }

    setIsSaving(true);
    try {
      if (editingCategory) {
        await api.updateCategory(editingCategory.id, {
          name: formName.trim(),
          description: formDescription.trim(),
          image_url: formImageUrl.trim(),
          is_active: formIsActive,
        });
        showSuccess(`Category "${formName}" updated.`, 'Category Saved');
      } else {
        await api.createCategory({
          name: formName.trim(),
          description: formDescription.trim(),
          image_url: formImageUrl.trim(),
        });
        showSuccess(`Category "${formName}" created.`, 'Category Created');
      }
      setIsModalOpen(false);
      loadCategories();
    } catch (err: any) {
      showError(err.message || 'Failed to save category.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!categoryToDelete) return;
    setIsDeleting(true);
    try {
      await api.deleteCategory(categoryToDelete.id);
      showSuccess(`Category "${categoryToDelete.name}" deactivated.`, 'Category Deactivated');
      setCategoryToDelete(null);
      loadCategories();
    } catch (err: any) {
      showError(err.message || 'Failed to deactivate category.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered categories
  const filteredCategories = useMemo(() => {
    return categories.filter((cat) => {
      const matchesSearch =
        cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (cat.description && cat.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (cat.slug && cat.slug.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'active'
          ? cat.is_active !== false
          : cat.is_active === false;

      return matchesSearch && matchesStatus;
    });
  }, [categories, searchQuery, statusFilter]);

  const activeCount = useMemo(() => categories.filter((c) => c.is_active !== false).length, [categories]);
  const totalProducts = useMemo(
    () => categories.reduce((sum, c) => sum + (c.product_count || 0), 0),
    [categories]
  );

  return (
    <div className="space-y-6">
      {/* Top Banner / Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-[#E6E7DD] shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-[#778176] uppercase tracking-wider">Total Categories</p>
            <p className="text-2xl font-bold text-[#26352B] mt-1 font-serif">{categories.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#F6F5EF] text-[#244B37] flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#E6E7DD] shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-[#778176] uppercase tracking-wider">Active Taxonomies</p>
            <p className="text-2xl font-bold text-[#244B37] mt-1 font-serif">{activeCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#E6E7DD] shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-[#778176] uppercase tracking-wider">Categorized Products</p>
            <p className="text-2xl font-bold text-[#26352B] mt-1 font-serif">{totalProducts}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#F6F5EF] text-[#496B45] flex items-center justify-center">
            <Package className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#E6E7DD] shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#778176]" />
            <input
              type="text"
              placeholder="Search category name, description, or slug..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-[#E6E7DD] bg-[#F6F5EF]/40 text-xs text-[#26352B] placeholder:text-[#778176] focus:outline-none focus:ring-2 focus:ring-[#244B37] focus:bg-white transition-all"
            />
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-[#F6F5EF] rounded-xl border border-[#E6E7DD]">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === 'all' ? 'bg-white text-[#244B37] shadow-xs' : 'text-[#778176] hover:text-[#26352B]'
              }`}
            >
              All ({categories.length})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === 'active' ? 'bg-white text-emerald-800 shadow-xs' : 'text-[#778176] hover:text-[#26352B]'
              }`}
            >
              Active ({activeCount})
            </button>
            <button
              onClick={() => setStatusFilter('inactive')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === 'inactive' ? 'bg-white text-rose-800 shadow-xs' : 'text-[#778176] hover:text-[#26352B]'
              }`}
            >
              Inactive ({categories.length - activeCount})
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2.5 justify-end">
          <button
            onClick={() => loadCategories(true)}
            disabled={isRefreshing}
            className="p-2 rounded-xl border border-[#E6E7DD] text-[#778176] hover:text-[#26352B] hover:bg-[#F6F5EF] transition-colors"
            title="Refresh Categories"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#244B37]' : ''}`} />
          </button>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#244B37] hover:bg-[#1b3829] text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Category</span>
          </button>
        </div>
      </div>

      {/* Categories Grid */}
      {isLoading ? (
        <LoadingSpinner text="Reading category taxonomy from Cloudflare D1..." />
      ) : filteredCategories.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No Categories Found"
          description={
            searchQuery
              ? `No categories match "${searchQuery}". Clear your search query to see all collections.`
              : 'Create your first organic produce category to organize harvest products.'
          }
          action={searchQuery ? undefined : { label: 'Add Category', onClick: openAddModal }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredCategories.map((cat) => (
            <div
              key={cat.id}
              className="bg-white rounded-2xl border border-[#E6E7DD] shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col group"
            >
              <div className="h-36 relative overflow-hidden bg-[#F6F5EF]">
                <img
                  src={cat.image_url || 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600'}
                  alt={cat.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600';
                  }}
                />
                <div className="absolute top-2.5 left-2.5">
                  {cat.is_active !== false ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/95 text-emerald-800 shadow-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/95 text-rose-700 shadow-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                      Inactive
                    </span>
                  )}
                </div>

                <div className="absolute top-2.5 right-2.5 flex gap-1.5">
                  <button
                    onClick={() => openEditModal(cat)}
                    className="p-1.5 rounded-lg bg-white/95 backdrop-blur-sm text-[#26352B] hover:text-[#244B37] hover:bg-white shadow-xs transition-colors"
                    title="Edit Category"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setCategoryToDelete(cat)}
                    className="p-1.5 rounded-lg bg-white/95 backdrop-blur-sm text-rose-700 hover:text-rose-900 hover:bg-white shadow-xs transition-colors"
                    title="Deactivate Category"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-[#26352B] truncate">{cat.name}</h3>
                    <span className="text-[11px] font-semibold text-[#496B45] bg-[#F6F5EF] px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                      <Package className="w-3 h-3" />
                      {cat.product_count ?? 0}
                    </span>
                  </div>
                  <p className="text-xs text-[#778176] mt-1.5 line-clamp-2 leading-relaxed">
                    {cat.description || 'Certified traditional wood-pressed oils & natural harvest.'}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-[#E6E7DD] flex items-center justify-between text-[11px] text-[#778176]">
                  <span className="font-mono text-[10px] text-[#778176]">/{cat.slug || cat.name.toLowerCase().replace(/\s+/g, '-')}</span>
                  <a
                    href={`https://sriadithyaorganics.pages.dev/?category=${cat.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-[#496B45] hover:text-[#244B37] hover:underline"
                  >
                    <span>Store View</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Category Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCategory ? `Edit Category: ${editingCategory.name}` : 'Add New Organic Category'}
        size="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#26352B] mb-1.5">
              Category Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Wood-Pressed Oils, Organic Honey, Millets"
              value={formName}
              onChange={(e) => handleNameChange(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6E7DD] text-xs text-[#26352B] focus:outline-none focus:ring-2 focus:ring-[#244B37]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#26352B] mb-1.5">
              URL Slug
            </label>
            <input
              type="text"
              placeholder="e.g. wood-pressed-oils"
              value={formSlug}
              onChange={(e) => setFormSlug(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-[#E6E7DD] text-xs font-mono text-[#778176] bg-[#F6F5EF]/60 focus:outline-none focus:ring-2 focus:ring-[#244B37]"
            />
            <p className="text-[10px] text-[#778176] mt-1">Used for catalog filtering and SEO routing.</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-[#26352B]">
                Description
              </label>
              <button
                type="button"
                disabled={isGeneratingAI || !formName.trim()}
                onClick={handleAiSuggestCategory}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-[#244B37] bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors disabled:opacity-50"
                title="Generate description and SEO slug using AI"
              >
                {isGeneratingAI ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin text-[#496B45]" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3 text-[#496B45]" />
                    AI Suggest Details
                  </>
                )}
              </button>
            </div>
            <textarea
              rows={3}
              placeholder="Brief summary of this category for customer navigation..."
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-[#E6E7DD] text-xs text-[#26352B] focus:outline-none focus:ring-2 focus:ring-[#244B37]"
            />

            {/* AI Suggestion Preview Box (Requires explicit admin acceptance) */}
            {aiSuggestion && (
              <div className="mt-2.5 p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-900 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-emerald-700" /> AI Generated Preview
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setAiSuggestion(null)}
                      className="px-2 py-0.5 rounded text-[10px] font-medium text-[#778176] hover:bg-emerald-100"
                    >
                      Dismiss
                    </button>
                    <button
                      type="button"
                      onClick={applyAiSuggestion}
                      className="px-2.5 py-0.5 rounded bg-[#244B37] text-white text-[10px] font-bold hover:bg-[#1b392a] flex items-center gap-1 shadow-xs"
                    >
                      <Check className="w-3 h-3" /> Accept & Apply
                    </button>
                  </div>
                </div>
                {aiSuggestion.description && (
                  <p className="text-xs text-[#26352B] leading-relaxed italic">
                    "{aiSuggestion.description}"
                  </p>
                )}
                {aiSuggestion.slug && (
                  <div className="text-[10px] font-mono text-emerald-800">
                    Suggested Slug: <span className="font-semibold">/{aiSuggestion.slug}</span>
                  </div>
                )}
                {aiSuggestion.keywords && aiSuggestion.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {aiSuggestion.keywords.slice(0, 5).map((kw, i) => (
                      <span key={i} className="px-1.5 py-0.5 rounded-full bg-white text-[9px] font-medium text-[#496B45] border border-emerald-200">
                        #{kw}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-[#26352B]">
                Banner Image URL
              </label>
              <button
                type="button"
                onClick={handleOpenUnsplashBanner}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-[#244B37] bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                title="Search and pick an Unsplash banner photo"
              >
                <Sparkles className="w-3 h-3 text-[#496B45]" />
                AI Find on Unsplash
              </button>
            </div>
            <input
              type="url"
              placeholder="https://..."
              value={formImageUrl}
              onChange={(e) => setFormImageUrl(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-[#E6E7DD] text-xs text-[#26352B] focus:outline-none focus:ring-2 focus:ring-[#244B37]"
            />
            {formImageUrl && (
              <div className="mt-2.5 w-full h-24 rounded-xl border border-[#E6E7DD] overflow-hidden bg-[#F6F5EF]">
                <img
                  src={formImageUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600';
                  }}
                />
              </div>
            )}
          </div>

          {editingCategory && (
            <div className="pt-2 border-t border-[#E6E7DD] flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-[#26352B]">Catalog Status</p>
                <p className="text-[11px] text-[#778176]">Hide or display this collection on customer storefront</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#244B37]"></div>
              </label>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E6E7DD]">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-[#E6E7DD] text-xs font-semibold text-[#778176] hover:bg-[#F6F5EF]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-[#244B37] hover:bg-[#1b3829] text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-2"
            >
              {isSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>{editingCategory ? 'Save Changes' : 'Create Category'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete / Deactivate Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!categoryToDelete}
        onClose={() => setCategoryToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Deactivate Category?"
        message={`Are you sure you want to deactivate "${categoryToDelete?.name}"? Products inside this category will remain in the database.`}
        confirmText="Deactivate"
        isDestructive
        isLoading={isDeleting}
      />

      {/* Unsplash Category Banner Modal */}
      <Modal
        isOpen={unsplashModalOpen}
        onClose={() => setUnsplashModalOpen(false)}
        title="Select Unsplash Category Banner"
        subtitle="Choose a high-resolution authentic farm or organic harvest banner"
        maxWidth="2xl"
      >
        <div className="space-y-4">
          <form onSubmit={handleSearchUnsplashBannerSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#778176] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={unsplashSearchQuery}
                onChange={(e) => setUnsplashSearchQuery(e.target.value)}
                placeholder="Search banners (e.g. farm harvest, oils, fruits, honey)..."
                className="w-full pl-9 pr-3.5 py-2 bg-[#FAF9F5] border border-[#E6E7DD] rounded-xl text-xs text-[#26352B] focus:outline-none focus:border-[#496B45]"
              />
            </div>
            <button
              type="submit"
              disabled={isLoadingUnsplash || !unsplashSearchQuery.trim()}
              className="px-4 py-2 rounded-xl bg-[#244B37] text-white text-xs font-bold hover:bg-[#1b392a] disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
            >
              {isLoadingUnsplash ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-3.5 h-3.5" />
                  Search
                </>
              )}
            </button>
          </form>

          {/* Banner Grid */}
          <div className="min-h-[240px] max-h-[380px] overflow-y-auto pr-1">
            {isLoadingUnsplash ? (
              <div className="h-56 flex flex-col items-center justify-center gap-3 text-xs text-[#778176]">
                <RefreshCw className="w-6 h-6 animate-spin text-[#496B45]" />
                <span>Loading Unsplash banners...</span>
              </div>
            ) : unsplashResults.length === 0 ? (
              <div className="h-56 flex flex-col items-center justify-center text-center p-6 text-xs text-[#778176]">
                <Package className="w-8 h-8 text-[#8A9B69] mb-2 opacity-60" />
                <p className="font-bold text-[#26352B]">No banners found for "{unsplashSearchQuery}"</p>
                <p className="text-[11px] mt-1">Try "farm", "harvest", "oil", or "fruits".</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {unsplashResults.map((photo) => (
                  <div
                    key={photo.id}
                    onClick={() => handleSelectBanner(photo.image_url)}
                    className="group relative rounded-xl overflow-hidden border border-[#E6E7DD] hover:border-[#244B37] hover:shadow-card-hover cursor-pointer transition-all bg-white"
                  >
                    <div className="h-28 bg-[#FAF9F5] overflow-hidden">
                      <img
                        src={photo.thumbnail_url}
                        alt={photo.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    </div>
                    <div className="p-2 space-y-1">
                      <p className="text-[11px] font-semibold text-[#26352B] truncate">{photo.title}</p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectBanner(photo.image_url);
                        }}
                        className="w-full py-1 rounded text-[10px] font-bold bg-[#244B37] text-white hover:bg-[#1b392a] flex items-center justify-center gap-1 shadow-xs"
                      >
                        <Check className="w-3 h-3" /> Select Banner
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2 border-t border-[#E6E7DD]">
            <button
              type="button"
              onClick={() => setUnsplashModalOpen(false)}
              className="px-4 py-1.5 rounded-lg border border-[#E6E7DD] text-xs font-semibold text-[#778176] hover:bg-[#F6F5EF]"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CategoriesPage;
