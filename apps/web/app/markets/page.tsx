"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, 
  Filter, 
  Grid3x3, 
  List, 
  TrendingUp, 
  Clock, 
  DollarSign,
  Users,
  ArrowUpDown
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

interface Market {
  id: string;
  title: string;
  question: string;
  category: string;
  outcomes: string[];
  volume: number;
  participants: number;
  endTime: number;
  resolved: boolean;
  trending: boolean;
  featured: boolean;
  createdAt: number;
}

const CATEGORIES = [
  "All",
  "Sports",
  "Politics",
  "Crypto",
  "Entertainment",
  "Science",
  "Business",
  "Gaming",
  "Other"
];

const SORT_OPTIONS = [
  { value: "volume", label: "Volume" },
  { value: "newest", label: "Newest" },
  { value: "ending", label: "Ending Soon" },
  { value: "participants", label: "Most Active" },
];

export default function MarketsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortBy, setSortBy] = useState("volume");
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "resolved">("active");

  useEffect(() => {
    loadMarkets();
  }, [selectedCategory, sortBy, statusFilter, searchQuery]);

  const loadMarkets = async () => {
    setLoading(true);
    
    // Mock data - would fetch from API
    const mockMarkets: Market[] = [
      {
        id: "1",
        title: "Will Bitcoin reach $100k by end of 2024?",
        question: "Will BTC price reach $100,000 USD before December 31, 2024?",
        category: "Crypto",
        outcomes: ["Yes", "No"],
        volume: 125000000000,
        participants: 1250,
        endTime: Date.now() + 30 * 24 * 60 * 60 * 1000,
        resolved: false,
        trending: true,
        featured: true,
        createdAt: Date.now() - 10 * 24 * 60 * 60 * 1000,
      },
      {
        id: "2",
        title: "Will Solana flip Ethereum in TVL?",
        question: "Will Solana's Total Value Locked exceed Ethereum's by Q2 2025?",
        category: "Crypto",
        outcomes: ["Yes", "No"],
        volume: 85000000000,
        participants: 890,
        endTime: Date.now() + 60 * 24 * 60 * 60 * 1000,
        resolved: false,
        trending: true,
        featured: false,
        createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
      },
      // Add more mock markets...
    ];

    // Apply filters
    let filtered = mockMarkets;

    if (selectedCategory !== "All") {
      filtered = filtered.filter(m => m.category === selectedCategory);
    }

    if (statusFilter === "active") {
      filtered = filtered.filter(m => !m.resolved);
    } else if (statusFilter === "resolved") {
      filtered = filtered.filter(m => m.resolved);
    }

    if (searchQuery) {
      filtered = filtered.filter(m => 
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.question.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "volume":
          return b.volume - a.volume;
        case "newest":
          return b.createdAt - a.createdAt;
        case "ending":
          return a.endTime - b.endTime;
        case "participants":
          return b.participants - a.participants;
        default:
          return 0;
      }
    });

    setMarkets(filtered);
    setLoading(false);
  };

  const MarketCard = ({ market }: { market: Market }) => (
    <Link href={`/market/${market.id}`}>
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 hover:border-slate-600 transition-all cursor-pointer h-full">
          <CardContent className="p-6">
            {/* Badges */}
            <div className="flex items-center gap-2 mb-3">
              {market.trending && (
                <Badge className="bg-red-500/20 text-red-400 border-red-500/50">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Trending
                </Badge>
              )}
              {market.featured && (
                <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">
                  Featured
                </Badge>
              )}
              <Badge variant="outline" className="text-xs">
                {market.category}
              </Badge>
            </div>

            {/* Title */}
            <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">
              {market.title}
            </h3>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <p className="text-xs text-slate-400 mb-1">Volume</p>
                <p className="text-sm font-semibold text-white">
                  {(market.volume / 1e9).toFixed(2)} SOL
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Participants</p>
                <p className="text-sm font-semibold text-white">
                  {market.participants.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Outcomes */}
            <div className="space-y-2 mb-4">
              {market.outcomes.map((outcome, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">{outcome}</span>
                  <span className="text-sm font-medium text-white">
                    {50 + (index === 0 ? 5 : -5)}%
                  </span>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-700">
              <div className="flex items-center gap-1 text-xs text-slate-400">
                <Clock className="h-3 w-3" />
                <span>
                  {Math.floor((market.endTime - Date.now()) / (24 * 60 * 60 * 1000))}d left
                </span>
              </div>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                Trade
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </Link>
  );

  const MarketListItem = ({ market }: { market: Market }) => (
    <Link href={`/market/${market.id}`}>
      <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 hover:border-slate-600 transition-all cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {market.trending && (
                  <TrendingUp className="h-4 w-4 text-red-400" />
                )}
                <h3 className="text-base font-semibold text-white">{market.title}</h3>
              </div>
              <div className="flex items-center gap-4 text-sm text-slate-400">
                <span className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  {(market.volume / 1e9).toFixed(2)} SOL
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {market.participants}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {Math.floor((market.endTime - Date.now()) / (24 * 60 * 60 * 1000))}d
                </span>
              </div>
            </div>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
              Trade
            </Button>
          </div>
        </CardContent>
      </Card>
    </Link>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Markets</h1>
          <p className="text-slate-400">Explore and trade prediction markets</p>
        </div>

        {/* Search & Filters */}
        <div className="mb-6 space-y-4">
          {/* Search Bar */}
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <Input
                placeholder="Search markets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="bg-slate-800 border-slate-700"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
            <div className="flex items-center gap-2 bg-slate-800 rounded-lg p-1">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {CATEGORIES.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className={selectedCategory === category ? "" : "bg-slate-800 border-slate-700"}
              >
                {category}
              </Button>
            ))}
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <Card className="bg-slate-800 border-slate-700 p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm text-slate-400 mb-2 block">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="all">All Markets</option>
                    <option value="active">Active Only</option>
                    <option value="resolved">Resolved Only</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-slate-400 mb-2 block">Sort By</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  >
                    {SORT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Results Count */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-slate-400">
            {markets.length} markets found
          </p>
          <Button variant="ghost" size="sm" className="text-slate-400">
            <ArrowUpDown className="h-4 w-4 mr-2" />
            Sort: {SORT_OPTIONS.find(o => o.value === sortBy)?.label}
          </Button>
        </div>

        {/* Markets Grid/List */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-slate-400">Loading markets...</p>
          </div>
        ) : markets.length === 0 ? (
          <Card className="bg-slate-800 border-slate-700 p-12">
            <div className="text-center">
              <p className="text-slate-400 mb-4">No markets found</p>
              <Button onClick={() => {
                setSearchQuery("");
                setSelectedCategory("All");
                setStatusFilter("all");
              }}>
                Clear Filters
              </Button>
            </div>
          </Card>
        ) : (
          <>
            {viewMode === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {markets.map((market) => (
                  <MarketCard key={market.id} market={market} />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {markets.map((market) => (
                  <MarketListItem key={market.id} market={market} />
                ))}
              </div>
            )}
          </>
        )}

        {/* Pagination */}
        {markets.length > 0 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <Button variant="outline" className="bg-slate-800 border-slate-700">
              Previous
            </Button>
            <Button variant="outline" className="bg-slate-800 border-slate-700">
              1
            </Button>
            <Button className="bg-blue-600">
              2
            </Button>
            <Button variant="outline" className="bg-slate-800 border-slate-700">
              3
            </Button>
            <Button variant="outline" className="bg-slate-800 border-slate-700">
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

