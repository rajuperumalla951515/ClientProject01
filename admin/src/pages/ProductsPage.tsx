import React, { useEffect, useState, useMemo } from 'react';
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  RefreshCw,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Eye,
  Layers,
  ArrowUpDown
} from 'lucide-react';
import { api } from '../services/api';
import { Product, Category } from '../types';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Pagination } from '../components/ui/Pagination';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { useToast } from '../context/ToastContext';

export const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Add/Edit Product Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formCategoryId, setFormCategoryId] = useState<number>(1);
  const [formPrice, setFormPrice] = useState<number>(99);
  const [formMrp, setFormMrp] = useState<number>(120);
  const [formStock, setFormStock] = useState<number>(50);
  const [formUnit, setFormUnit] = useState('500g');
  const [formWeight, setFormWeight] = useState('Standard Pack');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formIsFeatured, setFormIsFeatured] = useState(false);
  const [formIsActive, setFormIsActive] = useState(true);

  // Delete Product Dialog State
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { showSuccess, showError } = useToast();

  const loadData = async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const [prods, cats] = await Promise.all([
        api.getProducts({ limit: 200 }),
        api.getCategories(),
      ]);
      setProducts(prods);
      setCategories(cats);
      if (cats.length > 0 && !editingProduct) {
        setFormCategoryId(cats[0].id);
      }
      if (isManual) {
        showSuccess('Product catalogue synced.', 'Updated');
      }
    } catch (err: any) {
      showError(err.message || 'Failed to load products.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setEditingProduct(null);
    setFormName('');
    setFormCategoryId(categories[0]?.id || 1);
    setFormPrice(99);
    setFormMrp(120);
    setFormStock(50);
    setFormUnit('500g');
    setFormWeight('Standard Pack');
    setFormImageUrl('https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800');
    setFormDescription('');
    setFormIsFeatured(false);
    setFormIsActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setFormName(p.name);
    setFormCategoryId(p.category_id || 1);
    setFormPrice(p.min_price || 99);
    setFormMrp(p.mrp || p.min_price || 120);
    setFormStock(p.variants?.[0]?.stock ?? 50);
    setFormUnit(p.variants?.[0]?.unit || '500g');
    setFormWeight(p.variants?.[0]?.pack_size || 'Standard Pack');
    setFormImageUrl(p.images?.[0]?.image_url || p.primary_image || '');
    setFormDescription(p.description || '');
    setFormIsFeatured(!!p.is_featured);
    setFormIsActive(p.is_active !== false);
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      if (editingProduct) {
        // Update existing product
        await api.updateProduct(editingProduct.id, {
          name: formName,
          category_id: formCategoryId,
          price: formPrice,
          mrp: formMrp,
          stock: formStock,
          unit: formUnit,
          weight: formWeight,
          image_url: formImageUrl,
          description: formDescription,
          is_featured: formIsFeatured,
          is_active: formIsActive,
        });
        showSuccess(`Product "${formName}" updated.`, 'Product Saved');
      } else {
        // Create new product
        await api.createProduct({
          name: formName,
          category_id: formCategoryId,
          price: formPrice,
          mrp: formMrp,
          stock: formStock,
          unit: formUnit,
          weight: formWeight,
          image_url: formImageUrl,
          description: formDescription,
          is_featured: formIsFeatured,
          is_active: formIsActive,
        });
        showSuccess(`Product "${formName}" created.`, 'Product Created');
      }

      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      showError(err.message || 'Failed to save product.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return;
    setIsDeleting(true);
    try {
      await api.deleteProduct(productToDelete.id);
      showSuccess(`Product "${productToDelete.name}" deactivated.`, 'Product Deactivated');
      setProductToDelete(null);
      loadData();
    } catch (err: any) {
      showError(err.message || 'Failed to deactivate product.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        searchQuery === '' ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(p.id) === searchQuery.trim();

      const matchesCategory =
        selectedCategory === 'all' || String(p.category_id) === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  // Paginated Products
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, currentPage]);

  const categoryMap = useMemo(() => {
    const map: Record<number, string> = {};
    categories.forEach((c) => {
      map[c.id] = c.name;
    });
    return map;
  }, [categories]);

  const formatCurrency = (val: number) => {
    return `₹${Number(val || 0).toLocaleString('en-IN', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    })}`;
  };

  return (
    <div className="space-y-5">
      {/* Top Controls Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search organic products by name, ID, or keywords..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent transition-all"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-brand-600"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.name}
              </option>
            ))}
          </select>

          <button
            onClick={() => loadData(true)}
            disabled={isRefreshing}
            className="p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-brand-700' : ''}`} />
          </button>

          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-800 hover:bg-brand-900 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Organic Product</span>
          </button>
        </div>
      </div>

      {/* Product List Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-card overflow-hidden">
        {isLoading ? (
          <LoadingSpinner text="Reading product inventory..." />
        ) : filteredProducts.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No Products Found"
            description="No organic items match your search or category filter."
            action={{
              label: 'Add First Product',
              onClick: openAddModal,
            }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Product</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Selling Price</th>
                  <th className="py-3.5 px-4">MRP / Discount</th>
                  <th className="py-3.5 px-4">Inventory Stock</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedProducts.map((p) => {
                  const stock = p.variants?.[0]?.stock ?? 0;
                  const unit = p.variants?.[0]?.unit || 'Standard Pack';
                  const isLow = stock < 10;
                  const isOut = stock <= 0;
                  const discount = p.mrp && p.mrp > p.min_price ? Math.round(((p.mrp - p.min_price) / p.mrp) * 100) : 0;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={p.images?.[0]?.image_url || p.primary_image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=100'}
                            alt={p.name}
                            className="w-11 h-11 rounded-xl object-cover border border-slate-200/80 flex-shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 truncate">{p.name}</span>
                              {p.is_featured && (
                                <span title="Featured Product">
                                  <Sparkles className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-500 block">{unit}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        {categoryMap[p.category_id] || 'Organic Produce'}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {formatCurrency(p.min_price)}
                      </td>
                      <td className="py-3.5 px-4">
                        {p.mrp && p.mrp > p.min_price ? (
                          <div>
                            <span className="text-slate-400 line-through mr-1.5">{formatCurrency(p.mrp)}</span>
                            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                              {discount}% OFF
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-bold ${
                              isOut ? 'text-rose-600' : isLow ? 'text-amber-600' : 'text-slate-900'
                            }`}
                          >
                            {stock} units
                          </span>
                          {isOut && (
                            <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                              Out of Stock
                            </span>
                          )}
                          {!isOut && isLow && (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                              Low Stock
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {p.is_active ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => openEditModal(p)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                            title="Edit Product"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setProductToDelete(p)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 transition-colors"
                            title="Deactivate Product"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          currentPage={currentPage}
          totalItems={filteredProducts.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Add / Edit Product Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingProduct ? `Edit ${editingProduct.name}` : 'Add New Organic Product'}
          subtitle="Changes are saved directly to central database and immediately visible to customers"
          maxWidth="2xl"
        >
          <form onSubmit={handleSaveProduct} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Wood-Pressed Coconut Oil"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Category *
                </label>
                <select
                  value={formCategoryId}
                  onChange={(e) => setFormCategoryId(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-brand-600"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Selling Price (₹) *
                </label>
                <input
                  type="number"
                  step="0.5"
                  required
                  value={formPrice}
                  onChange={(e) => setFormPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  MRP / Original Price (₹)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={formMrp}
                  onChange={(e) => setFormMrp(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Initial Stock Quantity *
                </label>
                <input
                  type="number"
                  required
                  value={formStock}
                  onChange={(e) => setFormStock(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Unit / Weight Specification *
                </label>
                <input
                  type="text"
                  required
                  value={formUnit}
                  onChange={(e) => setFormUnit(e.target.value)}
                  placeholder="e.g. 500g, 1L bottle, 250g bunch"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Primary Image URL
              </label>
              <input
                type="url"
                value={formImageUrl}
                onChange={(e) => setFormImageUrl(e.target.value)}
                placeholder="https://images.unsplash.com/photo-..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Product Description
              </label>
              <textarea
                rows={3}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Nutritional benefits, harvest details, organic certifications..."
                className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600"
              />
            </div>

            <div className="flex items-center gap-6 pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 select-none">
                <input
                  type="checkbox"
                  checked={formIsFeatured}
                  onChange={(e) => setFormIsFeatured(e.target.checked)}
                  className="rounded text-brand-700 focus:ring-brand-600 w-4 h-4"
                />
                <span>Feature on Homepage Best Sellers</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 select-none">
                <input
                  type="checkbox"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="rounded text-brand-700 focus:ring-brand-600 w-4 h-4"
                />
                <span>Active & Visible to Shoppers</span>
              </label>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 rounded-xl bg-brand-800 hover:bg-brand-900 text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : editingProduct ? 'Save Product Changes' : 'Create Product'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete / Deactivate Confirm Dialog */}
      {productToDelete && (
        <ConfirmDialog
          isOpen={!!productToDelete}
          onClose={() => setProductToDelete(null)}
          onConfirm={handleDeleteConfirm}
          title="Deactivate Organic Product"
          message={`Are you sure you want to deactivate "${productToDelete.name}"? It will be hidden from customer search and store catalogues.`}
          confirmLabel="Deactivate"
          variant="danger"
          isLoading={isDeleting}
        />
      )}
    </div>
  );
};
