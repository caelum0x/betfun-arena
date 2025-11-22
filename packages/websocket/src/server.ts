import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';
import express from 'express';
import cors from 'cors';

// ========== TYPES ==========

export interface ArenaUpdate {
  arenaId: string;
  pot: number;
  participantsCount: number;
  outcomeDistribution: number[];
  timestamp: number;
}

export interface BetPlaced {
  arenaId: string;
  wallet: string;
  outcome: number;
  amount: number;
  newPot: number;
  timestamp: number;
}

export interface ArenaResolved {
  arenaId: string;
  winnerOutcome: number;
  totalPot: number;
  winnersCount: number;
  timestamp: number;
}

export interface PriceUpdate {
  symbol: string;
  price: number;
  change24h: number;
  timestamp: number;
}

// ========== SERVER SETUP ==========

export class WebSocketServer {
  private io: SocketIOServer;
  private app: express.Application;
  private httpServer: ReturnType<typeof createServer>;
  
  constructor(port: number = 3002) {
    this.app = express();
    this.httpServer = createServer(this.app);
    
    // Configure Socket.IO with CORS
    this.io = new SocketIOServer(this.httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000,
    });
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupSocketHandlers();
  }
  
  private setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
  }
  
  private setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        connections: this.io.engine.clientsCount,
        uptime: process.uptime(),
      });
    });
    
    // Stats endpoint
    this.app.get('/stats', (req, res) => {
      const rooms = this.io.sockets.adapter.rooms;
      const roomStats: Record<string, number> = {};
      
      rooms.forEach((value, key) => {
        if (!key.includes('#')) { // Skip private rooms
          roomStats[key] = value.size;
        }
      });
      
      res.json({
        totalConnections: this.io.engine.clientsCount,
        rooms: roomStats,
      });
    });
  }
  
  private setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`Client connected: ${socket.id}`);
      
      // Handle arena subscription
      socket.on('subscribe:arena', (arenaId: string) => {
        socket.join(`arena:${arenaId}`);
        console.log(`Client ${socket.id} subscribed to arena: ${arenaId}`);
      });
      
      // Handle arena unsubscription
      socket.on('unsubscribe:arena', (arenaId: string) => {
        socket.leave(`arena:${arenaId}`);
        console.log(`Client ${socket.id} unsubscribed from arena: ${arenaId}`);
      });
      
      // Handle leaderboard subscription
      socket.on('subscribe:leaderboard', () => {
        socket.join('leaderboard');
        console.log(`Client ${socket.id} subscribed to leaderboard`);
      });
      
      // Handle price feed subscription
      socket.on('subscribe:prices', (symbols: string[]) => {
        symbols.forEach(symbol => {
          socket.join(`price:${symbol}`);
        });
        console.log(`Client ${socket.id} subscribed to prices: ${symbols.join(', ')}`);
      });
      
      // Handle user activity subscription
      socket.on('subscribe:user', (wallet: string) => {
        socket.join(`user:${wallet}`);
        console.log(`Client ${socket.id} subscribed to user: ${wallet}`);
      });
      
      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
      });
      
      // Error handling
      socket.on('error', (error) => {
        console.error(`Socket error for ${socket.id}:`, error);
      });
    });
  }
  
  // ========== BROADCAST METHODS ==========
  
  /**
   * Broadcast arena update to all subscribers
   */
  public broadcastArenaUpdate(update: ArenaUpdate) {
    this.io.to(`arena:${update.arenaId}`).emit('arena:update', update);
  }
  
  /**
   * Broadcast bet placed event
   */
  public broadcastBetPlaced(bet: BetPlaced) {
    this.io.to(`arena:${bet.arenaId}`).emit('arena:bet', bet);
  }
  
  /**
   * Broadcast arena resolution
   */
  public broadcastArenaResolved(resolution: ArenaResolved) {
    this.io.to(`arena:${resolution.arenaId}`).emit('arena:resolved', resolution);
  }
  
  /**
   * Broadcast price update
   */
  public broadcastPriceUpdate(price: PriceUpdate) {
    this.io.to(`price:${price.symbol}`).emit('price:update', price);
  }
  
  /**
   * Broadcast leaderboard update
   */
  public broadcastLeaderboardUpdate(leaderboard: any[]) {
    this.io.to('leaderboard').emit('leaderboard:update', leaderboard);
  }
  
  /**
   * Broadcast user notification
   */
  public broadcastUserNotification(wallet: string, notification: any) {
    this.io.to(`user:${wallet}`).emit('user:notification', notification);
  }
  
  /**
   * Broadcast platform-wide announcement
   */
  public broadcastAnnouncement(message: string, type: 'info' | 'warning' | 'success') {
    this.io.emit('platform:announcement', { message, type, timestamp: Date.now() });
  }
  
  // ========== SERVER CONTROL ==========
  
  public start(port?: number) {
    const listenPort = port || 3002;
    this.httpServer.listen(listenPort, () => {
      console.log(`WebSocket server running on port ${listenPort}`);
    });
  }
  
  public stop() {
    this.io.close();
    this.httpServer.close();
  }
  
  public getIO(): SocketIOServer {
    return this.io;
  }
}

// ========== SINGLETON INSTANCE ==========

let wsServer: WebSocketServer | null = null;

export function initWebSocketServer(port?: number): WebSocketServer {
  if (!wsServer) {
    wsServer = new WebSocketServer(port);
  }
  return wsServer;
}

export function getWebSocketServer(): WebSocketServer {
  if (!wsServer) {
    throw new Error('WebSocket server not initialized');
  }
  return wsServer;
}

// ========== AUTO-START (if run directly) ==========

if (require.main === module) {
  const port = parseInt(process.env.WS_PORT || '3002');
  const server = initWebSocketServer(port);
  server.start();
}

export default WebSocketServer;

