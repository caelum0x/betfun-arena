// API client for BetFun Arena backend

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
  }

  // Markets
  async getMarkets(params?: {
    category?: string;
    status?: string;
    sort?: string;
    page?: number;
    limit?: number;
    search?: string;
  }) {
    const queryParams = new URLSearchParams(params as any).toString();
    return this.request(`/api/markets?${queryParams}`);
  }

  async getTrendingMarkets() {
    return this.request("/api/markets/trending");
  }

  async getFeaturedMarkets() {
    return this.request("/api/markets/featured");
  }

  async getMarket(id: string) {
    return this.request(`/api/market/${id}`);
  }

  async getMarketTrades(id: string, limit = 50) {
    return this.request(`/api/market/${id}/trades?limit=${limit}`);
  }

  async getMarketOrderBook(id: string, outcomeIndex?: number) {
    const query = outcomeIndex !== undefined ? `?outcome_index=${outcomeIndex}` : "";
    return this.request(`/api/market/${id}/orderbook${query}`);
  }

  async getMarketChartData(id: string, timeframe = "24h", outcomeIndex = 0) {
    return this.request(
      `/api/market/${id}/chart-data?timeframe=${timeframe}&outcome_index=${outcomeIndex}`
    );
  }

  async getMarketComments(id: string, limit = 50) {
    return this.request(`/api/market/${id}/comments?limit=${limit}`);
  }

  async postComment(id: string, user: string, content: string) {
    return this.request(`/api/market/${id}/comments`, {
      method: "POST",
      body: JSON.stringify({ user, content }),
    });
  }

  // Users
  async getUserProfile(address: string) {
    return this.request(`/api/user/${address}/profile`);
  }

  async getUserPositions(address: string) {
    return this.request(`/api/user/${address}/positions`);
  }

  async getUserActivity(address: string, type?: string, limit = 50) {
    const query = type ? `?type=${type}&limit=${limit}` : `?limit=${limit}`;
    return this.request(`/api/user/${address}/activity${query}`);
  }

  async getUserStats(address: string) {
    return this.request(`/api/user/${address}/stats`);
  }

  async getUserAchievements(address: string) {
    return this.request(`/api/user/${address}/achievements`);
  }

  async updateUserSettings(address: string, settings: any) {
    return this.request("/api/user/settings", {
      method: "PUT",
      body: JSON.stringify({ address, settings }),
    });
  }

  // Notifications
  async getNotifications(address: string, filter = "all", limit = 50) {
    return this.request(
      `/api/notifications?address=${address}&filter=${filter}&limit=${limit}`
    );
  }

  async markNotificationAsRead(id: string) {
    return this.request(`/api/notifications/${id}/read`, {
      method: "POST",
    });
  }

  // Analytics
  async getPlatformAnalytics(timeframe = "7d") {
    return this.request(`/api/analytics/platform?timeframe=${timeframe}`);
  }

  async getLeaderboard(type = "pnl", period = "all", limit = 100) {
    return this.request(
      `/api/leaderboard?type=${type}&period=${period}&limit=${limit}`
    );
  }
}

export const api = new ApiClient(API_URL);

