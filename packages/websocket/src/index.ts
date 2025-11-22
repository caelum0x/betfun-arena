import { Server } from "socket.io";
import { createServer } from "http";
import Redis from "ioredis";
import { createClient } from "@supabase/supabase-js";

const PORT = process.env.WS_PORT || 3002;

// Initialize HTTP server for Socket.io
const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST"],
  },
});

// Initialize Redis for pub/sub (optional)
let redis: Redis | null = null;
let redisSub: Redis | null = null;
try {
  redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
  redisSub = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
  redis.on("error", () => {
    console.warn("⚠️  Redis connection error. Pub/sub disabled.");
    redis = null;
    redisSub = null;
  });
} catch (error) {
  console.warn("⚠️  Redis not available. Pub/sub disabled.");
}

// Initialize Supabase (optional)
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

// Track active connections
const activeConnections = new Map<string, Set<string>>();

// ============================================
// REDIS PUB/SUB LISTENERS
// ============================================

// Subscribe to Redis channels (if available)
if (redisSub) {
  redisSub.subscribe(
    "price:update",
    "trade:new",
    "order:update",
    "market:update",
    "notification:new",
    "achievement:unlocked",
    "share:created",
    "pool:update",
    "swap:executed",
    "order:matched"
  );

  redisSub.on("message", (channel, message) => {
    try {
      const data = JSON.parse(message);

      switch (channel) {
        case "price:update":
          handlePriceUpdate(data);
          break;
        case "trade:new":
          handleNewTrade(data);
          break;
        case "order:update":
          handleOrderUpdate(data);
          break;
        case "market:update":
          handleMarketUpdate(data);
          break;
        case "notification:new":
          handleNewNotification(data);
          break;
        case "achievement:unlocked":
          handleAchievementUnlocked(data);
          break;
        case "share:created":
          handleShareCreated(data);
          break;
        case "pool:update":
          handlePoolUpdate(data);
          break;
        case "swap:executed":
          handleSwapExecuted(data);
          break;
        case "order:matched":
          handleOrderMatched(data);
          break;
      }
    } catch (error) {
      console.error("Error processing Redis message:", error);
    }
  });
}

// ============================================
// EVENT HANDLERS
// ============================================

function handlePriceUpdate(data: any) {
  const { marketId, outcomeIndex, price, volume, timestamp } = data;
  const room = `market:${marketId}`;

  io.to(room).emit("price:update", {
    marketId,
    outcomeIndex,
    price,
    volume,
    timestamp,
  });

  // Also emit to outcome-specific room
  io.to(`${room}:outcome:${outcomeIndex}`).emit("price:update", {
    price,
    volume,
    timestamp,
  });
}

function handleNewTrade(data: any) {
  const { marketId, trade } = data;
  const room = `market:${marketId}`;

  io.to(room).emit("trade:new", trade);

  // Emit to user-specific room
  if (trade.user) {
    io.to(`user:${trade.user}`).emit("trade:executed", trade);
  }
}

function handleOrderUpdate(data: any) {
  const { marketId, order } = data;
  const room = `market:${marketId}`;

  io.to(room).emit("order:update", order);

  // Emit to user-specific room
  if (order.user) {
    io.to(`user:${order.user}`).emit("order:update", order);
  }
}

function handleMarketUpdate(data: any) {
  const { marketId, update } = data;
  const room = `market:${marketId}`;

  io.to(room).emit("market:update", update);
}

function handleNewNotification(data: any) {
  const { userAddress, notification } = data;

  io.to(`user:${userAddress}`).emit("notification:new", notification);
}

function handleAchievementUnlocked(data: any) {
  const { userAddress, achievement } = data;

  io.to(`user:${userAddress}`).emit("achievement:unlocked", achievement);
}

function handleShareCreated(data: any) {
  const { arena, outcomeIndex } = data;
  const room = `market:${arena}`;

  io.to(room).emit("share:created", {
    arena,
    outcomeIndex,
    timestamp: Date.now(),
  });
}

function handlePoolUpdate(data: any) {
  const { pool, arena, update } = data;
  const room = `market:${arena}`;

  io.to(room).emit("pool:update", {
    pool,
    update,
    timestamp: Date.now(),
  });
}

function handleSwapExecuted(data: any) {
  const { pool, user, amountIn, amountOut } = data;

  // Find arena from pool (would need pool->arena mapping)
  // For now, broadcast to all pool subscribers
  io.to(`pool:${pool}`).emit("swap:executed", {
    pool,
    user,
    amountIn,
    amountOut,
    timestamp: Date.now(),
  });
}

function handleOrderMatched(data: any) {
  const { marketId, makerOrderId, takerOrderId, fillAmount, fillPrice } = data;
  const room = `market:${marketId}`;

  io.to(room).emit("order:matched", {
    makerOrderId,
    takerOrderId,
    fillAmount,
    fillPrice,
    timestamp: Date.now(),
  });

  // Also emit to order book room
  io.to(`orderbook:${marketId}`).emit("order:matched", {
    makerOrderId,
    takerOrderId,
    fillAmount,
    fillPrice,
  });
}

// ============================================
// SOCKET.IO CONNECTION HANDLING
// ============================================

