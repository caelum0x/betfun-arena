import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  startOfDay, 
  startOfWeek, 
  startOfMonth, 
  endOfDay, 
  subDays, 
  subMonths 
} from 'date-fns';

// ========== BUSINESS INTELLIGENCE PIPELINE ==========

export interface MetricSnapshot {
  timestamp: Date;
  metric: string;
  value: number;
  metadata?: Record<string, any>;
}

export interface UserCohort {
  cohortDate: Date; // signup date
  cohortSize: number;
  retention: {
    day1: number;
    day7: number;
    day30: number;
    day90: number;
  };
  ltv: number; // Lifetime value
  avgSessionsPerUser: number;
}

export interface MarketMetrics {
  totalVolume: number;
  activeArenas: number;
  avgArenaSize: number;
  medianArenaSize: number;
  totalParticipants: number;
  uniqueParticipants: number;
  conversionRate: number; // visitors to participants
  avgBetSize: number;
}

export interface PerformanceMetrics {
  apiResponseTime: {
    p50: number;
    p95: number;
    p99: number;
  };
  cacheHitRate: number;
  databaseQueryTime: {
    p50: number;
    p95: number;
    p99: number;
  };
  errorRate: number;
  uptimePercentage: number;
}

// ========== BI PIPELINE CLASS ==========

export class BIPipeline {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  // ========== COHORT ANALYSIS ==========

  /**
   * Calculate user cohort retention
   */
  async calculateCohortRetention(cohortDate: Date): Promise<UserCohort> {
    const cohortStart = startOfDay(cohortDate);
    const cohortEnd = endOfDay(cohortDate);

    // Get users who signed up in this cohort
    const { data: cohortUsers, error } = await this.supabase
      .from('users')
      .select('wallet, created_at')
      .gte('created_at', cohortStart.toISOString())
      .lte('created_at', cohortEnd.toISOString());

    if (error || !cohortUsers) {
      throw new Error(`Failed to fetch cohort users: ${error?.message}`);
    }

    const cohortSize = cohortUsers.length;
    const wallets = cohortUsers.map(u => u.wallet);

    // Calculate retention for different periods
    const day1Active = await this.getActiveUsersInPeriod(
      wallets,
      cohortStart,
      new Date(cohortStart.getTime() + 24 * 60 * 60 * 1000)
    );

    const day7Active = await this.getActiveUsersInPeriod(
      wallets,
      cohortStart,
      new Date(cohortStart.getTime() + 7 * 24 * 60 * 60 * 1000)
    );

    const day30Active = await this.getActiveUsersInPeriod(
      wallets,
      cohortStart,
      new Date(cohortStart.getTime() + 30 * 24 * 60 * 60 * 1000)
    );

    const day90Active = await this.getActiveUsersInPeriod(
      wallets,
      cohortStart,
      new Date(cohortStart.getTime() + 90 * 24 * 60 * 60 * 1000)
    );

    // Calculate LTV (average revenue per user in cohort)
    const ltv = await this.calculateCohortLTV(wallets);

    // Calculate average sessions per user
    const avgSessionsPerUser = await this.calculateAvgSessions(wallets);

    return {
      cohortDate,
      cohortSize,
      retention: {
        day1: day1Active / cohortSize,
        day7: day7Active / cohortSize,
        day30: day30Active / cohortSize,
        day90: day90Active / cohortSize,
      },
      ltv,
      avgSessionsPerUser,
    };
  }

  private async getActiveUsersInPeriod(
    wallets: string[],
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    const { data, error } = await this.supabase
      .from('participants')
      .select('wallet')
      .in('wallet', wallets)
      .gte('joined_at', startDate.toISOString())
      .lte('joined_at', endDate.toISOString());

    if (error) {
      console.error('Error fetching active users:', error);
      return 0;
    }

    return new Set(data?.map(p => p.wallet) || []).size;
  }

