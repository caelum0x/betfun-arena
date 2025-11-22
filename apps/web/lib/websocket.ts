// WebSocket client for real-time updates

import { io, Socket } from "socket.io-client";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:3002";

class WebSocketClient {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect() {
    if (this.socket?.connected) return;

    this.socket = io(WS_URL, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts,
    });

    this.socket.on("connect", () => {
      console.log("✅ WebSocket connected");
      this.reconnectAttempts = 0;
    });

    this.socket.on("disconnect", () => {
      console.log("❌ WebSocket disconnected");
    });

    this.socket.on("reconnect_attempt", () => {
      this.reconnectAttempts++;
      console.log(`🔄 Reconnection attempt ${this.reconnectAttempts}`);
    });

    this.socket.on("reconnect_failed", () => {
      console.error("❌ WebSocket reconnection failed");
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Subscribe to market updates
  subscribeToMarket(marketId: string, callback: (data: any) => void) {
    if (!this.socket) this.connect();

    this.socket?.emit("subscribe:market", { marketId });

    this.socket?.on("market:initial", callback);
    this.socket?.on("market:update", callback);
    this.socket?.on("price:update", callback);
    this.socket?.on("trade:new", callback);
  }

  // Subscribe to outcome updates
  subscribeToOutcome(
    marketId: string,
    outcomeIndex: number,
    callback: (data: any) => void
  ) {
    if (!this.socket) this.connect();

    this.socket?.emit("subscribe:outcome", { marketId, outcomeIndex });
    this.socket?.on("price:update", callback);
  }

  // Subscribe to order book updates
  subscribeToOrderBook(
    marketId: string,
    outcomeIndex: number | undefined,
    callback: (data: any) => void
  ) {
    if (!this.socket) this.connect();

    this.socket?.emit("subscribe:orderbook", { marketId, outcomeIndex });
    this.socket?.on("order:update", callback);
  }

  // Subscribe to user updates
  subscribeToUser(address: string, callbacks: {
    onTrade?: (trade: any) => void;
    onOrder?: (order: any) => void;
    onNotification?: (notification: any) => void;
    onAchievement?: (achievement: any) => void;
  }) {
    if (!this.socket) this.connect();

    this.socket?.emit("subscribe:user", { address });

    if (callbacks.onTrade) {
      this.socket?.on("trade:executed", callbacks.onTrade);
    }
    if (callbacks.onOrder) {
      this.socket?.on("order:update", callbacks.onOrder);
    }
    if (callbacks.onNotification) {
      this.socket?.on("notification:new", callbacks.onNotification);
    }
    if (callbacks.onAchievement) {
      this.socket?.on("achievement:unlocked", callbacks.onAchievement);
    }
  }

  // Subscribe to platform updates
  subscribeToPlatform(callback: (stats: any) => void) {
    if (!this.socket) this.connect();

    this.socket?.emit("subscribe:platform");
    this.socket?.on("platform:stats", callback);
  }

  // Unsubscribe from a room
  unsubscribe(room: string) {
    this.socket?.emit("unsubscribe", { room });
  }

  // Ping/Pong for connection health
  ping(callback: (data: any) => void) {
    this.socket?.emit("ping");
    this.socket?.once("pong", callback);
  }

  // Remove all listeners for an event
  off(event: string) {
    this.socket?.off(event);
  }

  // Check if connected
  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const ws = new WebSocketClient();

// Auto-connect on client side
if (typeof window !== "undefined") {
  ws.connect();
}

