import { io, Socket } from 'socket.io-client';
import type { ArenaUpdate, BetPlaced, ArenaResolved, PriceUpdate } from './server';

// ========== CLIENT WRAPPER ==========

export class WebSocketClient {
  private socket: Socket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  
  constructor(url?: string) {
    this.url = url || process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3002';
  }
  
  /**
   * Connect to WebSocket server
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve();
        return;
      }
      
      this.socket = io(this.url, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });
      
      this.socket.on('connect', () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        resolve();
      });
      
      this.socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        this.reconnectAttempts++;
        
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          reject(new Error('Max reconnection attempts reached'));
        }
      });
      
      this.socket.on('disconnect', (reason) => {
        console.log('WebSocket disconnected:', reason);
      });
      
      this.socket.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    });
  }
  
  /**
   * Disconnect from server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
  
  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }
  
  // ========== SUBSCRIPTION METHODS ==========
  
  /**
   * Subscribe to arena updates
   */
  subscribeToArena(arenaId: string, callback: (update: ArenaUpdate) => void) {
    if (!this.socket) throw new Error('Socket not connected');
    
    this.socket.emit('subscribe:arena', arenaId);
    this.socket.on('arena:update', callback);
    
    return () => {
      this.socket?.emit('unsubscribe:arena', arenaId);
      this.socket?.off('arena:update', callback);
    };
  }
  
  /**
   * Subscribe to bet events
   */
  subscribeToArenaBets(arenaId: string, callback: (bet: BetPlaced) => void) {
    if (!this.socket) throw new Error('Socket not connected');
    
    this.socket.on('arena:bet', callback);
    
    return () => {
      this.socket?.off('arena:bet', callback);
    };
  }
  
  /**
   * Subscribe to arena resolution
   */
  subscribeToArenaResolution(arenaId: string, callback: (resolution: ArenaResolved) => void) {
    if (!this.socket) throw new Error('Socket not connected');
    
    this.socket.on('arena:resolved', callback);
    
    return () => {
      this.socket?.off('arena:resolved', callback);
    };
  }
  
  /**
   * Subscribe to leaderboard updates
   */
  subscribeToLeaderboard(callback: (leaderboard: any[]) => void) {
    if (!this.socket) throw new Error('Socket not connected');
    
    this.socket.emit('subscribe:leaderboard');
    this.socket.on('leaderboard:update', callback);
    
    return () => {
      this.socket?.off('leaderboard:update', callback);
    };
  }
  
  /**
   * Subscribe to price updates
   */
  subscribeToPrices(symbols: string[], callback: (price: PriceUpdate) => void) {
    if (!this.socket) throw new Error('Socket not connected');
    
    this.socket.emit('subscribe:prices', symbols);
    this.socket.on('price:update', callback);
    
    return () => {
      this.socket?.off('price:update', callback);
    };
  }
  
  /**
   * Subscribe to user notifications
   */
  subscribeToUserNotifications(wallet: string, callback: (notification: any) => void) {
    if (!this.socket) throw new Error('Socket not connected');
    
    this.socket.emit('subscribe:user', wallet);
    this.socket.on('user:notification', callback);
    
    return () => {
      this.socket?.off('user:notification', callback);
    };
  }
  
  /**
   * Subscribe to platform announcements
   */
  subscribeToPlatformAnnouncements(callback: (announcement: any) => void) {
    if (!this.socket) throw new Error('Socket not connected');
    
    this.socket.on('platform:announcement', callback);
    
    return () => {
      this.socket?.off('platform:announcement', callback);
    };
  }
}

// ========== SINGLETON INSTANCE ==========

let wsClient: WebSocketClient | null = null;

export function getWebSocketClient(url?: string): WebSocketClient {
  if (!wsClient) {
    wsClient = new WebSocketClient(url);
  }
  return wsClient;
}

export default WebSocketClient;