  private async calculateCohortLTV(wallets: string[]): Promise<number> {
    const { data, error } = await this.supabase
      .from('participants')
      .select('amount')
      .in('wallet', wallets);

    if (error || !data) return 0;

    const totalVolume = data.reduce((sum, p) => sum + (p.amount || 0), 0);
    return totalVolume / wallets.length;
  }

  private async calculateAvgSessions(wallets: string[]): Promise<number> {
    // Simplified: count number of bets as proxy for sessions
    const { data, error } = await this.supabase
      .from('participants')
      .select('wallet')
      .in('wallet', wallets);

    if (error || !data) return 0;

    return data.length / wallets.length;
  }

  // ========== MARKET METRICS ==========

  /**
   * Calculate comprehensive market metrics
   */
  async calculateMarketMetrics(startDate: Date, endDate: Date): Promise<MarketMetrics> {
    // Total volume
    const { data: volumeData } = await this.supabase
      .from('arenas')
      .select('pot')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    const totalVolume = volumeData?.reduce((sum, a) => sum + (a.pot || 0), 0) || 0;

    // Active arenas
    const { count: activeArenas } = await this.supabase
      .from('arenas')
      .select('*', { count: 'exact', head: true })
      .eq('resolved', false)
      .gte('end_time', new Date().toISOString());

    // Arena size statistics
    const arenaSizes = volumeData?.map(a => a.pot || 0).sort((a, b) => a - b) || [];
    const avgArenaSize = totalVolume / (arenaSizes.length || 1);
    const medianArenaSize = arenaSizes[Math.floor(arenaSizes.length / 2)] || 0;

    // Participants
    const { data: participantData } = await this.supabase
      .from('participants')
      .select('wallet, amount')
      .gte('joined_at', startDate.toISOString())
      .lte('joined_at', endDate.toISOString());

    const totalParticipants = participantData?.length || 0;
    const uniqueParticipants = new Set(participantData?.map(p => p.wallet) || []).size;
    const avgBetSize = participantData?.reduce((sum, p) => sum + (p.amount || 0), 0) / totalParticipants || 0;

    // Conversion rate (simplified - would need visitor tracking)
    const conversionRate = 0.15; // Placeholder: 15%

    return {
      totalVolume,
      activeArenas: activeArenas || 0,
      avgArenaSize,
      medianArenaSize,
      totalParticipants,
      uniqueParticipants,
      conversionRate,
      avgBetSize,
    };
  }

  // ========== FUNNEL ANALYSIS ==========

  /**
   * Analyze user conversion funnel
   */
  async analyzeFunnel(startDate: Date, endDate: Date): Promise<{
    visited: number;
    connected: number;
    viewed: number;
    participated: number;
    repeated: number;
  }> {
    // Would require frontend tracking integration
    // This is a simplified version

    const { data: participants } = await this.supabase
      .from('participants')
      .select('wallet')
      .gte('joined_at', startDate.toISOString())
      .lte('joined_at', endDate.toISOString());

    const participated = new Set(participants?.map(p => p.wallet) || []).size;

    // Check for repeat participants
    const wallets = Array.from(new Set(participants?.map(p => p.wallet) || []));
    let repeated = 0;

    for (const wallet of wallets) {
      const { data } = await this.supabase
        .from('participants')
        .select('wallet')
        .eq('wallet', wallet)
        .limit(2);

      if (data && data.length >= 2) {
        repeated++;
      }
    }

    return {
      visited: participated * 10, // Estimate: 10% conversion
      connected: participated * 5, // 20% connect wallet
      viewed: participated * 2, // 50% view arenas
      participated,
      repeated,
    };
  }

  // ========== TIME SERIES METRICS ==========

  /**
   * Generate time series data for a metric
   */
  async generateTimeSeries(
    metric: 'volume' | 'users' | 'arenas' | 'transactions',
    startDate: Date,
    endDate: Date,
    interval: 'hour' | 'day' | 'week' | 'month'
  ): Promise<Array<{ timestamp: Date; value: number }>> {
    const dataPoints: Array<{ timestamp: Date; value: number }> = [];
    
    let current = startDate;
    while (current <= endDate) {
      let value = 0;

      switch (metric) {
        case 'volume':
          value = await this.getVolumeForPeriod(current, interval);
          break;
        case 'users':
          value = await this.getActiveUsersForPeriod(current, interval);
          break;
        case 'arenas':
          value = await this.getArenasForPeriod(current, interval);
          break;
        case 'transactions':
          value = await this.getTransactionsForPeriod(current, interval);
          break;
      }

      dataPoints.push({ timestamp: new Date(current), value });

      // Move to next interval
      current = this.getNextInterval(current, interval);
    }

    return dataPoints;
  }

