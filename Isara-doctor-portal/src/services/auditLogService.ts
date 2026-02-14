/**
 * HIPAA/PDPA Audit Logging Service
 * Logs all access to patient data for compliance
 *
 * Uses GCS bucket: izara-patients-data
 * - audit/access-logs/{id}.json - Audit log files
 */

import { appendAuditLog, fetchAuditLogs } from './gcsDataService';

export interface AuditLog {
  id: string;
  timestamp: Date;
  userId: string;
  userName: string;
  action: AuditAction;
  resource: AuditResource;
  resourceId: string;
  patientId?: string;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export type AuditAction =
  | 'view'
  | 'create'
  | 'update'
  | 'delete'
  | 'download'
  | 'print'
  | 'export'
  | 'login'
  | 'logout'
  | 'access_denied';

export type AuditResource =
  | 'patient_phr'
  | 'patient_ehr'
  | 'patient_demographics'
  | 'emr'
  | 'prescription'
  | 'lab_order'
  | 'lab_result'
  | 'imaging_order'
  | 'imaging_report'
  | 'appointment'
  | 'consent_record'
  | 'e_living_will'
  | 'system';

class AuditLogService {
  private readonly logs: AuditLog[] = [];
  private readonly pendingLogs: AuditLog[] = [];
  private readonly flushInterval: NodeJS.Timeout | null = null;

