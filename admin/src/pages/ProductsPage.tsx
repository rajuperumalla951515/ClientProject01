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
  Layers,
  ArrowUpDown,
  Download,
  Filter,
  Eye,
  EyeOff,
  Check,
  X,
  Droplets,
  Tag
} from 'lucide-react';
import { api } from '../services/api';
import { Product, Category, ProductVariant } from '../types';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Pagination } from '../components/ui/Pagination';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { useToast } from '../context/ToastContext';

type StockFilter = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
type StatusFilter = 'all' | 'active' | 'inactive';
type SortOption = 'name_asc' | 'name_desc' | 'price_asc' | 'price_desc' | 'stock_asc' | 'stock_desc';

export const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters & Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortOption, setSortOption] = useState<SortOption>('name_asc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Selection for Bulk Operations
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

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
  const [formUnit, setFormUnit] = useState('500 ml Glass Jar');
  const [formWeight, setFormWeight] = useState('Standard Pack');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formShortDescription, setFormShortDescription] = useState('');
  const [formBrand, setFormBrand] = useState('Sri Adithya Organics');
  const [formOriginFarm, setFormOriginFarm] = useState('');
  const [formCertifications, setFormCertifications] = useState('100% Certified Organic');
  const [formStorageInstructions, setFormStorageInstructions] = useState('');
  const [formIsFeatured, setFormIsFeatured] = useState(false);
  const [formIsFreshToday, setFormIsFreshToday] = useState(false);
  const [formIsDeal, setFormIsDeal] = useState(false);
  const [formIsBestSeller, setFormIsBestSeller] = useState(false);
  const [formIsActive, setFormIsActive] = useState(true);

  // Variant Management inside Edit Modal
  const [newVariantUnit, setNewVariantUnit] = useState('1 Litre Bottle');
  const [newVariantPrice, setNewVariantPrice] = useState<number>(190);
  const [newVariantMrp, setNewVariantMrp] = useState<number>(240);
  const [newVariantStock, setNewVariantStock] = useState<number>(40);
  const [isAddingVariant, setIsAddingVariant] = useState(false);

  // Delete Dialog State
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { showSuccess, showError } = useToast();

  const loadData = async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const [prods, cats] = await Promise.all([
        api.getProducts({ limit: 500 }),
        api.getCategories(),
      ]);
      setProducts(prods);
      setCategories(cats);
      if (cats.length > 0 && !editingProduct) {
        setFormCategoryId(cats[0].id);
      }
      if (isManual) {
        showSuccess('Product catalogue synchronized with D1.', 'Catalogue Updated');
      }
    } catch (err: any) {
      showError(err.message || 'Failed to load products from Cloudflare D1.');
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
    setFormUnit('1 Litre Bottle');
    setFormWeight('Standard Pack');
    setFormImageUrl('https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&q=80&w=800');
    setFormDescription('');
    setFormShortDescription('');
    setFormBrand('Sri Adithya Organics');
    setFormOriginFarm('');
    setFormCertifications('100% Certified Organic');
    setFormStorageInstructions('Store in a cool dry place away from direct sunlight');
    setFormIsFeatured(false);
    setFormIsFreshToday(false);
    setFormIsDeal(false);
    setFormIsBestSeller(false);
    setFormIsActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setFormName(p.name);
    setFormCategoryId(p.category_id || categories[0]?.id || 1);
    setFormPrice(p.min_price || 99);
    setFormMrp(p.mrp || p.min_price || 120);
    setFormStock(p.variants?.[0]?.stock ?? 50);
    setFormUnit(p.variants?.[0]?.unit || '1 Litre Bottle');
    setFormWeight(p.variants?.[0]?.pack_size || 'Standard Pack');
    setFormImageUrl(p.primary_image || p.images?.[0]?.image_url || '');
    setFormDescription(p.description || '');
    setFormShortDescription(p.short_description || '');
    setFormBrand(p.brand || 'Sri Adithya Organics');
    setFormOriginFarm(p.origin_farm || '');
    setFormCertifications(p.certifications || '100% Certified Organic');
    setFormStorageInstructions(p.storage_instructions || '');
    setFormIsFeatured(!!p.is_featured);
    setFormIsFreshToday(!!p.is_fresh_today);
    setFormIsDeal(!!p.is_deal);
    setFormIsBestSeller(!!p.is_best_seller);
    setFormIsActive(p.is_active !== false);
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      if (editingProduct) {
        // Update product master details
        await api.updateProduct(editingProduct.id, {
          name: formName,
          category_id: formCategoryId,
          description: formDescription,
          short_description: formShortDescription || formDescription.slice(0, 100),
          brand: formBrand,
          origin_farm: formOriginFarm,
          certifications: formCertifications,
          storage_instructions: formStorageInstructions,
          is_featured: formIsFeatured,
          is_fresh_today: formIsFreshToday,
          is_deal: formIsDeal,
          is_best_seller: formIsBestSeller,
          is_active: formIsActive,
          images: formImageUrl ? [formImageUrl] : undefined,
        });

        // Also update primary variant
        if (editingProduct.variants?.[0]?.id) {
          await api.updateVariant(editingProduct.id, editingProduct.variants[0].id, {
            unit: formUnit,
            pack_size: formWeight,
            price: formPrice,
            mrp: formMrp,
            stock: formStock,
          });
        }

        showSuccess(`Product "${formName}" updated successfully in D1.`, 'Product Saved');
      } else {
        // Create product with default variant
        await api.createProduct({
          name: formName,
          category_id: formCategoryId,
          description: formDescription || formName,
          short_description: formShortDescription || formName,
          brand: formBrand,
          origin_farm: formOriginFarm,
          certifications: formCertifications,
          storage_instructions: formStorageInstructions,
          is_featured: formIsFeatured,
          is_fresh_today: formIsFreshToday,
          is_deal: formIsDeal,
          is_best_seller: formIsBestSeller,
          is_active: formIsActive,
          variants: [
            {
              unit: formUnit,
              pack_size: formWeight,
              price: formPrice,
              mrp: formMrp,
              stock: formStock,
            },
          ],
          images: formImageUrl
            ? [{ image_url: formImageUrl, alt_text: formName }]
            : [],
        });
        showSuccess(`Product "${formName}" added to D1 catalogue.`, 'Product Created');
      }

      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      showError(err.message || 'Failed to save product.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddNewVariant = async () => {
    if (!editingProduct) return;
    setIsAddingVariant(true);
    try {
      await api.createVariant(editingProduct.id, {
        unit: newVariantUnit,
        pack_size: 'Standard Pack',
        price: newVariantPrice,
        mrp: newVariantMrp,
        stock: newVariantStock,
        is_default: false,
      });
      showSuccess(`Variant "${newVariantUnit}" added.`, 'Variant Added');
      // Reload product details
      const updated = await api.getProducts({ search: editingProduct.name });
      const current = updated.find((p) => p.id === editingProduct.id);
      if (current) setEditingProduct(current);
      loadData();
    } catch (err: any) {
      showError(err.message || 'Failed to add variant.');
    } finally {
      setIsAddingVariant(false);
    }
  };

  const handleDeleteVariant = async (variantId: number) => {
    if (!editingProduct) return;
    try {
      await api.deleteVariant(editingProduct.id, variantId);
      showSuccess('Variant removed.', 'Variant Deleted');
      const updated = await api.getProducts({ search: editingProduct.name });
      const current = updated.find((p) => p.id === editingProduct.id);
      if (current) setEditingProduct(current);
      loadData();
    } catch (err: any) {
      showError(err.message || 'Failed to delete variant.');
    }
  };

  const handleToggleActive = async (p: Product) => {
    try {
      await api.updateProduct(p.id, { is_active: !p.is_active });
      showSuccess(
        `Product "${p.name}" is now ${!p.is_active ? 'Active' : 'Inactive'}.`,
        'Status Changed'
      );
      loadData();
    } catch (err: any) {
      showError(err.message || 'Failed to change product status.');
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

  // Bulk Operations
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(paginatedProducts.map((p) => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBulkStatusChange = async (activeState: boolean) => {
    if (selectedIds.length === 0) return;
    try {
      await Promise.all(
        selectedIds.map((id) => api.updateProduct(id, { is_active: activeState }))
      );
      showSuccess(
        `${selectedIds.length} products updated to ${activeState ? 'Active' : 'Inactive'}.`,
        'Bulk Update Complete'
      );
      setSelectedIds([]);
      loadData();
    } catch (err: any) {
      showError(err.message || 'Failed bulk update.');
    }
  };

  const handleExportCSV = (exportSelected = false) => {
    const listToExport = exportSelected
      ? products.filter((p) => selectedIds.includes(p.id))
      : filteredProducts;

    if (listToExport.length === 0) {
      showError('No products to export.');
      return;
    }

    const headers = [
      'ID',
      'Name',
      'Category',
      'Primary Unit',
      'Selling Price (INR)',
      'MRP (INR)',
      'Total Stock',
      'Status',
      'Is Featured',
      'Is Best Seller'
    ];

    const rows = listToExport.map((p) => {
      const cat = categories.find((c) => c.id === p.category_id)?.name || 'Organic Produce';
      const defVar = p.variants?.[0];
      const stock = p.variants?.reduce((sum, v) => sum + (v.stock || 0), 0) ?? 0;
      return [
        p.id,
        `"${p.name.replace(/"/g, '""')}"`,
        `"${cat}"`,
        `"${defVar?.unit || 'Standard'}"`,
        p.min_price || defVar?.price || 0,
        p.mrp || defVar?.mrp || 0,
        stock,
        p.is_active ? 'Active' : 'Inactive',
        p.is_featured ? 'Yes' : 'No',
        p.is_best_seller ? 'Yes' : 'No'
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `sri_adithya_products_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showSuccess(`Exported ${listToExport.length} products to CSV.`, 'CSV Exported');
  };

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        // Search term
        const matchesSearch =
          searchQuery === '' ||
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          String(p.id) === searchQuery.trim();

        // Category filter
        const matchesCategory =
          selectedCategory === 'all' || String(p.category_id) === selectedCategory;

        // Stock filter
        const totalStock = p.variants?.reduce((sum, v) => sum + (v.stock || 0), 0) ?? 0;
        let matchesStock = true;
        if (stockFilter === 'in_stock') matchesStock = totalStock > 0;
        if (stockFilter === 'low_stock') matchesStock = totalStock > 0 && totalStock < 10;
        if (stockFilter === 'out_of_stock') matchesStock = totalStock <= 0;

        // Active filter
        let matchesStatus = true;
        if (statusFilter === 'active') matchesStatus = p.is_active !== false;
        if (statusFilter === 'inactive') matchesStatus = p.is_active === false;

        return matchesSearch && matchesCategory && matchesStock && matchesStatus;
      })
      .sort((a, b) => {
        if (sortOption === 'name_asc') return a.name.localeCompare(b.name);
        if (sortOption === 'name_desc') return b.name.localeCompare(a.name);
        if (sortOption === 'price_asc') return (a.min_price || 0) - (b.min_price || 0);
        if (sortOption === 'price_desc') return (b.min_price || 0) - (a.min_price || 0);
        const aStock = a.variants?.reduce((sum, v) => sum + (v.stock || 0), 0) ?? 0;
        const bStock = b.variants?.reduce((sum, v) => sum + (v.stock || 0), 0) ?? 0;
        if (sortOption === 'stock_asc') return aStock - bStock;
        if (sortOption === 'stock_desc') return bStock - aStock;
        return 0;
      });
  }, [products, searchQuery, selectedCategory, stockFilter, statusFilter, sortOption]);

  // Paginated Products
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, currentPage, pageSize]);

  if (isLoading) {
    return <LoadingSpinner text="Fetching organic catalogue from Cloudflare D1..." size="lg" />;
  }

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E6E7DD] shadow-card">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-[#26352B]">Product Catalogue</h2>
            <span className="px-2 py-0.5 rounded-full bg-[#E2E8D7] text-[#244B37] text-[11px] font-bold">
              {filteredProducts.length} Products
            </span>
          </div>
          <p className="text-xs text-[#778176] mt-0.5">
            Manage wood-pressed oils, grains, and organic farm produce variants & stock
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleExportCSV(false)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#E6E7DD] bg-white hover:bg-[#F6F5EF] text-[#26352B] text-xs font-semibold shadow-xs transition-colors"
          >
            <Download className="w-4 h-4 text-[#496B45]" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => loadData(true)}
            disabled={isRefreshing}
            className="p-2 rounded-xl border border-[#E6E7DD] bg-white hover:bg-[#F6F5EF] text-[#26352B] transition-colors disabled:opacity-50"
            title="Refresh catalogue"
          >
            <RefreshCw className={`w-4 h-4 text-[#496B45] ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#244B37] hover:bg-[#1C3C2C] text-white text-xs font-bold shadow-xs hover:shadow-card-hover transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Organic Product</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#E6E7DD] shadow-card space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Box */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-[#778176] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by product name, description or SKU..."
              className="w-full pl-10 pr-4 py-2 bg-[#FAF9F5] border border-[#E6E7DD] rounded-xl text-xs font-medium text-[#26352B] placeholder-[#778176] focus:outline-none focus:border-[#496B45] focus:bg-white transition-all"
            />
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-[#FAF9F5] border border-[#E6E7DD] rounded-xl text-xs font-medium text-[#26352B] focus:outline-none focus:border-[#496B45]"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Stock Filter */}
          <div>
            <select
              value={stockFilter}
              onChange={(e) => {
                setStockFilter(e.target.value as StockFilter);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-[#FAF9F5] border border-[#E6E7DD] rounded-xl text-xs font-medium text-[#26352B] focus:outline-none focus:border-[#496B45]"
            >
              <option value="all">All Stock Statuses</option>
              <option value="in_stock">In Stock (&gt; 0)</option>
              <option value="low_stock">Low Stock (&lt; 10 units)</option>
              <option value="out_of_stock">Out of Stock (0 units)</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              className="w-full px-3 py-2 bg-[#FAF9F5] border border-[#E6E7DD] rounded-xl text-xs font-medium text-[#26352B] focus:outline-none focus:border-[#496B45]"
            >
              <option value="name_asc">Name: A to Z</option>
              <option value="name_desc">Name: Z to A</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="stock_asc">Stock: Low to High</option>
              <option value="stock_desc">Stock: High to Low</option>
            </select>
          </div>
        </div>

        {/* Secondary Filter Chips: Status & Active counts */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#E6E7DD] text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-[#778176] font-semibold text-[11px] mr-1">Status:</span>
            {(['all', 'active', 'inactive'] as StatusFilter[]).map((st) => (
              <button
                key={st}
                onClick={() => {
                  setStatusFilter(st);
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === st
                    ? 'bg-[#244B37] text-white shadow-2xs'
                    : 'bg-[#FAF9F5] text-[#778176] hover:text-[#26352B] border border-[#E6E7DD]'
                }`}
              >
                {st === 'all' && 'All Statuses'}
                {st === 'active' && 'Active Only'}
                {st === 'inactive' && 'Inactive'}
              </button>
            ))}
          </div>

          {/* Bulk Action Buttons if items selected */}
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 bg-[#F1F4EC] px-3 py-1 rounded-xl border border-[#8A9B69]/30 animate-in fade-in">
              <span className="text-xs font-bold text-[#244B37]">
                {selectedIds.length} Selected
              </span>
              <button
                onClick={() => handleBulkStatusChange(true)}
                className="px-2 py-0.5 rounded-md bg-white border border-[#E6E7DD] text-[#244B37] font-bold text-[11px] hover:bg-[#E2E8D7]"
              >
                Activate
              </button>
              <button
                onClick={() => handleBulkStatusChange(false)}
                className="px-2 py-0.5 rounded-md bg-white border border-[#E6E7DD] text-rose-800 font-bold text-[11px] hover:bg-rose-50"
              >
                Deactivate
              </button>
              <button
                onClick={() => handleExportCSV(true)}
                className="px-2 py-0.5 rounded-md bg-white border border-[#E6E7DD] text-[#26352B] font-bold text-[11px] hover:bg-[#F6F5EF]"
              >
                Export CSV
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-[#E6E7DD] shadow-card overflow-hidden">
        {paginatedProducts.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No organic products matched your criteria"
            description="Adjust your search query, category filter or stock filter to discover products."
            action={{
              label: 'Add First Product',
              onClick: openAddModal,
            }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FAF9F5] border-b border-[#E6E7DD] text-[11px] font-bold text-[#778176] uppercase tracking-wider">
                  <th className="p-4 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={
                        paginatedProducts.length > 0 &&
                        selectedIds.length === paginatedProducts.length
                      }
                      onChange={handleSelectAll}
                      className="rounded border-[#E6E7DD] text-[#244B37] focus:ring-[#244B37]"
                    />
                  </th>
                  <th className="p-4">Product</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Variants & Pack</th>
                  <th className="p-4">Price / MRP</th>
                  <th className="p-4">Warehouse Stock</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6E7DD] text-xs">
                {paginatedProducts.map((p) => {
                  const cat = categories.find((c) => c.id === p.category_id);
                  const totalStock = p.variants?.reduce((sum, v) => sum + (v.stock || 0), 0) ?? 0;
                  const isSelected = selectedIds.includes(p.id);

                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-[#FAF9F5] transition-colors ${
                        isSelected ? 'bg-[#F1F4EC]/50' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="p-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectOne(p.id)}
                          className="rounded border-[#E6E7DD] text-[#244B37] focus:ring-[#244B37]"
                        />
                      </td>

                      {/* Product Name & Thumbnail */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-[#F6F5EF] border border-[#E6E7DD] overflow-hidden shrink-0">
                            {p.primary_image ? (
                              <img
                                src={p.primary_image}
                                alt={p.name}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <Package className="w-6 h-6 text-[#778176] m-auto mt-3" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-[#26352B] line-clamp-1">{p.name}</span>
                              {p.is_best_seller && (
                                <span className="px-1.5 py-0.2 text-[9px] font-bold rounded-md bg-amber-100 text-amber-800">
                                  Best Seller
                                </span>
                              )}
                              {p.is_fresh_today && (
                                <span className="px-1.5 py-0.2 text-[9px] font-bold rounded-md bg-emerald-100 text-emerald-800">
                                  Fresh
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-[#778176] font-mono">
                              SKU #{p.id} • {p.brand || 'Sri Adithya Organics'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="p-4 text-[#778176] font-medium">
                        {cat?.name || 'Organic Produce'}
                      </td>

                      {/* Variants & Pack */}
                      <td className="p-4">
                        {p.variants && p.variants.length > 0 ? (
                          <div className="space-y-0.5">
                            <span className="font-semibold text-[#26352B] block">
                              {p.variants[0].unit}
                            </span>
                            {p.variants.length > 1 && (
                              <span className="text-[10px] text-[#496B45] font-bold bg-[#E2E8D7] px-1.5 py-0.2 rounded-md">
                                +{p.variants.length - 1} other variant{p.variants.length > 2 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[#778176] italic">1 Unit</span>
                        )}
                      </td>

                      {/* Price / MRP */}
                      <td className="p-4">
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-bold text-[#26352B]">
                            ₹{p.min_price || p.variants?.[0]?.price || 0}
                          </span>
                          {(p.mrp || p.variants?.[0]?.mrp) && (p.mrp || p.variants?.[0]?.mrp) > (p.min_price || p.variants?.[0]?.price || 0) && (
                            <span className="text-[11px] text-[#778176] line-through">
                              ₹{p.mrp || p.variants?.[0]?.mrp}
                            </span>
                          )}
                        </div>
                        {p.discount_percentage ? (
                          <span className="text-[10px] font-bold text-[#496B45]">
                            {p.discount_percentage}% OFF
                          </span>
                        ) : null}
                      </td>

                      {/* Warehouse Stock */}
                      <td className="p-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              totalStock <= 0
                                ? 'bg-rose-500'
                                : totalStock < 10
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                          />
                          <span
                            className={`font-bold ${
                              totalStock <= 0
                                ? 'text-rose-700'
                                : totalStock < 10
                                ? 'text-amber-700'
                                : 'text-[#26352B]'
                            }`}
                          >
                            {totalStock} units
                          </span>
                        </div>
                        {totalStock < 10 && totalStock > 0 && (
                          <span className="text-[10px] text-amber-600 font-semibold block">
                            Reorder soon
                          </span>
                        )}
                        {totalStock <= 0 && (
                          <span className="text-[10px] text-rose-600 font-semibold block">
                            Out of stock
                          </span>
                        )}
                      </td>

                      {/* Visibility Status */}
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleToggleActive(p)}
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border transition-colors ${
                            p.is_active !== false
                              ? 'bg-[#EBF3E8] text-[#2E6038] border-[#A8C9A0]'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                          title="Click to toggle visibility"
                        >
                          {p.is_active !== false ? (
                            <>
                              <Eye className="w-3 h-3 text-[#2E6038]" />
                              <span>Active</span>
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3 h-3 text-slate-500" />
                              <span>Inactive</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(p)}
                            className="p-1.5 rounded-lg border border-[#E6E7DD] bg-white text-[#26352B] hover:bg-[#F6F5EF] hover:border-[#8A9B69] transition-colors"
                            title="Edit product & manage variants"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-[#496B45]" />
                          </button>
                          <button
                            onClick={() => setProductToDelete(p)}
                            className="p-1.5 rounded-lg border border-[#E6E7DD] bg-white text-rose-600 hover:bg-rose-50 hover:border-rose-300 transition-colors"
                            title="Deactivate product"
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

        {/* Pagination Bar */}
        <Pagination
          currentPage={currentPage}
          totalItems={filteredProducts.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Add / Edit Product Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct ? `Edit "${editingProduct.name}"` : 'Add New Organic Product'}
        subtitle="Manage product specifications, oil variants, pricing and warehouse stock"
        maxWidth="3xl"
      >
        <form onSubmit={handleSaveProduct} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-[#26352B] mb-1">
                Product Name *
              </label>
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Sri Adithya Wood-Pressed Pure Groundnut Oil (Marachekku)"
                className="w-full px-3.5 py-2 bg-[#FAF9F5] border border-[#E6E7DD] rounded-xl text-xs sm:text-sm text-[#26352B] focus:outline-none focus:border-[#496B45]"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-bold text-[#26352B] mb-1">
                Category *
              </label>
              <select
                value={formCategoryId}
                onChange={(e) => setFormCategoryId(Number(e.target.value))}
                className="w-full px-3.5 py-2 bg-[#FAF9F5] border border-[#E6E7DD] rounded-xl text-xs text-[#26352B] focus:outline-none focus:border-[#496B45]"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Brand */}
            <div>
              <label className="block text-xs font-bold text-[#26352B] mb-1">
                Brand / Farm Origin
              </label>
              <input
                type="text"
                value={formBrand}
                onChange={(e) => setFormBrand(e.target.value)}
                placeholder="Sri Adithya Organics"
                className="w-full px-3.5 py-2 bg-[#FAF9F5] border border-[#E6E7DD] rounded-xl text-xs text-[#26352B] focus:outline-none focus:border-[#496B45]"
              />
            </div>

            {/* Default Variant Details */}
            <div>
              <label className="block text-xs font-bold text-[#26352B] mb-1">
                Default Unit (e.g. 1 Litre, 500 ml, 1 kg) *
              </label>
              <input
                type="text"
                required
                value={formUnit}
                onChange={(e) => setFormUnit(e.target.value)}
                placeholder="1 Litre Bottle"
                className="w-full px-3.5 py-2 bg-[#FAF9F5] border border-[#E6E7DD] rounded-xl text-xs text-[#26352B] focus:outline-none focus:border-[#496B45]"
              />
            </div>

            {/* Pack Size / Container */}
            <div>
              <label className="block text-xs font-bold text-[#26352B] mb-1">
                Packaging Container
              </label>
              <input
                type="text"
                value={formWeight}
                onChange={(e) => setFormWeight(e.target.value)}
                placeholder="Standard Pack / Glass Bottle"
                className="w-full px-3.5 py-2 bg-[#FAF9F5] border border-[#E6E7DD] rounded-xl text-xs text-[#26352B] focus:outline-none focus:border-[#496B45]"
              />
            </div>

            {/* Selling Price */}
            <div>
              <label className="block text-xs font-bold text-[#26352B] mb-1">
                Selling Price (₹) *
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                required
                value={formPrice}
                onChange={(e) => setFormPrice(Number(e.target.value))}
                className="w-full px-3.5 py-2 bg-[#FAF9F5] border border-[#E6E7DD] rounded-xl text-xs text-[#26352B] focus:outline-none focus:border-[#496B45]"
              />
            </div>

            {/* MRP */}
            <div>
              <label className="block text-xs font-bold text-[#26352B] mb-1">
                MRP (Printed Retail Price ₹) *
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                required
                value={formMrp}
                onChange={(e) => setFormMrp(Number(e.target.value))}
                className="w-full px-3.5 py-2 bg-[#FAF9F5] border border-[#E6E7DD] rounded-xl text-xs text-[#26352B] focus:outline-none focus:border-[#496B45]"
              />
            </div>

            {/* Warehouse Stock */}
            <div>
              <label className="block text-xs font-bold text-[#26352B] mb-1">
                Current Stock Quantity (Units) *
              </label>
              <input
                type="number"
                min="0"
                required
                value={formStock}
                onChange={(e) => setFormStock(Number(e.target.value))}
                className="w-full px-3.5 py-2 bg-[#FAF9F5] border border-[#E6E7DD] rounded-xl text-xs text-[#26352B] focus:outline-none focus:border-[#496B45]"
              />
            </div>

            {/* Image URL with preview */}
            <div>
              <label className="block text-xs font-bold text-[#26352B] mb-1">
                Primary Product Image URL
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={formImageUrl}
                  onChange={(e) => setFormImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="flex-1 px-3.5 py-2 bg-[#FAF9F5] border border-[#E6E7DD] rounded-xl text-xs text-[#26352B] focus:outline-none focus:border-[#496B45]"
                />
                {formImageUrl && (
                  <img
                    src={formImageUrl}
                    alt="Preview"
                    className="w-9 h-9 rounded-lg object-cover border border-[#E6E7DD] shrink-0"
                  />
                )}
              </div>
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-[#26352B] mb-1">
                Product Description & Nutritional Benefits
              </label>
              <textarea
                rows={3}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Traditional stone/wood ghani pressed at low temperature below 40°C..."
                className="w-full px-3.5 py-2 bg-[#FAF9F5] border border-[#E6E7DD] rounded-xl text-xs text-[#26352B] focus:outline-none focus:border-[#496B45]"
              />
            </div>
          </div>

          {/* Product Badges & Toggles */}
          <div className="p-4 bg-[#FAF9F5] rounded-xl border border-[#E6E7DD] flex flex-wrap gap-4 text-xs font-semibold text-[#26352B]">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formIsActive}
                onChange={(e) => setFormIsActive(e.target.checked)}
                className="rounded text-[#244B37] focus:ring-[#244B37] w-4 h-4"
              />
              <span>Active in Store</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formIsFeatured}
                onChange={(e) => setFormIsFeatured(e.target.checked)}
                className="rounded text-[#244B37] focus:ring-[#244B37] w-4 h-4"
              />
              <span>Featured Product</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formIsBestSeller}
                onChange={(e) => setFormIsBestSeller(e.target.checked)}
                className="rounded text-[#244B37] focus:ring-[#244B37] w-4 h-4"
              />
              <span>Best Seller</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formIsFreshToday}
                onChange={(e) => setFormIsFreshToday(e.target.checked)}
                className="rounded text-[#244B37] focus:ring-[#244B37] w-4 h-4"
              />
              <span>Harvested Fresh Today</span>
            </label>
          </div>

          {/* Existing Variants Section (when editing) */}
          {editingProduct && (
            <div className="pt-3 border-t border-[#E6E7DD]">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-[#26352B] uppercase tracking-wider">
                  Configured Product Variants ({editingProduct.variants?.length || 0})
                </h4>
              </div>

              {/* Variants List Table */}
              <div className="overflow-x-auto rounded-xl border border-[#E6E7DD] bg-white">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF9F5] border-b border-[#E6E7DD] text-[10px] font-bold text-[#778176] uppercase">
                    <tr>
                      <th className="p-2.5">Unit / Size</th>
                      <th className="p-2.5">Price</th>
                      <th className="p-2.5">MRP</th>
                      <th className="p-2.5">Stock</th>
                      <th className="p-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E6E7DD]">
                    {editingProduct.variants?.map((v) => (
                      <tr key={v.id}>
                        <td className="p-2.5 font-bold text-[#26352B]">
                          {v.unit} {v.is_default && <span className="text-[10px] text-[#496B45] font-normal">(Default)</span>}
                        </td>
                        <td className="p-2.5 font-semibold text-[#26352B]">₹{v.price}</td>
                        <td className="p-2.5 text-[#778176]">₹{v.mrp}</td>
                        <td className="p-2.5 font-bold text-[#26352B]">{v.stock} units</td>
                        <td className="p-2.5 text-right">
                          {!v.is_default && (
                            <button
                              type="button"
                              onClick={() => handleDeleteVariant(v.id)}
                              className="text-rose-600 hover:text-rose-800 text-xs font-bold"
                            >
                              Remove
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Add Variant Form */}
              <div className="mt-3 p-3 rounded-xl bg-[#FAF9F5] border border-[#E6E7DD] flex flex-wrap items-center gap-2 text-xs">
                <input
                  type="text"
                  value={newVariantUnit}
                  onChange={(e) => setNewVariantUnit(e.target.value)}
                  placeholder="Unit (e.g. 500 ml Glass Jar)"
                  className="px-2.5 py-1.5 bg-white border border-[#E6E7DD] rounded-lg text-xs flex-1 min-w-[140px]"
                />
                <input
                  type="number"
                  value={newVariantPrice}
                  onChange={(e) => setNewVariantPrice(Number(e.target.value))}
                  placeholder="Price ₹"
                  className="px-2.5 py-1.5 bg-white border border-[#E6E7DD] rounded-lg text-xs w-20"
                />
                <input
                  type="number"
                  value={newVariantMrp}
                  onChange={(e) => setNewVariantMrp(Number(e.target.value))}
                  placeholder="MRP ₹"
                  className="px-2.5 py-1.5 bg-white border border-[#E6E7DD] rounded-lg text-xs w-20"
                />
                <input
                  type="number"
                  value={newVariantStock}
                  onChange={(e) => setNewVariantStock(Number(e.target.value))}
                  placeholder="Stock"
                  className="px-2.5 py-1.5 bg-white border border-[#E6E7DD] rounded-lg text-xs w-20"
                />
                <button
                  type="button"
                  onClick={handleAddNewVariant}
                  disabled={isAddingVariant}
                  className="px-3 py-1.5 rounded-lg bg-[#244B37] text-white font-bold text-xs hover:bg-[#1C3C2C] disabled:opacity-50"
                >
                  {isAddingVariant ? 'Adding...' : 'Add Variant'}
                </button>
              </div>
            </div>
          )}

          {/* Dialog Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E6E7DD]">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-[#E6E7DD] bg-white hover:bg-[#F6F5EF] text-[#26352B] text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-[#244B37] hover:bg-[#1C3C2C] text-white text-xs font-bold shadow-xs hover:shadow-card-hover disabled:opacity-50"
            >
              {isSaving ? 'Persisting to D1...' : editingProduct ? 'Save Changes' : 'Create Product'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Deactivate / Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!productToDelete}
        onClose={() => setProductToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Deactivate Product"
        message={`Are you sure you want to deactivate "${productToDelete?.name}"? It will be hidden from customer storefront but preserved in the D1 database.`}
        confirmLabel="Deactivate"
        variant="warning"
        isLoading={isDeleting}
      />
    </div>
  );
};