io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Subscribe to market updates
  socket.on("subscribe:market", async (data: { marketId: string }) => {
    const { marketId } = data;
    const room = `market:${marketId}`;

    socket.join(room);
    console.log(`Socket ${socket.id} subscribed to ${room}`);

    // Track subscription
    if (!activeConnections.has(room)) {
      activeConnections.set(room, new Set());
    }
    activeConnections.get(room)?.add(socket.id);

    // Send initial market data
    try {
      const { data: market, error } = await supabase
        .from("markets")
        .select("*")
        .eq("id", marketId)
        .single();

      if (!error && market) {
        socket.emit("market:initial", market);
      }
    } catch (error) {
      console.error("Error fetching initial market data:", error);
    }

    socket.emit("subscribed", { room, timestamp: Date.now() });
  });

  // Subscribe to specific outcome
  socket.on("subscribe:outcome", (data: { marketId: string; outcomeIndex: number }) => {
    const { marketId, outcomeIndex } = data;
    const room = `market:${marketId}:outcome:${outcomeIndex}`;

    socket.join(room);
    console.log(`Socket ${socket.id} subscribed to ${room}`);

    socket.emit("subscribed", { room, timestamp: Date.now() });
  });

  // Subscribe to order book updates
  socket.on("subscribe:orderbook", (data: { marketId: string; outcomeIndex?: number }) => {
    const { marketId, outcomeIndex } = data;
    const room = outcomeIndex !== undefined
      ? `orderbook:${marketId}:${outcomeIndex}`
      : `orderbook:${marketId}`;

    socket.join(room);
    console.log(`Socket ${socket.id} subscribed to ${room}`);

    socket.emit("subscribed", { room, timestamp: Date.now() });
  });

  // Subscribe to user-specific updates
  socket.on("subscribe:user", async (data: { address: string }) => {
    const { address } = data;
    const room = `user:${address}`;

    socket.join(room);
    console.log(`Socket ${socket.id} subscribed to ${room}`);

    // Send initial user data
    try {
      const { data: notifications, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_address", address)
        .eq("read", false)
        .order("timestamp", { ascending: false })
        .limit(10);

      if (!error && notifications) {
        socket.emit("notifications:initial", notifications);
      }
    } catch (error) {
      console.error("Error fetching initial notifications:", error);
    }

    socket.emit("subscribed", { room, timestamp: Date.now() });
  });

  // Subscribe to platform-wide updates
  socket.on("subscribe:platform", () => {
    const room = "platform";

    socket.join(room);
    console.log(`Socket ${socket.id} subscribed to ${room}`);

    socket.emit("subscribed", { room, timestamp: Date.now() });
  });

  // Unsubscribe from a room
  socket.on("unsubscribe", (data: { room: string }) => {
    const { room } = data;

    socket.leave(room);
    console.log(`Socket ${socket.id} unsubscribed from ${room}`);

    // Remove from tracking
    activeConnections.get(room)?.delete(socket.id);

    socket.emit("unsubscribed", { room, timestamp: Date.now() });
  });

  // Ping/Pong for connection health
  socket.on("ping", () => {
    socket.emit("pong", { timestamp: Date.now() });
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);

    // Clean up tracking
    activeConnections.forEach((sockets, room) => {
      sockets.delete(socket.id);
      if (sockets.size === 0) {
        activeConnections.delete(room);
      }
    });
  });
});

// ============================================
// HELPER FUNCTIONS
// ============================================

// Broadcast to all clients in a room
export function broadcastToRoom(room: string, event: string, data: any) {
  io.to(room).emit(event, data);
}

// Broadcast to specific user
export function broadcastToUser(userAddress: string, event: string, data: any) {
  io.to(`user:${userAddress}`).emit(event, data);
}

// Get active connections count
export function getActiveConnectionsCount(): number {
  return io.engine.clientsCount;
}

// Get room subscribers count
export function getRoomSubscribersCount(room: string): number {
  return activeConnections.get(room)?.size || 0;
}

// ============================================
// PERIODIC TASKS
// ============================================

// Send platform stats every 30 seconds
setInterval(async () => {
  try {
    if (!supabase) {
      return; // Supabase not configured, skip
    }
    
    const { data: metrics, error } = await supabase
      .from("platform_metrics")
      .select("*")
      .order("timestamp", { ascending: false })
      .limit(1)
      .single();

    if (!error && metrics) {
      io.to("platform").emit("platform:stats", metrics);
    }
  } catch (error) {
    console.error("Error fetching platform stats:", error);
  }
}, 30000);

// Clean up stale connections every 5 minutes
setInterval(() => {
  const staleThreshold = Date.now() - 5 * 60 * 1000;

  activeConnections.forEach((sockets, room) => {
    sockets.forEach((socketId) => {
      const socket = io.sockets.sockets.get(socketId);
      if (!socket) {
        sockets.delete(socketId);
      }
    });

    if (sockets.size === 0) {
      activeConnections.delete(room);
    }
  });

  console.log(`Active connections: ${getActiveConnectionsCount()}`);
  console.log(`Active rooms: ${activeConnections.size}`);
}, 5 * 60 * 1000);

// ============================================
// START SERVER
// ============================================

httpServer.listen(PORT, () => {
  console.log(`🔌 BetFun Arena WebSocket server running on port ${PORT}`);
  console.log(`📊 Connections: 0`);
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

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, closing server...");
  httpServer.close(() => {
    console.log("Server closed");
    if (redis) redis.quit();
    if (redisSub) redisSub.quit();
    process.exit(0);
  });
});

export { io, redis };

