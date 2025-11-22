"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { 
  History, 
  TrendingUp, 
  Droplets, 
  BookOpen, 
  Download,
  Search,
  Filter,
  Calendar,
  ArrowUpDown
} from "lucide-react";
import Link from "next/link";

interface Activity {
  id: string;
  type: "trade" | "liquidity" | "order" | "claim";
  action: string;
  market: string;
  marketId: string;
  outcome?: string;
  amount: number;
  price?: number;
  fee: number;
  pnl?: number;
  timestamp: number;
  txSignature: string;
  status: "success" | "pending" | "failed";
}

export default function ActivityPage() {
  const { publicKey } = useWallet();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");

  useEffect(() => {
    if (!publicKey) {
      setLoading(false);
      return;
    }

    loadActivities();
  }, [publicKey, typeFilter, dateFilter]);

  const loadActivities = async () => {
    setLoading(true);

    // Mock data - would fetch from API
    const mockActivities: Activity[] = [
      {
        id: "1",
        type: "trade",
        action: "Bought",
        market: "Will Bitcoin reach $100k by end of 2024?",
        marketId: "1",
        outcome: "Yes",
        amount: 100,
        price: 0.55,
        fee: 0.3,
        timestamp: Date.now() - 5 * 60 * 1000,
        txSignature: "5yxN...kQpU",
        status: "success",
      },
      {
        id: "2",
        type: "liquidity",
        action: "Added Liquidity",
        market: "Will Solana flip Ethereum in TVL?",
        marketId: "2",
        amount: 500,
        fee: 0,
        timestamp: Date.now() - 2 * 60 * 60 * 1000,
        txSignature: "8xYz...mNpQ",
        status: "success",
      },
      {
        id: "3",
        type: "order",
        action: "Placed Limit Order",
        market: "Will ETH reach $5k?",
        marketId: "3",
        outcome: "Yes",
        amount: 200,
        price: 0.60,
        fee: 0,
        timestamp: Date.now() - 5 * 60 * 60 * 1000,
        txSignature: "3aWx...bCdE",
        status: "pending",
      },
      {
        id: "4",
        type: "trade",
        action: "Sold",
        market: "Will Bitcoin reach $100k by end of 2024?",
        marketId: "1",
        outcome: "No",
        amount: 50,
        price: 0.45,
        fee: 0.15,
        pnl: 5.5,
        timestamp: Date.now() - 24 * 60 * 60 * 1000,
        txSignature: "9zAb...cDeF",
        status: "success",
      },
      {
        id: "5",
        type: "claim",
        action: "Claimed Winnings",
        market: "Will SOL reach $200?",
        marketId: "4",
        amount: 250,
        fee: 0,
        pnl: 125,
        timestamp: Date.now() - 3 * 24 * 60 * 60 * 1000,
        txSignature: "4bCd...eFgH",
        status: "success",
      },
    ];

    // Apply filters
    let filtered = mockActivities;

    if (typeFilter !== "all") {
      filtered = filtered.filter(a => a.type === typeFilter);
    }

    if (dateFilter !== "all") {
      const now = Date.now();
      const cutoff = {
        "24h": now - 24 * 60 * 60 * 1000,
        "7d": now - 7 * 24 * 60 * 60 * 1000,
        "30d": now - 30 * 24 * 60 * 60 * 1000,
      }[dateFilter];

      if (cutoff) {
        filtered = filtered.filter(a => a.timestamp >= cutoff);
      }
    }

    if (searchQuery) {
      filtered = filtered.filter(a =>
        a.market.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.action.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setActivities(filtered);
    setLoading(false);
  };

  const exportToCSV = () => {
    const headers = ["Date", "Type", "Action", "Market", "Amount", "Price", "Fee", "P&L", "Status", "Tx"];
    const rows = activities.map(a => [
      new Date(a.timestamp).toLocaleString(),
      a.type,
      a.action,
      a.market,
      a.amount,
      a.price || "-",
      a.fee,
      a.pnl || "-",
      a.status,
      a.txSignature,
    ]);

    const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `betfun-activity-${Date.now()}.csv`;
    a.click();
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "trade":
        return <TrendingUp className="h-4 w-4" />;
      case "liquidity":
        return <Droplets className="h-4 w-4" />;
      case "order":
        return <BookOpen className="h-4 w-4" />;
      case "claim":
        return <History className="h-4 w-4" />;
      default:
        return <History className="h-4 w-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case "trade":
        return "text-blue-400 bg-blue-500/10 border-blue-500/30";
      case "liquidity":
        return "text-purple-400 bg-purple-500/10 border-purple-500/30";
      case "order":
        return "text-yellow-400 bg-yellow-500/10 border-yellow-500/30";
      case "claim":
        return "text-green-400 bg-green-500/10 border-green-500/30";
      default:
        return "text-slate-400 bg-slate-500/10 border-slate-500/30";
    }
  };

  if (!publicKey) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 p-8">
          <div className="text-center">
            <History className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Connect Your Wallet</h2>
            <p className="text-slate-400">Connect your wallet to view your activity history</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">Activity History</h1>
              <p className="text-slate-400">Track all your trades, orders, and transactions</p>
            </div>
            <Button
              onClick={exportToCSV}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 space-y-4">
          {/* Search */}
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <Input
                placeholder="Search activity..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-slate-800 border-slate-700 text-white"
              />
            </div>
          </div>

          {/* Filter Buttons */}
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              variant={typeFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setTypeFilter("all")}
              className={typeFilter === "all" ? "" : "bg-slate-800 border-slate-700"}
            >
              All
            </Button>
            <Button
              variant={typeFilter === "trade" ? "default" : "outline"}
              size="sm"
              onClick={() => setTypeFilter("trade")}
              className={typeFilter === "trade" ? "" : "bg-slate-800 border-slate-700"}
            >
              <TrendingUp className="h-3 w-3 mr-1" />
              Trades
            </Button>
            <Button
              variant={typeFilter === "liquidity" ? "default" : "outline"}
              size="sm"
              onClick={() => setTypeFilter("liquidity")}
              className={typeFilter === "liquidity" ? "" : "bg-slate-800 border-slate-700"}
            >
              <Droplets className="h-3 w-3 mr-1" />
              Liquidity
            </Button>
            <Button
              variant={typeFilter === "order" ? "default" : "outline"}
              size="sm"
              onClick={() => setTypeFilter("order")}
              className={typeFilter === "order" ? "" : "bg-slate-800 border-slate-700"}
            >
              <BookOpen className="h-3 w-3 mr-1" />
              Orders
            </Button>

            <div className="ml-auto flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-400" />
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white"
              >
                <option value="all">All Time</option>
                <option value="24h">Last 24h</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
              </select>
            </div>
          </div>
        </div>

        {/* Activity List */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-slate-400">Loading activity...</p>
          </div>
        ) : activities.length === 0 ? (
          <Card className="bg-slate-800 border-slate-700 p-12">
            <div className="text-center">
              <History className="h-12 w-12 text-slate-400 mx-auto mb-4 opacity-50" />
              <p className="text-slate-400 mb-4">No activity found</p>
              <Button onClick={() => {
                setSearchQuery("");
                setTypeFilter("all");
                setDateFilter("all");
              }}>
                Clear Filters
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => (
              <Card key={activity.id} className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 hover:border-slate-600 transition-all">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    {/* Left Side */}
                    <div className="flex items-center gap-4 flex-1">
                      {/* Icon */}
                      <div className={`p-2 rounded-lg ${getActivityColor(activity.type)}`}>
                        {getActivityIcon(activity.type)}
                      </div>

                      {/* Details */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-white">{activity.action}</span>
                          {activity.outcome && (
                            <Badge variant="outline" className="text-xs">
                              {activity.outcome}
                            </Badge>
                          )}
                          <Badge
                            variant={activity.status === "success" ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {activity.status}
                          </Badge>
                        </div>
                        <Link
                          href={`/market/${activity.marketId}`}
                          className="text-sm text-slate-400 hover:text-blue-400 transition-colors"
                        >
                          {activity.market}
                        </Link>
                      </div>
                    </div>

                    {/* Right Side */}
                    <div className="flex items-center gap-6">
                      {/* Amount */}
                      <div className="text-right">
                        <p className="text-sm font-semibold text-white">
                          {activity.amount.toFixed(2)} SOL
                        </p>
                        {activity.price && (
                          <p className="text-xs text-slate-400">
                            @ {activity.price.toFixed(2)} SOL
                          </p>
                        )}
                      </div>

                      {/* P&L */}
                      {activity.pnl !== undefined && (
                        <div className="text-right min-w-[80px]">
                          <p className={`text-sm font-semibold ${
                            activity.pnl >= 0 ? "text-emerald-400" : "text-red-400"
                          }`}>
                            {activity.pnl >= 0 ? "+" : ""}{activity.pnl.toFixed(2)} SOL
                          </p>
                          <p className="text-xs text-slate-400">P&L</p>
                        </div>
                      )}

                      {/* Time */}
                      <div className="text-right min-w-[100px]">
                        <p className="text-xs text-slate-400">
                          {new Date(activity.timestamp).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-slate-500">
                          {new Date(activity.timestamp).toLocaleTimeString()}
                        </p>
                      </div>

                      {/* Tx Link */}
                      <a
                        href={`https://solscan.io/tx/${activity.txSignature}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-400 hover:text-blue-300"
                      >
                        {activity.txSignature}
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        {activities.length > 0 && (
          <div className="mt-6 flex items-center justify-center gap-2">
            <Button variant="outline" className="bg-slate-800 border-slate-700">
              Previous
            </Button>
            <Button className="bg-blue-600">1</Button>
            <Button variant="outline" className="bg-slate-800 border-slate-700">
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

