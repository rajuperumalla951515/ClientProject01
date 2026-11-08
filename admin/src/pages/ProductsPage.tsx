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
  Tag,
  Upload,
  Link as LinkIcon,
  DollarSign,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Copy,
  Wand2,
  ExternalLink
} from 'lucide-react';
import { api, aiApi } from '../services/api';
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

  // Multi-Image Intelligence State
  const [formImages, setFormImages] = useState<string[]>([]);
  const [importImageUrlInput, setImportImageUrlInput] = useState('');
  const [isImportingImage, setIsImportingImage] = useState(false);

  // SEO Fields & Google Preview State
  const [formMetaTitle, setFormMetaTitle] = useState('');
  const [formMetaDescription, setFormMetaDescription] = useState('');
  const [formKeywords, setFormKeywords] = useState('');
  const [isSeoExpanded, setIsSeoExpanded] = useState(false);

  // Contextual AI Dialog & Generator States
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiTitleModalOpen, setAiTitleModalOpen] = useState(false);
  const [aiTitleOptions, setAiTitleOptions] = useState<string[]>([]);
  const [aiDescriptionModalOpen, setAiDescriptionModalOpen] = useState(false);
  const [aiDescriptionData, setAiDescriptionData] = useState<any>(null);
  const [aiOffersModalOpen, setAiOffersModalOpen] = useState(false);
  const [aiOffersData, setAiOffersData] = useState<any>(null);

  // Unsplash AI Photo Picker State
  const [unsplashModalOpen, setUnsplashModalOpen] = useState(false);
  const [unsplashSearchQuery, setUnsplashSearchQuery] = useState('');
  const [unsplashResults, setUnsplashResults] = useState<any[]>([]);
  const [isLoadingUnsplash, setIsLoadingUnsplash] = useState(false);
  const [selectedUnsplashUrls, setSelectedUnsplashUrls] = useState<string[]>([]);

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
    const defaultImg = 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&q=80&w=800';
    setFormImageUrl(defaultImg);
    setFormImages([defaultImg]);
    setImportImageUrlInput('');
    setFormDescription('');
    setFormShortDescription('');
    setFormBrand('Sri Adithya Organics');
    setFormOriginFarm('');
    setFormCertifications('100% Certified Organic');
    setFormStorageInstructions('Store in a cool dry place away from direct sunlight');
    setFormMetaTitle('');
    setFormMetaDescription('');
    setFormKeywords('');
    setIsSeoExpanded(false);
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
    const primary = p.primary_image || p.images?.[0]?.image_url || 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&q=80&w=800';
    setFormImageUrl(primary);
    const existingImgs = (p.images && p.images.length > 0) ? p.images.map(img => img.image_url) : [primary];
    setFormImages(existingImgs);
    setImportImageUrlInput('');
    setFormDescription(p.description || '');
    setFormShortDescription(p.short_description || '');
    setFormBrand(p.brand || 'Sri Adithya Organics');
    setFormOriginFarm(p.origin_farm || '');
    setFormCertifications(p.certifications || '100% Certified Organic');
    setFormStorageInstructions(p.storage_instructions || '');
    setFormMetaTitle((p as any).meta_title || p.name);
    setFormMetaDescription((p as any).meta_description || p.short_description || '');
    setFormKeywords((p as any).keywords || '');
    setIsSeoExpanded(false);
    setFormIsFeatured(!!p.is_featured);
    setFormIsFreshToday(!!p.is_fresh_today);
    setFormIsDeal(!!p.is_deal);
    setFormIsBestSeller(!!p.is_best_seller);
    setFormIsActive(p.is_active !== false);
    setIsModalOpen(true);
  };

  // --- Contextual AI Generators (Directly in Product Form) ---

  const handleGenerateTitles = async () => {
    if (!formName.trim()) {
      showError('Please enter a base product name first (e.g. Groundnut Oil).');
      return;
    }
    const catName = categories.find(c => c.id === formCategoryId)?.name || 'Wood-Pressed Oils';
    setIsGeneratingAI(true);
    try {
      const res = await aiApi.generateTitle({
        product_name: formName,
        category: catName
      });
      const candidateList = [
        res.primary_title,
        res.short_title,
        res.traditional_name,
        res.seo_title,
        ...(res.alternatives || [])
      ].filter(Boolean);
      const unique = Array.from(new Set(candidateList)) as string[];
      setAiTitleOptions(unique);
      setAiTitleModalOpen(true);
    } catch (err: any) {
      showError(err.message || 'Failed to suggest titles.');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleGenerateDescription = async () => {
    if (!formName.trim()) {
      showError('Please enter a product name first.');
      return;
    }
    const catName = categories.find(c => c.id === formCategoryId)?.name || 'Wood-Pressed Oils';
    setIsGeneratingAI(true);
    try {
      const res = await aiApi.generateDescription({
        product_name: formName,
        category: catName,
        key_features: [formUnit, formBrand, formCertifications].filter(Boolean)
      });
      setAiDescriptionData(res);
      setAiDescriptionModalOpen(true);
    } catch (err: any) {
      showError(err.message || 'Failed to generate descriptions.');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleSuggestOffers = async () => {
    if (formPrice <= 0) {
      showError('Please specify a Selling Price greater than 0 first.');
      return;
    }
    setIsGeneratingAI(true);
    try {
      const res = await aiApi.suggestOffers({
        product_name: formName || 'Organic Item',
        selling_price: formPrice,
        mrp: formMrp
      });
      setAiOffersData(res);
      setAiOffersModalOpen(true);
    } catch (err: any) {
      showError(err.message || 'Failed to calculate margin-safe offers.');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleGenerateSEO = async () => {
    if (!formName.trim()) {
      showError('Please enter a product name first.');
      return;
    }
    const catName = categories.find(c => c.id === formCategoryId)?.name || 'Wood-Pressed Oils';
    setIsGeneratingAI(true);
    try {
      const res = await aiApi.generateSEO({
        product_name: formName,
        category: catName
      });
      if (res.meta_title) setFormMetaTitle(res.meta_title);
      if (res.meta_description) setFormMetaDescription(res.meta_description);
      if (res.keywords) {
        setFormKeywords(Array.isArray(res.keywords) ? res.keywords.join(', ') : res.keywords);
      }
      setIsSeoExpanded(true);
      showSuccess('SEO metadata generated & loaded into Google preview.', 'SEO Ready');
    } catch (err: any) {
      showError(err.message || 'Failed to generate SEO metadata.');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // --- Product Image Management Handlers ---

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showError('Image size exceeds 5MB limit. Please choose a smaller image.');
      return;
    }

    if (!file.type.match(/^image\/(jpeg|png|webp|gif)$/i)) {
      showError('Only JPG, PNG, WebP, and GIF images are supported.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const base64Url = uploadEvent.target?.result as string;
      if (base64Url) {
        setFormImages(prev => [base64Url, ...prev]);
        setFormImageUrl(base64Url);
        showSuccess('Image uploaded and set as primary.', 'Uploaded');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleImportImageUrl = async () => {
    const url = importImageUrlInput.trim();
    if (!url) {
      showError('Please enter a valid image URL.');
      return;
    }
    setIsImportingImage(true);
    try {
      const res = await aiApi.validateImageUrl(url);
      setFormImages(prev => [res.image_url, ...prev]);
      setFormImageUrl(res.image_url);
      setImportImageUrlInput('');
      showSuccess(`Image imported & verified (${res.size_kb} KB).`, 'Import Successful');
    } catch (err: any) {
      showError(err.message || 'Failed to import image URL.');
    } finally {
      setIsImportingImage(false);
    }
  };

  const handleSetPrimaryImage = (index: number) => {
    setFormImages(prev => {
      const next = [...prev];
      const [chosen] = next.splice(index, 1);
      next.unshift(chosen);
      setFormImageUrl(chosen);
      return next;
    });
    showSuccess('Primary image updated.');
  };

  const handleRemoveImage = (index: number) => {
    setFormImages(prev => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length > 0) {
        setFormImageUrl(next[0]);
      } else {
        setFormImageUrl('');
      }
      return next;
    });
  };

  // --- Unsplash AI Photo Picker Handlers ---

  const handleOpenUnsplash = async (customQuery?: string) => {
    const q = (customQuery || formName || categories.find(c => c.id === formCategoryId)?.name || 'wood pressed oil').trim();
    setUnsplashSearchQuery(q);
    setSelectedUnsplashUrls([]);
    setUnsplashModalOpen(true);
    setIsLoadingUnsplash(true);
    try {
      const cat = categories.find(c => c.id === formCategoryId)?.name;
      const res = await aiApi.searchUnsplash(q, cat, 16);
      setUnsplashResults(res.results || []);
    } catch (err: any) {
      showError(err.message || 'Failed to fetch Unsplash photos.');
    } finally {
      setIsLoadingUnsplash(false);
    }
  };

  const handleSearchUnsplashSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!unsplashSearchQuery.trim()) return;
    setIsLoadingUnsplash(true);
    try {
      const cat = categories.find(c => c.id === formCategoryId)?.name;
      const res = await aiApi.searchUnsplash(unsplashSearchQuery.trim(), cat, 16);
      setUnsplashResults(res.results || []);
    } catch (err: any) {
      showError(err.message || 'Failed to search Unsplash photos.');
    } finally {
      setIsLoadingUnsplash(false);
    }
  };

  const toggleSelectUnsplashPhoto = (url: string) => {
    setSelectedUnsplashUrls(prev =>
      prev.includes(url) ? prev.filter(u => u !== url) : [...prev, url]
    );
  };

  const handleApplySelectedUnsplashPhotos = (makePrimaryDirect = false, singleUrl?: string) => {
    if (singleUrl) {
      if (makePrimaryDirect) {
        setFormImages(prev => [singleUrl, ...prev.filter(u => u !== singleUrl)]);
        setFormImageUrl(singleUrl);
        showSuccess('Photo set as primary image.');
      } else {
        setFormImages(prev => prev.includes(singleUrl) ? prev : [...prev, singleUrl]);
        if (!formImageUrl) setFormImageUrl(singleUrl);
        showSuccess('Photo added to gallery.');
      }
      setUnsplashModalOpen(false);
      return;
    }

    if (selectedUnsplashUrls.length === 0) {
      showError('Please select at least one photo.');
      return;
    }

    setFormImages(prev => {
      const combined = [...prev];
      selectedUnsplashUrls.forEach(url => {
        if (!combined.includes(url)) combined.push(url);
      });
      return combined;
    });

    if (!formImageUrl && selectedUnsplashUrls.length > 0) {
      setFormImageUrl(selectedUnsplashUrls[0]);
    }

    showSuccess(`Added ${selectedUnsplashUrls.length} Unsplash photo(s) to product gallery.`);
    setUnsplashModalOpen(false);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      showError('Product name is required.');
      return;
    }

    setIsSaving(true);
    const cleanSlug = formName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `product-${Date.now()}`;
    const imageList = formImages.length > 0
      ? formImages
      : (formImageUrl.trim() ? [formImageUrl.trim()] : ['https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&q=80&w=800']);

    try {
      if (editingProduct) {
        // Update product master details
        await api.updateProduct(editingProduct.id, {
          name: formName.trim(),
          slug: cleanSlug,
          category_id: formCategoryId,
          description: formDescription.trim(),
          short_description: formShortDescription.trim() || formDescription.slice(0, 100),
          brand: formBrand.trim() || 'Sri Adithya Organics',
          origin_farm: formOriginFarm.trim(),
          certifications: formCertifications.trim(),
          storage_instructions: formStorageInstructions.trim(),
          is_featured: formIsFeatured,
          is_fresh_today: formIsFreshToday,
          is_deal: formIsDeal,
          is_best_seller: formIsBestSeller,
          is_active: formIsActive,
          images: imageList,
        });

        // Also update primary variant
        if (editingProduct.variants?.[0]?.id) {
          await api.updateVariant(editingProduct.id, editingProduct.variants[0].id, {
            unit: formUnit.trim() || '1 Litre Bottle',
            pack_size: formWeight.trim() || 'Standard Pack',
            price: Number(formPrice) || 99,
            mrp: Number(formMrp) || 120,
            stock: Number(formStock) || 50,
          });
        }

        showSuccess(`Product "${formName}" updated successfully in D1.`, 'Product Saved');
      } else {
        // Create product with default variant
        await api.createProduct({
          name: formName.trim(),
          slug: cleanSlug,
          category_id: formCategoryId,
          description: formDescription.trim() || formName.trim(),
          short_description: formShortDescription.trim() || formName.trim(),
          brand: formBrand.trim() || 'Sri Adithya Organics',
          origin_farm: formOriginFarm.trim(),
          certifications: formCertifications.trim() || '100% Certified Organic',
          storage_instructions: formStorageInstructions.trim(),
          is_featured: formIsFeatured,
          is_fresh_today: formIsFreshToday,
          is_deal: formIsDeal,
          is_best_seller: formIsBestSeller,
          is_active: formIsActive,
          variants: [
            {
              unit: formUnit.trim() || '1 Litre Bottle',
              pack_size: formWeight.trim() || 'Standard Pack',
              price: Number(formPrice) || 99,
              mrp: Number(formMrp) || 120,
              stock: Number(formStock) || 50,
            },
          ],
          images: imageList.map((url, i) => ({
            image_url: url,
            alt_text: `${formName} ${i + 1}`,
            is_primary: i === 0,
            display_order: i
          })),
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
            {/* Name with Contextual AI Title Generator */}
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-[#26352B]">
                  Product Name *
                </label>
                <button
                  type="button"
                  disabled={isGeneratingAI}
                  onClick={handleGenerateTitles}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold text-[#244B37] bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors disabled:opacity-50"
                  title="Generate organic, wood-pressed, and SEO title options"
                >
                  <Sparkles className="w-3 h-3 text-[#496B45]" />
                  AI Suggest Titles
                </button>
              </div>
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

            {/* Selling Price with Margin-Safe Offer Suggestions */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-[#26352B]">
                  Selling Price (₹) *
                </label>
                <button
                  type="button"
                  disabled={isGeneratingAI}
                  onClick={handleSuggestOffers}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold text-[#244B37] bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                  title="Suggest margin-safe promotional discounts"
                >
                  <Sparkles className="w-3 h-3 text-[#496B45]" />
                  Suggest Offers
                </button>
              </div>
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

            {/* Certifications & Farm Details */}
            <div>
              <label className="block text-xs font-bold text-[#26352B] mb-1">
                Certifications / Standard
              </label>
              <input
                type="text"
                value={formCertifications}
                onChange={(e) => setFormCertifications(e.target.value)}
                placeholder="100% Certified Organic / FSSAI"
                className="w-full px-3.5 py-2 bg-[#FAF9F5] border border-[#E6E7DD] rounded-xl text-xs text-[#26352B] focus:outline-none focus:border-[#496B45]"
              />
            </div>

            {/* Comprehensive Product Image Intelligence Section */}
            <div className="md:col-span-2 p-3.5 rounded-xl border border-[#E6E7DD] bg-[#FAF9F5] space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold text-[#26352B] flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-[#496B45]" /> Product Images & Visual Assets
                  </h4>
                  <p className="text-[10px] text-[#778176]">
                    Upload local files (max 5MB) or import from public HTTPS image URLs with SSRF protection.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenUnsplash()}
                    className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-bold text-[#244B37] hover:bg-emerald-100 flex items-center gap-1.5 shadow-2xs transition-colors"
                    title="Find high-resolution organic food and oil photos on Unsplash"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#496B45]" />
                    AI Find on Unsplash
                  </button>

                  <label className="px-3 py-1.5 rounded-lg bg-white border border-[#E6E7DD] text-xs font-bold text-[#244B37] hover:bg-[#F6F5EF] cursor-pointer flex items-center gap-1.5 shadow-2xs">
                    <Upload className="w-3.5 h-3.5 text-[#496B45]" /> Upload Local
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </label>
                </div>
              </div>

              {/* URL Import Input */}
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/... or cloud image URL"
                  value={importImageUrlInput}
                  onChange={(e) => setImportImageUrlInput(e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-white border border-[#E6E7DD] rounded-lg text-xs text-[#26352B] focus:outline-none focus:border-[#496B45]"
                />
                <button
                  type="button"
                  disabled={isImportingImage || !importImageUrlInput.trim()}
                  onClick={handleImportImageUrl}
                  className="px-3 py-1.5 rounded-lg bg-[#244B37] text-white text-xs font-bold hover:bg-[#1b392a] transition-colors disabled:opacity-50 flex items-center gap-1 shrink-0"
                >
                  {isImportingImage ? (
                    <>
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      Validating...
                    </>
                  ) : (
                    <>
                      <LinkIcon className="w-3 h-3" />
                      Import from URL
                    </>
                  )}
                </button>
              </div>

              {/* Image Preview Gallery Cards */}
              {formImages.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                  {formImages.map((imgUrl, idx) => (
                    <div
                      key={idx}
                      className={`relative group rounded-xl overflow-hidden border ${
                        idx === 0 ? 'border-[#244B37] ring-2 ring-[#244B37]/20' : 'border-[#E6E7DD]'
                      } bg-white shadow-2xs`}
                    >
                      <img
                        src={imgUrl}
                        alt={`Product ${idx + 1}`}
                        className="w-full h-24 object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&q=80&w=800';
                        }}
                      />
                      <div className="absolute top-1 left-1">
                        {idx === 0 ? (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#244B37] text-white shadow-xs">
                            ★ Primary
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSetPrimaryImage(idx)}
                            className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-white/95 text-[#26352B] hover:bg-white shadow-xs"
                          >
                            Set Primary
                          </button>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        className="absolute top-1 right-1 p-1 rounded-md bg-white/90 text-rose-600 hover:bg-rose-50 shadow-xs"
                        title="Remove image"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Description with Contextual AI Copywriter */}
            <div className="md:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                <label className="block text-xs font-bold text-[#26352B]">
                  Product Description & Nutritional Benefits
                </label>
                <button
                  type="button"
                  disabled={isGeneratingAI}
                  onClick={handleGenerateDescription}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold text-[#244B37] bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors disabled:opacity-50"
                  title="Generate engaging description, highlights, and benefits"
                >
                  <Sparkles className="w-3 h-3 text-[#496B45]" />
                  AI Write Description & Benefits
                </button>
              </div>
              <textarea
                rows={3}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Traditional stone/wood ghani pressed at low temperature below 40°C..."
                className="w-full px-3.5 py-2 bg-[#FAF9F5] border border-[#E6E7DD] rounded-xl text-xs text-[#26352B] focus:outline-none focus:border-[#496B45]"
              />
              {formShortDescription && (
                <div className="mt-1 text-[11px] text-[#778176] italic">
                  Short summary: "{formShortDescription}"
                </div>
              )}
            </div>

            {/* Storage Guidance */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-[#26352B] mb-1">
                Storage & Shelf-Life Guidance
              </label>
              <input
                type="text"
                value={formStorageInstructions}
                onChange={(e) => setFormStorageInstructions(e.target.value)}
                placeholder="Store in a cool, dry place away from direct sunlight. Shelf life: 9 months."
                className="w-full px-3.5 py-2 bg-[#FAF9F5] border border-[#E6E7DD] rounded-xl text-xs text-[#26352B] focus:outline-none focus:border-[#496B45]"
              />
            </div>

            {/* Collapsible Search Engine Optimization (SEO) Section with Google Preview */}
            <div className="md:col-span-2 rounded-xl border border-[#E6E7DD] bg-white overflow-hidden">
              <div
                className="p-3 bg-[#FAF9F5] flex items-center justify-between cursor-pointer select-none"
                onClick={() => setIsSeoExpanded(!isSeoExpanded)}
              >
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-[#496B45]" />
                  <span className="text-xs font-bold text-[#26352B]">
                    Search Engine Optimization (SEO) & Google Preview
                  </span>
                  <span className="text-[10px] text-[#778176]">
                    {isSeoExpanded ? '(Click to collapse)' : '(Click to expand)'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isGeneratingAI}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleGenerateSEO();
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold text-[#244B37] bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                  >
                    <Sparkles className="w-3 h-3 text-[#496B45]" />
                    Generate SEO Meta
                  </button>
                  {isSeoExpanded ? (
                    <ChevronUp className="w-4 h-4 text-[#778176]" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[#778176]" />
                  )}
                </div>
              </div>

              {isSeoExpanded && (
                <div className="p-4 space-y-3.5 border-t border-[#E6E7DD] bg-white">
                  {/* Google Search Result Preview */}
                  <div className="p-3 rounded-xl bg-[#FAF9F5] border border-[#E6E7DD] space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#778176]">
                      Google Search Result Preview
                    </span>
                    <div className="text-[11px] text-[#1a0dab] hover:underline font-medium truncate cursor-pointer">
                      https://sriadithyaorganics.pages.dev › products › {(formMetaTitle || formName).toLowerCase().replace(/\s+/g, '-')}
                    </div>
                    <div className="text-sm font-semibold text-[#1a0dab] line-clamp-1">
                      {formMetaTitle || formName || 'Product Title | Sri Adithya Organics'}
                    </div>
                    <div className="text-xs text-[#4d5156] line-clamp-2 leading-relaxed">
                      {formMetaDescription || formShortDescription || formDescription.slice(0, 150) || 'Buy 100% pure traditional wood-pressed oils and organic farm produce directly from Sri Adithya Organics.'}
                    </div>
                  </div>

                  {/* SEO Form Inputs */}
                  <div className="space-y-2.5">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[11px] font-bold text-[#26352B]">Meta Title</label>
                        <span className="text-[10px] text-[#778176]">
                          {formMetaTitle.length}/60 chars
                        </span>
                      </div>
                      <input
                        type="text"
                        maxLength={70}
                        value={formMetaTitle}
                        onChange={(e) => setFormMetaTitle(e.target.value)}
                        placeholder="e.g. Pure Wood-Pressed Groundnut Oil | Sri Adithya Organics"
                        className="w-full px-3 py-1.5 bg-[#FAF9F5] border border-[#E6E7DD] rounded-lg text-xs text-[#26352B] focus:outline-none focus:border-[#496B45]"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[11px] font-bold text-[#26352B]">Meta Description</label>
                        <span className="text-[10px] text-[#778176]">
                          {formMetaDescription.length}/160 chars
                        </span>
                      </div>
                      <textarea
                        rows={2}
                        maxLength={180}
                        value={formMetaDescription}
                        onChange={(e) => setFormMetaDescription(e.target.value)}
                        placeholder="e.g. Order cold-pressed, unrefined wood ghani groundnut oil online..."
                        className="w-full px-3 py-1.5 bg-[#FAF9F5] border border-[#E6E7DD] rounded-lg text-xs text-[#26352B] focus:outline-none focus:border-[#496B45]"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-[#26352B] block mb-1">Keywords / Search Tags</label>
                      <input
                        type="text"
                        value={formKeywords}
                        onChange={(e) => setFormKeywords(e.target.value)}
                        placeholder="wood pressed oil, marachekku, pure cold pressed, organic peanut oil"
                        className="w-full px-3 py-1.5 bg-[#FAF9F5] border border-[#E6E7DD] rounded-lg text-xs text-[#26352B] focus:outline-none focus:border-[#496B45]"
                      />
                    </div>
                  </div>
                </div>
              )}
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

      {/* 1. Contextual AI Title Suggestions Modal */}
      <Modal
        isOpen={aiTitleModalOpen}
        onClose={() => setAiTitleModalOpen(false)}
        title="Suggested Product Titles"
        subtitle="Select the title that best fits traditional wood-pressed extraction or certified organic standards"
        maxWidth="lg"
      >
        <div className="space-y-2.5">
          {aiTitleOptions.map((title, idx) => (
            <div
              key={idx}
              className="p-3 rounded-xl border border-[#E6E7DD] hover:border-[#244B37] bg-white hover:bg-emerald-50/40 transition-colors flex items-center justify-between gap-3 group"
            >
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#26352B] leading-snug">{title}</p>
                <span className="text-[10px] text-[#778176]">
                  {title.length} characters
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFormName(title);
                  setAiTitleModalOpen(false);
                  showSuccess('Title applied to product form.');
                }}
                className="px-3 py-1.5 rounded-lg bg-[#244B37] text-white text-xs font-bold hover:bg-[#1b392a] shrink-0 shadow-xs flex items-center gap-1"
              >
                <Check className="w-3 h-3" /> Select
              </button>
            </div>
          ))}
          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={() => setAiTitleModalOpen(false)}
              className="px-4 py-1.5 rounded-lg border border-[#E6E7DD] text-xs font-semibold text-[#778176] hover:bg-[#F6F5EF]"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      {/* 2. Contextual AI Description & Benefits Modal */}
      <Modal
        isOpen={aiDescriptionModalOpen}
        onClose={() => setAiDescriptionModalOpen(false)}
        title="AI Copywriter: Description & Highlights"
        subtitle="Review generated product catalog copy before applying to the product form"
        maxWidth="xl"
      >
        {aiDescriptionData && (
          <div className="space-y-4">
            {/* Short Description */}
            <div className="p-3 rounded-xl bg-[#FAF9F5] border border-[#E6E7DD] space-y-1">
              <span className="text-[10px] font-bold text-[#778176] uppercase tracking-wider">
                Short Summary (Card Preview)
              </span>
              <p className="text-xs font-medium text-[#26352B] leading-relaxed">
                {aiDescriptionData.short_description}
              </p>
            </div>

            {/* Detailed Description */}
            <div className="p-3 rounded-xl bg-white border border-[#E6E7DD] space-y-1">
              <span className="text-[10px] font-bold text-[#778176] uppercase tracking-wider">
                Full Detailed Description
              </span>
              <p className="text-xs text-[#26352B] leading-relaxed whitespace-pre-wrap">
                {aiDescriptionData.detailed_description}
              </p>
            </div>

            {/* Highlights */}
            {aiDescriptionData.highlights && aiDescriptionData.highlights.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-[#778176] uppercase tracking-wider">
                  Key Highlights & Benefits
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {aiDescriptionData.highlights.map((h: string, idx: number) => (
                    <div key={idx} className="p-2 rounded-lg bg-emerald-50/60 border border-emerald-200 text-xs font-medium text-[#244B37] flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#496B45]" />
                      <span>{h}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Storage */}
            {aiDescriptionData.storage_instructions && (
              <div className="p-2.5 rounded-lg bg-[#FAF9F5] border border-[#E6E7DD] text-xs text-[#778176]">
                <strong className="text-[#26352B]">Storage Note: </strong>
                {aiDescriptionData.storage_instructions}
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#E6E7DD]">
              <button
                type="button"
                onClick={() => setAiDescriptionModalOpen(false)}
                className="px-4 py-1.5 rounded-lg border border-[#E6E7DD] text-xs font-semibold text-[#778176] hover:bg-[#F6F5EF]"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={() => {
                  if (aiDescriptionData.detailed_description) setFormDescription(aiDescriptionData.detailed_description);
                  if (aiDescriptionData.short_description) setFormShortDescription(aiDescriptionData.short_description);
                  if (aiDescriptionData.storage_instructions) setFormStorageInstructions(aiDescriptionData.storage_instructions);
                  setAiDescriptionModalOpen(false);
                  showSuccess('Description and highlights applied to product form.');
                }}
                className="px-4 py-1.5 rounded-lg bg-[#244B37] text-white text-xs font-bold hover:bg-[#1b392a] flex items-center gap-1.5 shadow-xs"
              >
                <Check className="w-3.5 h-3.5" /> Accept & Apply to Form
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* 3. Margin-Safe Offer Suggestions Modal */}
      <Modal
        isOpen={aiOffersModalOpen}
        onClose={() => setAiOffersModalOpen(false)}
        title="Margin-Protected Offer Suggestions"
        subtitle="Deterministic profit calculations verifying your gross margin floor"
        maxWidth="xl"
      >
        {aiOffersData && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-[#FAF9F5] border border-[#E6E7DD] text-xs text-[#26352B]">
              <div>
                Base Price: <strong className="font-bold">₹{aiOffersData.selling_price}</strong> | MRP: <strong>₹{aiOffersData.mrp}</strong>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" /> Min Margin Floor: {aiOffersData.min_margin_percent}%
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {aiOffersData.offers?.map((offer: any) => (
                <div
                  key={offer.id}
                  className="rounded-xl border border-[#E6E7DD] p-3.5 bg-white flex flex-col justify-between hover:shadow-card-hover transition-shadow space-y-3"
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100/70 text-[#244B37]">
                        {offer.badge}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-700">
                        {offer.discount_percent}% OFF
                      </span>
                    </div>
                    <h5 className="text-xs font-bold text-[#26352B]">{offer.name}</h5>
                    <div className="mt-2 flex items-baseline gap-1.5">
                      <span className="text-lg font-bold text-[#244B37]">₹{offer.offer_price}</span>
                      <span className="text-xs text-[#778176] line-through">₹{offer.original_price}</span>
                    </div>
                    <div className="mt-1 text-[10px] text-[#778176]">
                      Margin: <span className="font-bold text-emerald-700">{offer.gross_margin_percent}%</span>
                    </div>
                    <p className="mt-2 text-[10px] text-[#778176] leading-relaxed">
                      {offer.rationale}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setFormPrice(offer.offer_price);
                      setAiOffersModalOpen(false);
                      showSuccess(`Offer price ₹${offer.offer_price} applied to form.`);
                    }}
                    className="w-full py-1.5 rounded-lg bg-[#244B37] text-white text-xs font-bold hover:bg-[#1b392a] flex items-center justify-center gap-1 shadow-xs"
                  >
                    Apply Price (₹{offer.offer_price})
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setAiOffersModalOpen(false)}
                className="px-4 py-1.5 rounded-lg border border-[#E6E7DD] text-xs font-semibold text-[#778176] hover:bg-[#F6F5EF]"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
      {/* 4. Unsplash AI Photo Picker Modal */}
      <Modal
        isOpen={unsplashModalOpen}
        onClose={() => setUnsplashModalOpen(false)}
        title="Unsplash High-Resolution Photo Library"
        subtitle="Search and select verified organic produce, wood-pressed oils, and farm harvest photography"
        maxWidth="3xl"
      >
        <div className="space-y-4">
          {/* Search Bar & Quick Categories */}
          <form onSubmit={handleSearchUnsplashSubmit} className="space-y-2.5">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#778176] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={unsplashSearchQuery}
                  onChange={(e) => setUnsplashSearchQuery(e.target.value)}
                  placeholder="Search Unsplash (e.g. Groundnut Oil, Honey, Ghee, Millets, Spices)..."
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
            </div>

            {/* Quick Topic Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 text-[11px]">
              <span className="text-[10px] font-bold text-[#778176] uppercase tracking-wider shrink-0 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#496B45]" /> Topics:
              </span>
              {[
                'Groundnut Oil',
                'Coconut Oil',
                'Sesame Oil',
                'Cow Ghee',
                'Raw Honey',
                'Millets',
                'Lentils & Dal',
                'Turmeric & Spices',
                'Fresh Vegetables',
                'Fresh Fruits',
                'Nuts & Dry Fruits'
              ].map((topic, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setUnsplashSearchQuery(topic);
                    handleOpenUnsplash(topic);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-[#FAF9F5] hover:bg-emerald-50 text-[#244B37] border border-[#E6E7DD] hover:border-emerald-200 font-medium whitespace-nowrap shrink-0 transition-colors"
                >
                  {topic}
                </button>
              ))}
            </div>
          </form>

          {/* Results Photo Grid */}
          <div className="min-h-[280px] max-h-[420px] overflow-y-auto pr-1">
            {isLoadingUnsplash ? (
              <div className="h-64 flex flex-col items-center justify-center gap-3 text-xs text-[#778176]">
                <RefreshCw className="w-6 h-6 animate-spin text-[#496B45]" />
                <span>Searching curated Unsplash library...</span>
              </div>
            ) : unsplashResults.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-xs text-[#778176]">
                <ImageIcon className="w-8 h-8 text-[#8A9B69] mb-2 opacity-60" />
                <p className="font-bold text-[#26352B]">No photos found for "{unsplashSearchQuery}"</p>
                <p className="text-[11px] mt-1">Try one of the suggested topics above or a broader term like "oil" or "honey".</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {unsplashResults.map((photo) => {
                  const isSelected = selectedUnsplashUrls.includes(photo.image_url);
                  return (
                    <div
                      key={photo.id}
                      onClick={() => toggleSelectUnsplashPhoto(photo.image_url)}
                      className={`group relative rounded-xl overflow-hidden border cursor-pointer transition-all shadow-2xs hover:shadow-card-hover ${
                        isSelected
                          ? 'border-[#244B37] ring-2 ring-[#244B37]/30'
                          : 'border-[#E6E7DD] hover:border-[#8A9B69]'
                      } bg-white flex flex-col`}
                    >
                      {/* Image Thumbnail */}
                      <div className="relative h-28 bg-[#FAF9F5] overflow-hidden">
                        <img
                          src={photo.thumbnail_url}
                          alt={photo.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                        {/* Selected Checkbox */}
                        <div className="absolute top-1.5 left-1.5">
                          <span
                            className={`w-5 h-5 rounded-md flex items-center justify-center shadow-xs transition-colors ${
                              isSelected
                                ? 'bg-[#244B37] text-white'
                                : 'bg-white/80 backdrop-blur-xs text-transparent border border-black/10'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        </div>
                        {/* Category Tag */}
                        <div className="absolute bottom-1 right-1">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-black/60 text-white backdrop-blur-xs">
                            {photo.category}
                          </span>
                        </div>
                      </div>

                      {/* Photo Title & Actions */}
                      <div className="p-2 flex-1 flex flex-col justify-between space-y-1.5">
                        <p className="text-[11px] font-semibold text-[#26352B] line-clamp-2 leading-tight">
                          {photo.title}
                        </p>
                        <div className="pt-1 flex items-center gap-1 border-t border-[#E6E7DD]/60">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApplySelectedUnsplashPhotos(true, photo.image_url);
                            }}
                            className="flex-1 py-1 rounded text-[10px] font-bold bg-[#244B37] text-white hover:bg-[#1b392a] transition-colors"
                            title="Set directly as Primary Image"
                          >
                            Set Primary
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApplySelectedUnsplashPhotos(false, photo.image_url);
                            }}
                            className="px-2 py-1 rounded text-[10px] font-bold bg-emerald-50 text-[#244B37] hover:bg-emerald-100 border border-emerald-200 transition-colors"
                            title="Add to product gallery"
                          >
                            + Gallery
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bottom Action Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-[#E6E7DD]">
            <span className="text-xs text-[#778176]">
              {selectedUnsplashUrls.length} photo(s) selected
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setUnsplashModalOpen(false)}
                className="px-4 py-1.5 rounded-lg border border-[#E6E7DD] text-xs font-semibold text-[#778176] hover:bg-[#F6F5EF]"
              >
                Close
              </button>
              <button
                type="button"
                disabled={selectedUnsplashUrls.length === 0}
                onClick={() => handleApplySelectedUnsplashPhotos(false)}
                className="px-4 py-1.5 rounded-lg bg-[#244B37] text-white text-xs font-bold hover:bg-[#1b392a] disabled:opacity-40 flex items-center gap-1.5 shadow-xs"
              >
                <Check className="w-3.5 h-3.5" />
                Add Selected ({selectedUnsplashUrls.length}) to Product
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
