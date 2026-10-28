import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, X, Sparkles } from 'lucide-react';
import { api } from '../services/api';
import { Product } from '../types';
import { ProductCard, ProductCardSkeleton } from '../components/ProductCard';

export const SearchResultsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(query);

  useEffect(() => {
    setSearchInput(query);
    if (!query.trim()) {
      setProducts([]);
      setIsLoading(false);
      return;
    }
    const doSearch = async () => {
      setIsLoading(true);
      try {
        const results = await api.getProducts({ search: query, limit: 100 });
        setProducts(results);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    doSearch();
  }, [query]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setSearchParams({ q: searchInput.trim() });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">

      {/* Search Header Form */}
      <div className="max-w-2xl mx-auto text-center space-y-4">
        <h1 className="font-display font-black text-2xl sm:text-3xl text-stone-900">
          Search Sri Adithya Organics
        </h1>
        <form onSubmit={handleSearchSubmit} className="relative w-full max-w-xl mx-auto">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search wood-pressed oil, desi tomatoes, A2 ghee, millets..."
            className="w-full pl-11 pr-24 py-3.5 rounded-2xl bg-white border border-stone-200 text-sm font-medium shadow-soft focus:outline-none focus:border-rootly-forest"
          />
          <Search className="w-5 h-5 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 rounded-xl bg-rootly-forest text-white text-xs font-bold hover:bg-rootly-dark"
          >
            Search
          </button>
        </form>
        {query && (
          <p className="text-xs text-stone-500">
            Showing {products.length} results for <strong className="text-stone-800 font-bold">"{query}"</strong>
          </p>
        )}
      </div>

      {/* Grid or Empty */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4 py-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="max-w-md mx-auto p-8 sm:p-12 text-center rounded-3xl bg-white border border-stone-200 shadow-soft">
          <Search className="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <h3 className="font-display font-bold text-base text-stone-800">No organic products matched your search</h3>
          <p className="text-xs text-stone-500 mt-1 mb-5">
            Try checking for spelling or searching for a broader term like "Vegetables", "Rice", or "Oil".
          </p>
          <Link
            to="/products"
            className="px-5 py-2.5 rounded-xl bg-rootly-forest text-white text-xs font-bold"
          >
            View All Products
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-5">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}

    </div>
  );
};

