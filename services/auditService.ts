import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { AuditLog, UserRole } from '@/types/database';
import { getStoredAuditLogs, addStoredAuditLog } from './mockDataService';

export interface LogAuditActionPayload {
  user_role: UserRole;
  user_identifier: string;
  action: string;
  details?: Record<string, any>;
}

export const logAuditAction = async (payload: LogAuditActionPayload): Promise<void> => {
  const detailsJson = payload.details || {};

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('audit_logs').insert([
        {
          user_role: payload.user_role,
          user_identifier: payload.user_identifier,
          action: payload.action,
          details: detailsJson,
        },
      ]);
    } catch (e) {
      // Audit logging is non-critical; log the warning but do not block the main operation
      console.warn('Supabase audit log insert warning:', e);
    }
  }

  // Always sync to client localStorage for dev inspection
  addStoredAuditLog({
    user_role: payload.user_role,
    user_identifier: payload.user_identifier,
    action: payload.action,
    details: detailsJson,
  });
};

export const getAuditLogs = async (): Promise<AuditLog[]> => {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Supabase audit query error:', error);
      throw new Error(`Failed to fetch audit logs: ${error.message}`);
    }

    return (data ?? []) as AuditLog[];
  }

  return getStoredAuditLogs();
};
