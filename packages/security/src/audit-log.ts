import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ========== AUDIT LOG TYPES ==========

export enum AuditAction {
  // Authentication
  USER_LOGIN = 'user.login',
  USER_LOGOUT = 'user.logout',
  USER_2FA_ENABLE = 'user.2fa.enable',
  USER_2FA_DISABLE = 'user.2fa.disable',
  
  // Arena Actions
  ARENA_CREATE = 'arena.create',
  ARENA_JOIN = 'arena.join',
  ARENA_RESOLVE = 'arena.resolve',
  ARENA_CLAIM = 'arena.claim',
  
  // Admin Actions
  ADMIN_USER_BAN = 'admin.user.ban',
  ADMIN_USER_UNBAN = 'admin.user.unban',
  ADMIN_ARENA_DELETE = 'admin.arena.delete',
  ADMIN_TRANSACTION_REVIEW = 'admin.transaction.review',
  
  // Security
  SECURITY_FRAUD_DETECTED = 'security.fraud.detected',
  SECURITY_SUSPICIOUS_ACTIVITY = 'security.suspicious.activity',
  SECURITY_ACCESS_DENIED = 'security.access.denied',
  
  // System
  SYSTEM_ERROR = 'system.error',
  SYSTEM_CONFIG_CHANGE = 'system.config.change',
}

export interface AuditLogEntry {
  id?: string;
  timestamp: Date;
  action: AuditAction;
  actor: string; // wallet address or system
  actorType: 'user' | 'admin' | 'system';
  resource?: string; // arena ID, user ID, etc.
  resourceType?: 'arena' | 'user' | 'transaction';
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  severity: 'info' | 'warning' | 'error' | 'critical';
  status: 'success' | 'failure';
  errorMessage?: string;
}

export interface AuditLogQuery {
  actions?: AuditAction[];
  actor?: string;
  resourceType?: string;
  severity?: string[];
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

// ========== AUDIT LOGGER ==========

let supabaseClient: SupabaseClient | null = null;

/**
 * Initialize audit logger
 */
export function initAuditLogger(supabase: SupabaseClient): void {
  supabaseClient = supabase;
}

/**
 * Log audit event
 */
export async function logAudit(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
  if (!supabaseClient) {
    console.error('Audit logger not initialized');
    return;
  }

  const fullEntry: AuditLogEntry = {
    ...entry,
    timestamp: new Date(),
  };

  try {
    const { error } = await supabaseClient
      .from('audit_logs')
      .insert({
        action: fullEntry.action,
        actor: fullEntry.actor,
        actor_type: fullEntry.actorType,
        resource: fullEntry.resource,
        resource_type: fullEntry.resourceType,
        ip: fullEntry.ip,
        user_agent: fullEntry.userAgent,
        metadata: fullEntry.metadata,
        severity: fullEntry.severity,
        status: fullEntry.status,
        error_message: fullEntry.errorMessage,
        created_at: fullEntry.timestamp.toISOString(),
      });

    if (error) {
      console.error('Failed to log audit entry:', error);
    }
  } catch (error) {
    console.error('Audit logging error:', error);
  }
}

/**
 * Query audit logs
 */
export async function queryAuditLogs(query: AuditLogQuery): Promise<AuditLogEntry[]> {
  if (!supabaseClient) {
    throw new Error('Audit logger not initialized');
  }

  let supabaseQuery = supabaseClient
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false });

  // Apply filters
  if (query.actions && query.actions.length > 0) {
    supabaseQuery = supabaseQuery.in('action', query.actions);
  }

  if (query.actor) {
    supabaseQuery = supabaseQuery.eq('actor', query.actor);
  }

  if (query.resourceType) {
    supabaseQuery = supabaseQuery.eq('resource_type', query.resourceType);
  }

  if (query.severity && query.severity.length > 0) {
    supabaseQuery = supabaseQuery.in('severity', query.severity);
  }

  if (query.startDate) {
    supabaseQuery = supabaseQuery.gte('created_at', query.startDate.toISOString());
  }

  if (query.endDate) {
    supabaseQuery = supabaseQuery.lte('created_at', query.endDate.toISOString());
  }

  if (query.limit) {
    supabaseQuery = supabaseQuery.limit(query.limit);
  }

  if (query.offset) {
    supabaseQuery = supabaseQuery.range(query.offset, query.offset + (query.limit || 100) - 1);
  }

  const { data, error } = await supabaseQuery;

  if (error) {
    throw new Error(`Failed to query audit logs: ${error.message}`);
  }

  return (data || []).map(row => ({
    id: row.id,
    timestamp: new Date(row.created_at),
    action: row.action as AuditAction,
    actor: row.actor,
    actorType: row.actor_type,
    resource: row.resource,
    resourceType: row.resource_type,
    ip: row.ip,
    userAgent: row.user_agent,
    metadata: row.metadata,
    severity: row.severity,
    status: row.status,
    errorMessage: row.error_message,
  }));
}

