"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X } from "lucide-react";

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

/**
 * Search Bar Component
 * USERFLOW.md spec: 56px height, matches header style
 */
export function SearchBar({ onSearch, placeholder = "🔍 Search arenas..." }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Debounce search
    const timer = setTimeout(() => {
      onSearch(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, onSearch]);

  const handleClear = () => {
    setQuery("");
    inputRef.current?.focus();
  };

  return (
    <div className="relative w-full">
      <motion.div
        initial={false}
        animate={{
          borderColor: isFocused ? "#A020F0" : "#2D2D2D",
          boxShadow: isFocused
            ? "0 0 0 2px rgba(160, 32, 240, 0.2)"
            : "0 0 0 0px transparent",
        }}
        className="relative flex items-center bg-dark-gray border rounded-lg overflow-hidden transition-all"
        style={{ height: "48px" }}
      >
        {/* Search Icon */}
        <div className="pl-4 pr-2">
          <Search
            className="w-5 h-5"
            style={{ color: isFocused ? "#A020F0" : "#666666" }}
          />
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className="flex-1 bg-transparent border-none outline-none text-white placeholder:text-light-gray"
          style={{
            fontFamily: '"Inter", system-ui, sans-serif',
            fontSize: "16px",
          }}
        />

        {/* Clear Button */}
        <AnimatePresence>
          {query && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={handleClear}
              className="pr-4 pl-2 hover:scale-110 transition-transform"
              type="button"
            >
              <X className="w-5 h-5 text-light-gray hover:text-white" />
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Search Results Hint */}
      {query && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-full mt-2 left-0 right-0 text-xs text-light-gray px-4"
        >
          Searching for "{query}"...
        </motion.div>
      )}
    </div>
  );
}