  private async getVolumeForPeriod(date: Date, interval: string): Promise<number> {
    const { start, end } = this.getIntervalBounds(date, interval);

    const { data } = await this.supabase
      .from('arenas')
      .select('pot')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString());

    return data?.reduce((sum, a) => sum + (a.pot || 0), 0) || 0;
  }

  private async getActiveUsersForPeriod(date: Date, interval: string): Promise<number> {
    const { start, end } = this.getIntervalBounds(date, interval);

    const { data } = await this.supabase
      .from('participants')
      .select('wallet')
      .gte('joined_at', start.toISOString())
      .lte('joined_at', end.toISOString());

    return new Set(data?.map(p => p.wallet) || []).size;
  }

  private async getArenasForPeriod(date: Date, interval: string): Promise<number> {
    const { start, end } = this.getIntervalBounds(date, interval);

    const { count } = await this.supabase
      .from('arenas')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString());

    return count || 0;
  }

  private async getTransactionsForPeriod(date: Date, interval: string): Promise<number> {
    const { start, end } = this.getIntervalBounds(date, interval);

    const { count } = await this.supabase
      .from('participants')
      .select('*', { count: 'exact', head: true })
      .gte('joined_at', start.toISOString())
      .lte('joined_at', end.toISOString());

    return count || 0;
  }

  private getIntervalBounds(date: Date, interval: string): { start: Date; end: Date } {
    let start: Date, end: Date;

    switch (interval) {
      case 'hour':
        start = new Date(date);
        start.setMinutes(0, 0, 0);
        end = new Date(start);
        end.setHours(end.getHours() + 1);
        break;
      case 'day':
        start = startOfDay(date);
        end = endOfDay(date);
        break;
      case 'week':
        start = startOfWeek(date);
        end = new Date(start);
        end.setDate(end.getDate() + 7);
        break;
      case 'month':
        start = startOfMonth(date);
        end = new Date(start);
        end.setMonth(end.getMonth() + 1);
        break;
      default:
        start = startOfDay(date);
        end = endOfDay(date);
    }

    return { start, end };
  }

  private getNextInterval(date: Date, interval: string): Date {
    const next = new Date(date);

    switch (interval) {
      case 'hour':
        next.setHours(next.getHours() + 1);
        break;
      case 'day':
        next.setDate(next.getDate() + 1);
        break;
      case 'week':
        next.setDate(next.getDate() + 7);
        break;
      case 'month':
        next.setMonth(next.getMonth() + 1);
        break;
    }

    return next;
  }

  // ========== SNAPSHOT & EXPORT ==========

  /**
   * Save metric snapshot for historical tracking
   */
  async saveMetricSnapshot(snapshot: MetricSnapshot): Promise<void> {
    await this.supabase.from('metric_snapshots').insert({
      timestamp: snapshot.timestamp.toISOString(),
      metric: snapshot.metric,
      value: snapshot.value,
      metadata: snapshot.metadata,
    });
  }

  /**
   * Export all metrics for external BI tools
   */
  async exportMetrics(startDate: Date, endDate: Date): Promise<any> {
    const [cohorts, market, funnel] = await Promise.all([
      this.calculateCohortRetention(startDate),
      this.calculateMarketMetrics(startDate, endDate),
      this.analyzeFunnel(startDate, endDate),
    ]);

    return {
      period: { start: startDate, end: endDate },
      cohorts,
      market,
      funnel,
      exportedAt: new Date(),
    };
  }
}

// ========== EXPORTS ==========

export default BIPipeline;

