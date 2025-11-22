import express, { Request, Response } from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";
import { PublicKey } from "@solana/web3.js";
import Redis from "ioredis";

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Supabase (optional - will fail gracefully if not configured)
let supabase: ReturnType<typeof createClient> | null = null;
try {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
  } else {
    console.warn("⚠️  Supabase not configured. Some features will be disabled.");
  }
} catch (error) {
  console.warn("⚠️  Failed to initialize Supabase:", error);
}

// Initialize Redis for caching (optional - will fail gracefully if not configured)
let redis: Redis | null = null;
try {
  redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
  redis.on("error", (err) => {
    console.warn("⚠️  Redis connection error:", err.message);
    redis = null; // Disable Redis on error
  });
} catch (error) {
  console.warn("⚠️  Redis not available. Caching disabled.");
}

// Cache middleware
const cacheMiddleware = (duration: number) => {
  return async (req: Request, res: Response, next: Function) => {
    if (!redis) {
      return next(); // Skip caching if Redis not available
    }
    const key = `cache:${req.originalUrl}`;
    try {
      const cached = await redis.get(key);
      if (cached) {
        return res.json(JSON.parse(cached));
      }
      // Store original send function
      const originalSend = res.json.bind(res);
      res.json = (body: any) => {
        if (redis) {
          redis.setex(key, duration, JSON.stringify(body)).catch(() => {});
        }
        return originalSend(body);
      };
      next();
    } catch (error) {
      next();
    }
  };
};

// ============================================
// MARKETS ENDPOINTS
// ============================================

