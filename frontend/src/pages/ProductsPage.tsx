import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Filter, SlidersHorizontal, ArrowUpDown, X, Sparkles, Check } from 'lucide-react';
import { api } from '../services/api';
import { Category, Product } from '../types';
import { ProductCard, ProductCardSkeleton } from '../components/ProductCard';
import { getShortNavLabel } from '../utils/navigationLabels';

export const ProductsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const categorySlug = searchParams.get('category') || '';
  const collection = searchParams.get('collection') || '';
  const searchQuery = searchParams.get('search') || '';

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters state
  const [selectedSort, setSelectedSort] = useState<string>('popular');
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [maxPrice, setMaxPrice] = useState<number>(2000);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState<boolean>(false);

  // Fetch categories
  useEffect(() => {
    api.getCategories().then(setCategories).catch(console.error);
  }, []);

  // Fetch products based on filters
  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      try {
        const data = await api.getProducts({
          category_slug: categorySlug || undefined,
          collection: collection || undefined,
          search: searchQuery || undefined,
          in_stock_only: inStockOnly || undefined,
          sort: selectedSort,
          max_price: maxPrice < 2000 ? maxPrice : undefined,
          limit: 100,
        });
        setProducts(data);
      } catch (err) {
        console.error('Failed to fetch products:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProducts();
  }, [categorySlug, collection, searchQuery, inStockOnly, selectedSort, maxPrice]);

  const activeCategory = categories.find((c) => c.slug === categorySlug);

  const clearAllFilters = () => {
    setSearchParams({});
    setInStockOnly(false);
    setMaxPrice(2000);
    setSelectedSort('popular');
  };

  const getPageTitle = () => {
    if (searchQuery) return `Search Results for "${searchQuery}"`;
    if (activeCategory) return activeCategory.name;
    if (collection === 'deals') return 'Deals of the Day';
    if (collection === 'best_sellers') return 'Best Sellers';
    if (collection === 'fresh_today') return 'Harvested Fresh Today';
    return 'All Organic Products';
  };

  return (
    <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 py-6 sm:py-8">
      
      {/* Breadcrumb & Header */}
      <div className="mb-6">
        <nav className="flex items-center gap-2 text-xs text-stone-400 mb-2">
          <Link to="/" className="hover:text-stone-700">Home</Link>
          <span>/</span>
          <span className="text-stone-700 font-semibold">{getPageTitle()}</span>
        </nav>
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display font-black text-2xl sm:text-3xl text-stone-900 tracking-tight">
              {getPageTitle()}
            </h1>
            <p className="text-xs text-stone-500 mt-1">
              Showing {products.length} certified organic produce and groceries
            </p>
          </div>

          {/* Sort Controls */}
          <div className="flex items-center gap-3 self-end sm:self-auto">
            <button
              onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
              className="lg:hidden flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-stone-200 text-xs font-bold text-stone-700 shadow-sm"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filters</span>
            </button>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-stone-500 hidden sm:inline">Sort By:</span>
              <select
                value={selectedSort}
                onChange={(e) => setSelectedSort(e.target.value)}
                className="text-xs font-bold py-2 px-3 rounded-xl bg-white border border-stone-200 text-stone-800 shadow-sm focus:outline-none focus:border-rootly-forest"
              >
                <option value="popular">Most Popular</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="newest">Newest Harvest</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Filters Slide-over Drawer */}
      {isMobileFilterOpen && (
        <div className="fixed inset-0 z-50 lg:hidden overflow-y-auto">
          <div
            onClick={() => setIsMobileFilterOpen(false)}
            className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm transition-opacity"
          />
          <div className="flex min-h-full items-end justify-center p-0">
            <div className="relative w-full rounded-t-3xl bg-white p-5 shadow-2xl border-t border-stone-200 max-h-[85vh] flex flex-col animate-fadeIn">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-3 border-b border-stone-100 shrink-0">
                <span className="text-sm font-bold uppercase tracking-wider text-stone-900 flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-rootly-forest" />
                  Filter Products
                </span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={clearAllFilters}
                    className="text-xs font-bold text-rootly-forest hover:underline"
                  >
                    Reset All
                  </button>
                  <button
                    onClick={() => setIsMobileFilterOpen(false)}
                    className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Scrollable Filters */}
              <div className="flex-1 overflow-y-auto py-4 space-y-5">
                {/* Categories */}
                <div>
                  <h4 className="text-xs font-bold text-stone-900 mb-2">Categories</h4>
                  <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                    <Link
                      to="/products"
                      onClick={() => setIsMobileFilterOpen(false)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                        !categorySlug ? 'bg-rootly-forest text-white' : 'text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      <span>All Categories</span>
                    </Link>
                    {categories.map((cat) => {
                      const isActive = categorySlug === cat.slug;
                      return (
                        <Link
                          key={cat.id}
                          to={`/products?category=${cat.slug}`}
                          onClick={() => setIsMobileFilterOpen(false)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                            isActive ? 'bg-rootly-forest text-white' : 'text-stone-700 hover:bg-stone-100'
                          }`}
                        >
                          <span>{cat.name}</span>
                          {cat.product_count !== undefined && (
                            <span className={`text-[10px] ${isActive ? 'text-rootly-sagePale' : 'text-stone-400'}`}>
                              {cat.product_count}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>

                {/* Price Range Filter */}
                <div className="pt-4 border-t border-stone-100">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-xs font-bold text-stone-900">Max Price</h4>
                    <span className="text-xs font-bold text-rootly-forest">₹{maxPrice}</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="2000"
                    step="50"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(Number(e.target.value))}
                    className="w-full accent-rootly-forest cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-stone-400 mt-1">
                    <span>₹50</span>
                    <span>₹2000+</span>
                  </div>
                </div>

                {/* In Stock Only Checkbox */}
                <div className="pt-4 border-t border-stone-100">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={inStockOnly}
                      onChange={(e) => setInStockOnly(e.target.checked)}
                      className="w-4 h-4 rounded text-rootly-forest focus:ring-rootly-sage border-stone-300"
                    />
                    <span className="text-xs font-bold text-stone-800">In Stock Only</span>
                  </label>
                </div>
              </div>

              {/* Sticky Apply Button */}
              <div className="pt-3 border-t border-stone-100 shrink-0">
                <button
                  onClick={() => setIsMobileFilterOpen(false)}
                  className="w-full py-3 rounded-xl bg-rootly-forest text-white font-bold text-xs shadow-md hover:bg-rootly-dark transition-all"
                >
                  Apply Filters ({products.length} Products)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Desktop Filter Sidebar */}
        <aside className="hidden lg:block lg:col-span-1 space-y-6 bg-white p-5 rounded-2xl border border-stone-200/90 shadow-soft self-start sticky top-28">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-800 flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filter Products
            </span>
            <button
              onClick={clearAllFilters}
              className="text-[11px] font-bold text-rootly-forest hover:underline"
            >
              Reset All
            </button>
          </div>

          {/* Categories Filter */}
          <div>
            <h4 className="text-xs font-bold text-stone-900 mb-2.5">Categories</h4>
            <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
              <Link
                to="/products"
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  !categorySlug
                    ? 'bg-rootly-forest text-white'
                    : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                <span>All Categories</span>
              </Link>
              {categories.map((cat) => {
                const isActive = categorySlug === cat.slug;
                return (
                  <Link
                    key={cat.id}
                    to={`/products?category=${cat.slug}`}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-rootly-forest text-white'
                        : 'text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    <span className="truncate">{cat.name}</span>
                    {cat.product_count !== undefined && (
                      <span className={`text-[10px] ${isActive ? 'text-rootly-sagePale' : 'text-stone-400'}`}>
                        {cat.product_count}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Price Range Filter */}
          <div className="pt-4 border-t border-stone-100">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-xs font-bold text-stone-900">Max Price</h4>
              <span className="text-xs font-bold text-rootly-forest">₹{maxPrice}</span>
            </div>
            <input
              type="range"
              min="50"
              max="2000"
              step="50"
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-full accent-rootly-forest cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-stone-400 mt-1">
              <span>₹50</span>
              <span>₹2000+</span>
            </div>
          </div>

          {/* In Stock Only Checkbox */}
          <div className="pt-4 border-t border-stone-100">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
                className="w-4 h-4 rounded text-rootly-forest focus:ring-rootly-sage border-stone-300"
              />
              <span className="text-xs font-bold text-stone-800">In Stock Only</span>
            </label>
          </div>
        </aside>

        {/* Product Grid Area */}
        <main className="lg:col-span-3">
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 sm:gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-white border border-stone-200">
              <div className="w-16 h-16 rounded-2xl bg-rootly-cream flex items-center justify-center text-stone-400 mx-auto mb-3">
                <Sparkles className="w-8 h-8 text-stone-400" />
              </div>
              <h3 className="font-display font-bold text-lg text-stone-800">No matching organic products</h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1 mb-5">
                We couldn't find any products matching your current filters. Try resetting the filters to view our full catalogue.
              </p>
              <button
                onClick={clearAllFilters}
                className="px-5 py-2.5 rounded-xl bg-rootly-forest text-white text-xs font-bold hover:bg-rootly-dark transition-all"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 sm:gap-5">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </main>

      </div>
    </div>
  );
};

