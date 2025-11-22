"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Bell, 
  TrendingUp, 
  Trophy, 
  DollarSign, 
  AlertCircle,
  CheckCheck,
  Trash2,
  Settings
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

interface Notification {
  id: string;
  type: "trade" | "market" | "achievement" | "system" | "social";
  title: string;
  message: string;
  link?: string;
  read: boolean;
  timestamp: number;
  icon: string;
  priority: "low" | "medium" | "high";
}

export default function NotificationsPage() {
  const { publicKey } = useWallet();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    if (!publicKey) {
      setLoading(false);
      return;
    }

    loadNotifications();
  }, [publicKey, filter]);

  const loadNotifications = async () => {
    setLoading(true);

    // Mock data - would fetch from API
    const mockNotifications: Notification[] = [
      {
        id: "1",
        type: "trade",
        title: "Order Filled",
        message: "Your limit order for 'Will Bitcoin reach $100k?' has been filled at 0.55 SOL",
        link: "/market/1",
        read: false,
        timestamp: Date.now() - 5 * 60 * 1000,
        icon: "📈",
        priority: "high",
      },
      {
        id: "2",
        type: "achievement",
        title: "Achievement Unlocked!",
        message: "You've earned the 'Whale' achievement for trading over 1000 SOL!",
        link: "/profile/" + publicKey?.toBase58(),
        read: false,
        timestamp: Date.now() - 30 * 60 * 1000,
        icon: "🏆",
        priority: "medium",
      },
      {
        id: "3",
        type: "market",
        title: "Market Resolved",
        message: "'Will SOL reach $200?' has been resolved. You won 125 SOL!",
        link: "/market/4",
        read: true,
        timestamp: Date.now() - 2 * 60 * 60 * 1000,
        icon: "✅",
        priority: "high",
      },
      {
        id: "4",
        type: "social",
        title: "New Follower",
        message: "CryptoWhale started following you",
        link: "/profile/abc123",
        read: true,
        timestamp: Date.now() - 5 * 60 * 60 * 1000,
        icon: "👤",
        priority: "low",
      },
      {
        id: "5",
        type: "market",
        title: "Market Ending Soon",
        message: "'Will ETH reach $5k?' ends in 24 hours. Place your final bets!",
        link: "/market/3",
        read: false,
        timestamp: Date.now() - 24 * 60 * 60 * 1000,
        icon: "⏰",
        priority: "medium",
      },
      {
        id: "6",
        type: "system",
        title: "New Feature Available",
        message: "Advanced order types are now live! Try limit orders and stop-loss.",
        link: "/help/advanced-orders",
        read: true,
        timestamp: Date.now() - 3 * 24 * 60 * 60 * 1000,
        icon: "🎉",
        priority: "low",
      },
    ];

    // Apply filter
    let filtered = mockNotifications;
    if (filter !== "all") {
      if (filter === "unread") {
        filtered = filtered.filter(n => !n.read);
      } else {
        filtered = filtered.filter(n => n.type === filter);
      }
    }

    setNotifications(filtered);
    setLoading(false);
  };

  const markAsRead = (id: string) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "trade":
        return "border-l-blue-500";
      case "achievement":
        return "border-l-yellow-500";
      case "market":
        return "border-l-green-500";
      case "social":
        return "border-l-purple-500";
      case "system":
        return "border-l-slate-500";
      default:
        return "border-l-slate-500";
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/50">High</Badge>;
      case "medium":
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">Medium</Badge>;
      case "low":
        return <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/50">Low</Badge>;
      default:
        return null;
    }
  };

  if (!publicKey) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 p-8">
          <div className="text-center">
            <Bell className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Connect Your Wallet</h2>
            <p className="text-slate-400">Connect your wallet to view notifications</p>
          </div>
        </Card>
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                Notifications
                {unreadCount > 0 && (
                  <Badge className="ml-3 bg-red-500/20 text-red-400 border-red-500/50">
                    {unreadCount} new
                  </Badge>
                )}
              </h1>
              <p className="text-slate-400">Stay updated with your trading activity</p>
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button
                  onClick={markAllAsRead}
                  variant="outline"
                  className="bg-slate-800 border-slate-700"
                >
                  <CheckCheck className="h-4 w-4 mr-2" />
                  Mark all as read
                </Button>
              )}
              <Link href="/settings#notifications">
                <Button variant="outline" className="bg-slate-800 border-slate-700">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6">
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant={filter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("all")}
              className={filter === "all" ? "" : "bg-slate-800 border-slate-700"}
            >
              All
            </Button>
            <Button
              variant={filter === "unread" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("unread")}
              className={filter === "unread" ? "" : "bg-slate-800 border-slate-700"}
            >
              <Bell className="h-3 w-3 mr-1" />
              Unread ({unreadCount})
            </Button>
            <Button
              variant={filter === "trade" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("trade")}
              className={filter === "trade" ? "" : "bg-slate-800 border-slate-700"}
            >
              <TrendingUp className="h-3 w-3 mr-1" />
              Trades
            </Button>
            <Button
              variant={filter === "market" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("market")}
              className={filter === "market" ? "" : "bg-slate-800 border-slate-700"}
            >
              <DollarSign className="h-3 w-3 mr-1" />
              Markets
            </Button>
            <Button
              variant={filter === "achievement" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("achievement")}
              className={filter === "achievement" ? "" : "bg-slate-800 border-slate-700"}
            >
              <Trophy className="h-3 w-3 mr-1" />
              Achievements
            </Button>
          </div>
        </div>

        {/* Notifications List */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-slate-400">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <Card className="bg-slate-800 border-slate-700 p-12">
            <div className="text-center">
              <Bell className="h-12 w-12 text-slate-400 mx-auto mb-4 opacity-50" />
              <p className="text-slate-400 mb-4">No notifications found</p>
              <Button onClick={() => setFilter("all")}>
                Show All
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
              >
                <Card className={`bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 border-l-4 ${getNotificationColor(notification.type)} ${
                  !notification.read ? "bg-opacity-100" : "bg-opacity-50"
                } hover:border-slate-600 transition-all`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      {/* Left Side */}
                      <div className="flex items-start gap-4 flex-1">
                        {/* Icon */}
                        <div className="text-3xl">{notification.icon}</div>

                        {/* Content */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className={`font-semibold ${
                              !notification.read ? "text-white" : "text-slate-300"
                            }`}>
                              {notification.title}
                            </h3>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            )}
                            {getPriorityBadge(notification.priority)}
                          </div>
                          <p className="text-sm text-slate-400 mb-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-slate-500">
                              {Math.floor((Date.now() - notification.timestamp) / (60 * 1000)) < 60
                                ? `${Math.floor((Date.now() - notification.timestamp) / (60 * 1000))}m ago`
                                : Math.floor((Date.now() - notification.timestamp) / (60 * 60 * 1000)) < 24
                                ? `${Math.floor((Date.now() - notification.timestamp) / (60 * 60 * 1000))}h ago`
                                : `${Math.floor((Date.now() - notification.timestamp) / (24 * 60 * 60 * 1000))}d ago`
                              }
                            </span>
                            {notification.link && (
                              <Link
                                href={notification.link}
                                className="text-xs text-blue-400 hover:text-blue-300"
                              >
                                View →
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAsRead(notification.id)}
                            className="text-slate-400 hover:text-white"
                          >
                            <CheckCheck className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteNotification(notification.id)}
                          className="text-slate-400 hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Load More */}
        {notifications.length > 0 && (
          <div className="mt-6 text-center">
            <Button variant="outline" className="bg-slate-800 border-slate-700">
              Load More
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

