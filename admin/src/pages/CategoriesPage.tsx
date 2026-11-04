import React, { useEffect, useState } from 'react';
import { Layers, Plus, Edit2, Trash2, RefreshCw, Package } from 'lucide-react';
import { api } from '../services/api';
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

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

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
        showSuccess('Categories synced.', 'Updated');
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
    setFormDescription('');
    setFormImageUrl('https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600');
    setFormIsActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setFormName(cat.name);
    setFormDescription(cat.description || '');
    setFormImageUrl(cat.image_url || '');
    setFormIsActive(cat.is_active !== false);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editingCategory) {
        await api.updateCategory(editingCategory.id, {
          name: formName,
          description: formDescription,
          image_url: formImageUrl,
          is_active: formIsActive,
        });
        showSuccess(`Category "${formName}" updated.`, 'Category Saved');
      } else {
        await api.createCategory({
          name: formName,
          description: formDescription,
          image_url: formImageUrl,
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

  return (
    <div className="space-y-6">
      {/* Top Controls Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Organic Produce Categories</h2>
          <p className="text-xs text-slate-500">
            Manage product collections, display banners, and catalog taxonomies
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadCategories(true)}
            disabled={isRefreshing}
            className="p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
            title="Refresh Categories"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-brand-700' : ''}`} />
          </button>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-800 hover:bg-brand-900 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Category</span>
          </button>
        </div>
      </div>

      {/* Categories Grid */}
      {isLoading ? (
        <LoadingSpinner text="Loading categories..." />
      ) : categories.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No Categories Found"
          description="Create your first organic produce category to organize items."
          action={{ label: 'Add Category', onClick: openAddModal }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-card overflow-hidden flex flex-col group hover:shadow-elevated transition-all"
            >
              <div className="h-36 relative overflow-hidden bg-slate-100">
                <img
                  src={cat.image_url || 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600'}
                  alt={cat.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-3 right-3 flex gap-1.5">
                  <button
                    onClick={() => openEditModal(cat)}
                    className="p-1.5 rounded-lg bg-white/90 backdrop-blur-sm text-slate-700 hover:bg-white shadow-xs transition-colors"
                    title="Edit"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setCategoryToDelete(cat)}
                    className="p-1.5 rounded-lg bg-white/90 backdrop-blur-sm text-rose-600 hover:bg-white shadow-xs transition-colors"
                    title="Deactivate"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900">{cat.name}</h3>
                    <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Package className="w-3 h-3" />
                      {cat.product_count ?? 0} items
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {cat.description || 'Certified organic harvest products.'}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="font-mono">slug: {cat.slug}</span>
                  {cat.is_active ? (
                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
                    </span>
                  ) : (
                    <span className="text-slate-400">Inactive</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Category Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingCategory ? `Edit Category: ${editingCategory.name}` : 'Add Organic Category'}
          maxWidth="md"
        >
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Category Name *
              </label>
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Cold-Pressed Oils, Fresh Vegetables"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Image URL
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
                Description
              </label>
              <textarea
                rows={3}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Category summary, origin, farming principles..."
                className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-600"
              />
            </div>

            <div className="pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 select-none">
                <input
                  type="checkbox"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="rounded text-brand-700 focus:ring-brand-600 w-4 h-4"
                />
                <span>Active Category</span>
              </label>
            </div>

            <div className="flex gap-3 justify-end pt-3 border-t border-slate-100">
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
                {isSaving ? 'Saving...' : editingCategory ? 'Save Changes' : 'Create Category'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete / Deactivate Confirm Dialog */}
      {categoryToDelete && (
        <ConfirmDialog
          isOpen={!!categoryToDelete}
          onClose={() => setCategoryToDelete(null)}
          onConfirm={handleDeleteConfirm}
          title="Deactivate Category"
          message={`Are you sure you want to deactivate "${categoryToDelete.name}"?`}
          confirmLabel="Deactivate"
          variant="danger"
          isLoading={isDeleting}
        />
      )}
    </div>
  );
};