// ========== CONVENIENCE FUNCTIONS ==========

/**
 * Log user action
 */
export async function logUserAction(
  action: AuditAction,
  actor: string,
  resource?: string,
  metadata?: Record<string, any>,
  ip?: string,
  userAgent?: string
): Promise<void> {
  await logAudit({
    action,
    actor,
    actorType: 'user',
    resource,
    resourceType: resource ? 'arena' : undefined,
    metadata,
    ip,
    userAgent,
    severity: 'info',
    status: 'success',
  });
}

/**
 * Log security event
 */
export async function logSecurityEvent(
  action: AuditAction,
  actor: string,
  severity: 'warning' | 'error' | 'critical',
  metadata?: Record<string, any>,
  ip?: string
): Promise<void> {
  await logAudit({
    action,
    actor,
    actorType: 'system',
    metadata,
    ip,
    severity,
    status: 'success',
  });
}

/**
 * Log admin action
 */
export async function logAdminAction(
  action: AuditAction,
  admin: string,
  resource?: string,
  resourceType?: 'arena' | 'user' | 'transaction',
  metadata?: Record<string, any>
): Promise<void> {
  await logAudit({
    action,
    actor: admin,
    actorType: 'admin',
    resource,
    resourceType,
    metadata,
    severity: 'warning',
    status: 'success',
  });
}

/**
 * Log error
 */
export async function logError(
  action: AuditAction,
  actor: string,
  error: Error,
  metadata?: Record<string, any>
): Promise<void> {
  await logAudit({
    action,
    actor,
    actorType: 'system',
    metadata: {
      ...metadata,
      errorStack: error.stack,
    },
    severity: 'error',
    status: 'failure',
    errorMessage: error.message,
  });
}

// ========== COMPLIANCE REPORTS ==========

export interface ComplianceReport {
  period: { start: Date; end: Date };
  summary: {
    totalTransactions: number;
    suspiciousActivities: number;
    blockedTransactions: number;
    totalVolume: number;
  };
  topActors: Array<{ actor: string; count: number }>;
  securityIncidents: Array<AuditLogEntry>;
  adminActions: Array<AuditLogEntry>;
}

/**
 * Generate compliance report
 */
export async function generateComplianceReport(
  startDate: Date,
  endDate: Date
): Promise<ComplianceReport> {
  const allLogs = await queryAuditLogs({ startDate, endDate, limit: 10000 });

  // Calculate summary
  const transactionLogs = allLogs.filter(log =>
    [AuditAction.ARENA_JOIN, AuditAction.ARENA_CLAIM].includes(log.action)
  );

  const suspiciousLogs = allLogs.filter(log =>
    [AuditAction.SECURITY_FRAUD_DETECTED, AuditAction.SECURITY_SUSPICIOUS_ACTIVITY].includes(log.action)
  );

  const blockedLogs = allLogs.filter(log =>
    log.action === AuditAction.SECURITY_ACCESS_DENIED
  );

  // Top actors
  const actorCounts = new Map<string, number>();
  allLogs.forEach(log => {
    actorCounts.set(log.actor, (actorCounts.get(log.actor) || 0) + 1);
  });

  const topActors = Array.from(actorCounts.entries())
    .map(([actor, count]) => ({ actor, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Security incidents
  const securityIncidents = allLogs.filter(log =>
    log.severity === 'critical' || log.severity === 'error'
  );

  // Admin actions
  const adminActions = allLogs.filter(log => log.actorType === 'admin');

  return {
    period: { start: startDate, end: endDate },
    summary: {
      totalTransactions: transactionLogs.length,
      suspiciousActivities: suspiciousLogs.length,
      blockedTransactions: blockedLogs.length,
      totalVolume: 0, // Calculate from metadata if available
    },
    topActors,
    securityIncidents,
    adminActions,
  };
}

// ========== EXPORTS ==========

export default {
  AuditAction,
  initAuditLogger,
  logAudit,
  queryAuditLogs,
  logUserAction,
  logSecurityEvent,
  logAdminAction,
  logError,
  generateComplianceReport,
};