// Get all markets with filters
app.get("/api/markets", cacheMiddleware(60), async (req: Request, res: Response) => {
  try {
    if (!supabase) {
      // Return mock data if Supabase not configured
      return res.json({
        markets: [],
        pagination: {
          page: Number(req.query.page) || 1,
          limit: Number(req.query.limit) || 20,
          total: 0,
          totalPages: 0,
        },
      });
    }

    const {
      category,
      status,
      sort = "volume",
      page = 1,
      limit = 20,
      search,
    } = req.query;

    let query = supabase.from("markets").select("*");

    // Apply filters
    if (category && category !== "all") {
      query = query.eq("category", category);
    }

    if (status === "active") {
      query = query.eq("resolved", false);
    } else if (status === "resolved") {
      query = query.eq("resolved", true);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,question.ilike.%${search}%`);
    }

    // Apply sorting
    switch (sort) {
      case "volume":
        query = query.order("volume", { ascending: false });
        break;
      case "newest":
        query = query.order("created_at", { ascending: false });
        break;
      case "ending":
        query = query.order("end_time", { ascending: true });
        break;
      case "participants":
        query = query.order("participant_count", { ascending: false });
        break;
    }

    // Pagination
    const offset = (Number(page) - 1) * Number(limit);
    query = query.range(offset, offset + Number(limit) - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    res.json({
      markets: data,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching markets:", error);
    res.status(500).json({ error: "Failed to fetch markets" });
  }
});

// Get trending markets
app.get("/api/markets/trending", cacheMiddleware(120), async (req: Request, res: Response) => {
  try {
    if (!supabase) {
      return res.json({ markets: [] });
    }

    const { data, error } = await supabase
      .from("markets")
      .select("*")
      .eq("resolved", false)
      .order("volume_24h", { ascending: false })
      .limit(10);

    if (error) throw error;

    res.json({ markets: data });
  } catch (error) {
    console.error("Error fetching trending markets:", error);
    res.status(500).json({ error: "Failed to fetch trending markets" });
  }
});

// Get featured markets
app.get("/api/markets/featured", cacheMiddleware(300), async (req: Request, res: Response) => {
  try {
    if (!supabase) {
      return res.json({ markets: [] });
    }

    const { data, error } = await supabase
      .from("markets")
      .select("*")
      .eq("featured", true)
      .eq("resolved", false)
      .order("volume", { ascending: false })
      .limit(5);

    if (error) throw error;

    res.json({ markets: data });
  } catch (error) {
    console.error("Error fetching featured markets:", error);
    res.status(500).json({ error: "Failed to fetch featured markets" });
  }
});

// Get single market
app.get("/api/market/:id", cacheMiddleware(30), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("markets")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;

    res.json({ market: data });
  } catch (error) {
    console.error("Error fetching market:", error);
    res.status(500).json({ error: "Failed to fetch market" });
  }
});

// Get market trades
app.get("/api/market/:id/trades", cacheMiddleware(10), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { limit = 50 } = req.query;

    const { data, error } = await supabase
      .from("trades")
      .select("*")
      .eq("market_id", id)
      .order("timestamp", { ascending: false })
      .limit(Number(limit));

    if (error) throw error;

    res.json({ trades: data });
  } catch (error) {
    console.error("Error fetching trades:", error);
    res.status(500).json({ error: "Failed to fetch trades" });
  }
});

// Get market order book
app.get("/api/market/:id/orderbook", cacheMiddleware(5), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { outcome_index } = req.query;

    let query = supabase
      .from("limit_orders")
      .select("*")
      .eq("market_id", id)
      .eq("status", "open");

    if (outcome_index) {
      query = query.eq("outcome_index", outcome_index);
    }

    const { data, error } = await query.order("price", { ascending: false });

    if (error) throw error;

    // Group by buy/sell
    const buyOrders = data?.filter((o) => o.order_type === "buy") || [];
    const sellOrders = data?.filter((o) => o.order_type === "sell") || [];

    res.json({
      buyOrders,
      sellOrders,
    });
  } catch (error) {
    console.error("Error fetching order book:", error);
    res.status(500).json({ error: "Failed to fetch order book" });
  }
});

// Get market chart data
app.get("/api/market/:id/chart-data", cacheMiddleware(60), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { timeframe = "24h", outcome_index = 0 } = req.query;

    // Calculate time range
    const now = Date.now();
    const timeRanges: Record<string, number> = {
      "1h": 60 * 60 * 1000,
      "24h": 24 * 60 * 60 * 1000,
      "7d": 7 * 24 * 60 * 60 * 1000,
      "30d": 30 * 24 * 60 * 60 * 1000,
    };
    const startTime = now - (timeRanges[timeframe as string] || timeRanges["24h"]);

    const { data, error } = await supabase
      .from("price_history")
      .select("*")
      .eq("market_id", id)
      .eq("outcome_index", outcome_index)
      .gte("timestamp", startTime)
      .order("timestamp", { ascending: true });

    if (error) throw error;

    res.json({ data });
  } catch (error) {
    console.error("Error fetching chart data:", error);
    res.status(500).json({ error: "Failed to fetch chart data" });
  }
});

// Get market comments
app.get("/api/market/:id/comments", cacheMiddleware(30), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { limit = 50 } = req.query;

    const { data, error } = await supabase
      .from("comments")
      .select("*")
      .eq("market_id", id)
      .order("timestamp", { ascending: false })
      .limit(Number(limit));

    if (error) throw error;

    res.json({ comments: data });
  } catch (error) {
    console.error("Error fetching comments:", error);
    res.status(500).json({ error: "Failed to fetch comments" });
  }
});

// Post comment
app.post("/api/market/:id/comments", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { user, content } = req.body;

    const { data, error } = await supabase
      .from("comments")
      .insert({
        market_id: id,
        user,
        content,
        timestamp: Date.now(),
        likes: 0,
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ comment: data });
  } catch (error) {
    console.error("Error posting comment:", error);
    res.status(500).json({ error: "Failed to post comment" });
  }
});

// ============================================
// USER ENDPOINTS
// ============================================

// Get user profile
app.get("/api/user/:address/profile", cacheMiddleware(60), async (req: Request, res: Response) => {
  try {
    const { address } = req.params;

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("address", address)
      .single();

    if (error) throw error;

    res.json({ profile: data });
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// Get user positions
app.get("/api/user/:address/positions", cacheMiddleware(30), async (req: Request, res: Response) => {
  try {
    const { address } = req.params;

    const { data, error } = await supabase
      .from("positions")
      .select("*, markets(*)")
      .eq("owner", address)
      .gt("amount", 0);

    if (error) throw error;

    res.json({ positions: data });
  } catch (error) {
    console.error("Error fetching positions:", error);
    res.status(500).json({ error: "Failed to fetch positions" });
  }
});

// Get user activity
app.get("/api/user/:address/activity", cacheMiddleware(30), async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const { type, limit = 50 } = req.query;

    let query = supabase
      .from("activities")
      .select("*")
      .eq("user", address)
      .order("timestamp", { ascending: false })
      .limit(Number(limit));

    if (type && type !== "all") {
      query = query.eq("type", type);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({ activities: data });
  } catch (error) {
    console.error("Error fetching activity:", error);
    res.status(500).json({ error: "Failed to fetch activity" });
  }
});

// Get user stats
app.get("/api/user/:address/stats", cacheMiddleware(120), async (req: Request, res: Response) => {
  try {
    const { address } = req.params;

    const { data, error } = await supabase
      .from("user_stats")
      .select("*")
      .eq("address", address)
      .single();

    if (error) throw error;

    res.json({ stats: data });
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// Get user achievements
app.get("/api/user/:address/achievements", cacheMiddleware(300), async (req: Request, res: Response) => {
  try {
    const { address } = req.params;

    const { data, error } = await supabase
      .from("user_achievements")
      .select("*, achievements(*)")
      .eq("user_address", address);

    if (error) throw error;

    res.json({ achievements: data });
  } catch (error) {
    console.error("Error fetching achievements:", error);
    res.status(500).json({ error: "Failed to fetch achievements" });
  }
});

// Update user settings
app.put("/api/user/settings", async (req: Request, res: Response) => {
  try {
    const { address, settings } = req.body;

    const { data, error } = await supabase
      .from("users")
      .update({ settings })
      .eq("address", address)
      .select()
      .single();

    if (error) throw error;

    res.json({ user: data });
  } catch (error) {
    console.error("Error updating settings:", error);
    res.status(500).json({ error: "Failed to update settings" });
  }
});

// ============================================
// NOTIFICATIONS ENDPOINTS
// ============================================

// Get user notifications
app.get("/api/notifications", async (req: Request, res: Response) => {
  try {
    const { address, filter = "all", limit = 50 } = req.query;

    let query = supabase
      .from("notifications")
      .select("*")
      .eq("user_address", address)
      .order("timestamp", { ascending: false })
      .limit(Number(limit));

    if (filter === "unread") {
      query = query.eq("read", false);
    } else if (filter !== "all") {
      query = query.eq("type", filter);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({ notifications: data });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

// Mark notification as read
app.post("/api/notifications/:id/read", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    res.json({ notification: data });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({ error: "Failed to mark notification as read" });
  }
});

// ============================================
// ANALYTICS ENDPOINTS
// ============================================

// Get platform analytics
app.get("/api/analytics/platform", cacheMiddleware(300), async (req: Request, res: Response) => {
  try {
    const { timeframe = "7d" } = req.query;

    const { data, error } = await supabase
      .from("platform_metrics")
      .select("*")
      .order("timestamp", { ascending: false })
      .limit(1)
      .single();

    if (error) throw error;

    res.json({ metrics: data });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

// Get leaderboard
app.get("/api/leaderboard", cacheMiddleware(300), async (req: Request, res: Response) => {
  try {
    const { type = "pnl", period = "all", limit = 100 } = req.query;

    let orderColumn = "total_pnl";
    if (type === "volume") orderColumn = "total_volume";
    if (type === "winrate") orderColumn = "win_rate";

    const { data, error } = await supabase
      .from("user_stats")
      .select("*")
      .order(orderColumn, { ascending: false })
      .limit(Number(limit));

    if (error) throw error;

    res.json({ leaderboard: data });
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

// ============================================
// HEALTH CHECK
// ============================================

app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: Date.now() });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 BetFun Arena API running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
}).on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(`❌ Port ${PORT} is already in use. Please kill the process using it or use a different port.`);
    console.error(`💡 Run: lsof -ti :${PORT} | xargs kill -9`);
    process.exit(1);
  } else {
    console.error("❌ Server error:", err);
    process.exit(1);
  }
});

export default app;

