'use client';

import { useState, useCallback } from 'react';
import { Search, Filter, X, TrendingUp, TrendingDown, Clock, DollarSign } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface FilterOptions {
  search: string;
  status: 'all' | 'active' | 'ended' | 'resolved';
  sortBy: 'created' | 'ending' | 'volume' | 'participants' | 'trending';
  sortOrder: 'asc' | 'desc';
  minPot: number;
  maxPot: number;
  tags: string[];
  creator?: string;
}

interface AdvancedFilterProps {
  onFilterChange: (filters: FilterOptions) => void;
  availableTags?: string[];
}

const DEFAULT_FILTERS: FilterOptions = {
  search: '',
  status: 'all',
  sortBy: 'trending',
  sortOrder: 'desc',
  minPot: 0,
  maxPot: 1000,
  tags: [],
};

export function AdvancedFilter({ onFilterChange, availableTags = [] }: AdvancedFilterProps) {
  const [filters, setFilters] = useState<FilterOptions>(DEFAULT_FILTERS);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [searchDebounce, setSearchDebounce] = useState<NodeJS.Timeout | null>(null);

  const updateFilters = useCallback((updates: Partial<FilterOptions>) => {
    const newFilters = { ...filters, ...updates };
    setFilters(newFilters);
    onFilterChange(newFilters);
  }, [filters, onFilterChange]);

  const handleSearchChange = (value: string) => {
    setFilters(prev => ({ ...prev, search: value }));
    
    // Debounce search
    if (searchDebounce) {
      clearTimeout(searchDebounce);
    }
    
    const timeout = setTimeout(() => {
      updateFilters({ search: value });
    }, 300);
    
    setSearchDebounce(timeout);
  };

  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    onFilterChange(DEFAULT_FILTERS);
  };

  const hasActiveFilters = () => {
    return filters.search !== '' ||
      filters.status !== 'all' ||
      filters.tags.length > 0 ||
      filters.minPot > 0 ||
      filters.maxPot < 1000;
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={filters.search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search arenas..."
          className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-800 rounded-lg focus:border-blue-500 focus:outline-none text-white"
        />
        {filters.search && (
          <button
            onClick={() => handleSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Quick Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Status Filters */}
        <div className="flex gap-2">
          {(['all', 'active', 'ended', 'resolved'] as const).map((status) => (
            <button
              key={status}
              onClick={() => updateFilters({ status })}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filters.status === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Sort By */}
        <div className="flex gap-2 border-l border-gray-800 pl-2">
          <select
            value={filters.sortBy}
            onChange={(e) => updateFilters({ sortBy: e.target.value as any })}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="trending">🔥 Trending</option>
            <option value="created">🆕 Newest</option>
            <option value="ending">⏰ Ending Soon</option>
            <option value="volume">💰 Highest Volume</option>
            <option value="participants">👥 Most Popular</option>
          </select>

          <button
            onClick={() => updateFilters({ 
              sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc' 
            })}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700"
          >
            {filters.sortOrder === 'asc' ? (
              <TrendingUp className="w-5 h-5" />
            ) : (
              <TrendingDown className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Advanced Toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
            showAdvanced || hasActiveFilters()
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          <Filter className="w-4 h-4" />
          Advanced
          {hasActiveFilters() && !showAdvanced && (
            <span className="w-2 h-2 bg-blue-400 rounded-full" />
          )}
        </button>

        {/* Clear Filters */}
        {hasActiveFilters() && (
          <button
            onClick={clearFilters}
            className="px-4 py-2 text-sm text-red-400 hover:text-red-300"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Advanced Filters */}
      <AnimatePresence>
        {showAdvanced && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-gray-900 rounded-lg p-6 space-y-4 overflow-hidden"
          >
            {/* Pot Range */}
            <div>
              <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Pot Range (SOL)
              </label>
              <div className="flex gap-4 items-center">
                <input
                  type="number"
                  value={filters.minPot}
                  onChange={(e) => updateFilters({ minPot: parseFloat(e.target.value) || 0 })}
                  placeholder="Min"
                  className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none"
                />
                <span className="text-gray-500">to</span>
                <input
                  type="number"
                  value={filters.maxPot}
                  onChange={(e) => updateFilters({ maxPot: parseFloat(e.target.value) || 1000 })}
                  placeholder="Max"
                  className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="mt-2">
                <input
                  type="range"
                  min="0"
                  max="1000"
                  step="10"
                  value={filters.maxPot}
                  onChange={(e) => updateFilters({ maxPot: parseFloat(e.target.value) })}
                  className="w-full"
                />
              </div>
            </div>

            {/* Tags */}
            {availableTags.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-2">Tags</label>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map((tag) => {
                    const isSelected = filters.tags.includes(tag);
                    return (
                      <button
                        key={tag}
                        onClick={() => {
                          const newTags = isSelected
                            ? filters.tags.filter(t => t !== tag)
                            : [...filters.tags, tag];
                          updateFilters({ tags: newTags });
                        }}
                        className={`px-3 py-1 rounded-full text-sm transition-colors ${
                          isSelected
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                        }`}
                      >
                        #{tag}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Creator Filter */}
            <div>
              <label className="block text-sm font-medium mb-2">Creator Wallet</label>
              <input
                type="text"
                value={filters.creator || ''}
                onChange={(e) => updateFilters({ creator: e.target.value || undefined })}
                placeholder="Filter by creator address"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Filters Display */}
      {hasActiveFilters() && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-gray-400">Active filters:</span>
          {filters.search && (
            <span className="px-3 py-1 bg-gray-800 rounded-full text-sm flex items-center gap-2">
              Search: "{filters.search}"
              <button onClick={() => handleSearchChange('')}>
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filters.status !== 'all' && (
            <span className="px-3 py-1 bg-gray-800 rounded-full text-sm flex items-center gap-2">
              Status: {filters.status}
              <button onClick={() => updateFilters({ status: 'all' })}>
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filters.tags.map((tag) => (
            <span key={tag} className="px-3 py-1 bg-gray-800 rounded-full text-sm flex items-center gap-2">
              #{tag}
              <button onClick={() => updateFilters({ tags: filters.tags.filter(t => t !== tag) })}>
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {(filters.minPot > 0 || filters.maxPot < 1000) && (
            <span className="px-3 py-1 bg-gray-800 rounded-full text-sm flex items-center gap-2">
              Pot: {filters.minPot} - {filters.maxPot} SOL
              <button onClick={() => updateFilters({ minPot: 0, maxPot: 1000 })}>
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