  /**
   * Log an audit event
   */
  async log(
    userId: string,
    userName: string,
    action: AuditAction,
    resource: AuditResource,
    resourceId: string,
    options?: {
      patientId?: string;
      success?: boolean;
      errorMessage?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<void> {
    const auditLog: AuditLog = {
      id: `AUDIT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      userId,
      userName,
      action,
      resource,
      resourceId,
      patientId: options?.patientId,
      ipAddress: await this.getClientIP(),
      userAgent: navigator.userAgent,
      success: options?.success !== false,
      errorMessage: options?.errorMessage,
      metadata: options?.metadata,
    };

    // Store in memory (for immediate access)
    this.logs.push(auditLog);

    // Log to console for development
    console.log('🔍 AUDIT LOG:', {
      action: auditLog.action,
      resource: auditLog.resource,
      user: auditLog.userName,
      timestamp: auditLog.timestamp.toISOString(),
    });

    // In production, send to backend API or GCS
    try {
      // Save to GCS in batches every 10 logs or every minute
      await this.persistLog(auditLog);
    } catch (error) {
      console.error('Failed to persist audit log:', error);
      // Store in localStorage as backup
      this.saveToLocalStorage(auditLog);
    }
  }

  /**
   * Log patient data access (HIPAA/PDPA compliance)
   */
  async logPatientDataAccess(
    userId: string,
    userName: string,
    patientId: string,
    dataType: AuditResource,
    purpose: string
  ): Promise<void> {
    await this.log(userId, userName, 'view', dataType, patientId, {
      patientId,
      metadata: {
        purpose,
        complianceType: 'HIPAA/PDPA',
      },
    });
  }

  /**
   * Log EMR creation/modification
   */
  async logEMRActivity(
    userId: string,
    userName: string,
    action: 'create' | 'update' | 'delete',
    emrId: string,
    patientId: string
  ): Promise<void> {
    await this.log(userId, userName, action, 'emr', emrId, {
      patientId,
      metadata: {
        complianceType: 'HIPAA',
      },
    });
  }

  /**
   * Log prescription activity
   */
  async logPrescriptionActivity(
    userId: string,
    userName: string,
    action: 'create' | 'update' | 'delete' | 'print',
    prescriptionId: string,
    patientId: string
  ): Promise<void> {
    await this.log(userId, userName, action, 'prescription', prescriptionId, {
      patientId,
      metadata: {
        complianceType: 'DEA/HIPAA',
      },
    });
  }

  /**
   * Log consent verification
   */
  async logConsentCheck(
    userId: string,
    userName: string,
    patientId: string,
    hasConsent: boolean,
    requestedDataTypes: string[]
  ): Promise<void> {
    await this.log(userId, userName, hasConsent ? 'view' : 'access_denied', 'consent_record', patientId, {
      patientId,
      success: hasConsent,
      errorMessage: hasConsent ? undefined : 'No patient consent',
      metadata: {
        requestedDataTypes,
        complianceType: 'PDPA',
      },
    });
  }

  /**
   * Log login/logout events
   */
  async logAuthEvent(
    userId: string,
    userName: string,
    action: 'login' | 'logout',
    success: boolean,
    errorMessage?: string
  ): Promise<void> {
    await this.log(userId, userName, action, 'system', userId, {
      success,
      errorMessage,
    });
  }

  /**
   * Get audit logs for a specific patient (for compliance reports)
   * Fetches from GCS: izara-patients-data/audit/access-logs/{patientId}_{date}.json
   */
  async getPatientAuditLogs(patientId: string, startDate?: Date, endDate?: Date): Promise<AuditLog[]> {
    const allLogs: AuditLog[] = [...this.logs];

    // Also try to fetch from GCS for the date range
    if (startDate && endDate) {
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const logId = `${patientId}_${dateStr}`;
        try {
          const gcsLog = await fetchAuditLogs(logId);
          if (gcsLog?.entries) {
            allLogs.push(...gcsLog.entries.map((e: any) => ({
              ...e,
              timestamp: new Date(e.timestamp),
            })));
          }
        } catch {
          // Expected: Log not found for this date, continue to next date
          // This is normal behavior when no audit logs exist for a specific date
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    const filtered = allLogs.filter((log) => {
      const matchesPatient = log.patientId === patientId;
      const logTime = log.timestamp instanceof Date ? log.timestamp : new Date(log.timestamp);
      const matchesDateRange =
        (!startDate || logTime >= startDate) && (!endDate || logTime <= endDate);
      return matchesPatient && matchesDateRange;
    });

    // Remove duplicates by id
    const uniqueLogs = filtered.filter(
      (log, index, self) => index === self.findIndex(l => l.id === log.id)
    );

    // Sort by most recent first
    return uniqueLogs.sort((a, b) => {
      const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime();
      const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime();
      return timeB - timeA;
    });
  }

  /**
   * Get audit logs for a specific user
   */
  async getUserAuditLogs(userId: string, limit: number = 100): Promise<AuditLog[]> {
    const filtered = this.logs.filter((log) => log.userId === userId);
    return [...filtered]
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(startDate: Date, endDate: Date): Promise<{
    totalAccess: number;
    byResource: Record<AuditResource, number>;
    byAction: Record<AuditAction, number>;
    accessDenied: number;
    uniquePatients: number;
    uniqueUsers: number;
  }> {
    const filtered = this.logs.filter(
      (log) => log.timestamp >= startDate && log.timestamp <= endDate
    );

    const report = {
      totalAccess: filtered.length,
      byResource: {} as Record<AuditResource, number>,
      byAction: {} as Record<AuditAction, number>,
      accessDenied: filtered.filter((log) => log.action === 'access_denied').length,
      uniquePatients: new Set(filtered.map((log) => log.patientId).filter(Boolean)).size,
      uniqueUsers: new Set(filtered.map((log) => log.userId)).size,
    };

    filtered.forEach((log) => {
      report.byResource[log.resource] = (report.byResource[log.resource] || 0) + 1;
      report.byAction[log.action] = (report.byAction[log.action] || 0) + 1;
    });

    return report;
  }

  /**
   * Persist log to GCS via gcsDataService
   * Writes to: izara-patients-data/audit/access-logs/{patientId}_{date}.json
   */
  private async persistLog(log: AuditLog): Promise<void> {
    try {
      // Use patient ID for log grouping, or 'system' for non-patient logs
      const patientId = log.patientId || 'system';

      const auditEntry = {
        ...log,
        timestamp: log.timestamp instanceof Date ? log.timestamp.toISOString() : log.timestamp,
      };

      // Write to GCS using the gcsDataService
      const result = await appendAuditLog(patientId, auditEntry);

      if (result.success) {
        console.log(`📝 Audit log saved to GCS: audit/access-logs/${patientId}_${new Date().toISOString().split('T')[0]}.json`);
      } else {
        throw new Error(result.error || 'Failed to save audit log');
      }
    } catch (error: any) {
      console.error(`❌ Failed to persist audit log to GCS:`, error.message);
      // Fallback to localStorage
      this.saveToLocalStorage(log);
    }
  }

  /**
   * Save to localStorage as backup
   */
  private saveToLocalStorage(log: AuditLog): void {
    try {
      const existing = localStorage.getItem('audit-logs-backup');
      const logs = existing ? JSON.parse(existing) : [];
      logs.push(log);
      // Keep only last 1000 logs in localStorage
      const trimmed = logs.slice(-1000);
      localStorage.setItem('audit-logs-backup', JSON.stringify(trimmed));
    } catch (error) {
      console.error('Failed to save audit log to localStorage:', error);
    }
  }

  /**
   * Get client IP address (best effort)
   */
  private async getClientIP(): Promise<string> {
    // In production, get from backend API
    return 'UNKNOWN';
  }

  /**
   * Export audit logs to CSV for compliance
   */
  exportToCSV(logs: AuditLog[]): string {
    const headers = [
      'Timestamp',
      'User',
      'Action',
      'Resource',
      'Resource ID',
      'Patient ID',
      'IP Address',
      'Success',
      'Error Message',
    ];

    const rows = logs.map((log) => [
      log.timestamp.toISOString(),
      log.userName,
      log.action,
      log.resource,
      log.resourceId,
      log.patientId || '',
      log.ipAddress || '',
      log.success ? 'Yes' : 'No',
      log.errorMessage || '',
    ]);

    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');

    return csv;
  }

  /**
   * Download audit logs as CSV file
   */
  downloadCSV(logs: AuditLog[], filename: string = 'audit-logs.csv'): void {
    const csv = this.exportToCSV(logs);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = globalThis.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    globalThis.URL.revokeObjectURL(url);
  }
}

export const auditLogService = new AuditLogService();
