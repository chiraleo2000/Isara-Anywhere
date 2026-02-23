/**
 * ═══════════════════════════════════════════════════════════════════════
 * ISARA-ANYWHERE — RBAC Guard
 * ═══════════════════════════════════════════════════════════════════════
 * Role-Based Access Control for the healthcare team monitoring UI
 * and API endpoints. Ensures only authorized roles can access
 * specific resources.
 * ═══════════════════════════════════════════════════════════════════════
 */

export type UserRole = 'patient' | 'doctor' | 'nurse' | 'pharmacist' | 'lab_tech' | 'admin';

export interface RBACUser {
  userId: string;
  role: UserRole;
  permissions: string[];
}

export interface AccessCheckResult {
  allowed: boolean;
  reason?: string;
}

const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  patient: [
    'chat:send',
    'chat:read_own',
    'appointment:book',
    'appointment:read_own',
    'phr:read_own',
    'phr:update_own',
    'consent:manage_own',
  ],
  doctor: [
    'chat:send',
    'chat:read_all',
    'chat:monitor',
    'appointment:read_all',
    'appointment:manage',
    'patient:read',
    'patient:update',
    'emr:read',
    'emr:write',
    'prescription:create',
    'prescription:approve',
    'investigation:request',
    'referral:create',
    'task:create',
    'task:read_all',
    'dashboard:view',
  ],
  nurse: [
    'chat:send',
    'chat:read_all',
    'chat:monitor',
    'appointment:read_all',
    'patient:read',
    'patient:update',
    'emr:read',
    'vitals:record',
    'task:read_all',
    'dashboard:view',
  ],
  pharmacist: [
    'chat:read_assigned',
    'patient:read',
    'prescription:read',
    'prescription:dispense',
    'drug:check_interaction',
    'task:read_assigned',
    'dashboard:view',
  ],
  lab_tech: [
    'chat:read_assigned',
    'patient:read',
    'investigation:read',
    'investigation:update_results',
    'task:read_assigned',
    'dashboard:view',
  ],
  admin: [
    'chat:send',
    'chat:read_all',
    'chat:monitor',
    'appointment:read_all',
    'appointment:manage',
    'patient:read',
    'patient:update',
    'emr:read',
    'emr:write',
    'prescription:create',
    'prescription:approve',
    'investigation:request',
    'investigation:update_results',
    'referral:create',
    'task:create',
    'task:read_all',
    'dashboard:view',
    'admin:manage_users',
    'admin:manage_roles',
    'admin:view_audit',
    'admin:manage_channels',
    'consent:manage_all',
  ],
};

export function getPermissionsForRole(role: UserRole): string[] {
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) {
    return [];
  }
  return [...permissions];
}

export function createRBACUser(
  userId: string,
  role: UserRole,
): RBACUser {
  if (!userId || typeof userId !== 'string') {
    throw new Error('userId is required');
  }

  const validRoles: UserRole[] = ['patient', 'doctor', 'nurse', 'pharmacist', 'lab_tech', 'admin'];
  if (!validRoles.includes(role)) {
    throw new Error(`Invalid role: ${role}`);
  }

  return {
    userId,
    role,
    permissions: getPermissionsForRole(role),
  };
}

export function checkAccess(
  user: RBACUser,
  requiredPermission: string,
): AccessCheckResult {
  if (!user || !user.userId) {
    return { allowed: false, reason: 'User not authenticated' };
  }

  if (!requiredPermission) {
    return { allowed: false, reason: 'Permission not specified' };
  }

  if (user.permissions.includes(requiredPermission)) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: `Role '${user.role}' does not have permission '${requiredPermission}'`,
  };
}

export function checkMultipleAccess(
  user: RBACUser,
  requiredPermissions: string[],
  mode: 'all' | 'any' = 'all',
): AccessCheckResult {
  if (!user || !user.userId) {
    return { allowed: false, reason: 'User not authenticated' };
  }

  if (!requiredPermissions || requiredPermissions.length === 0) {
    return { allowed: false, reason: 'No permissions specified' };
  }

  if (mode === 'all') {
    const missing = requiredPermissions.filter(p => !user.permissions.includes(p));
    if (missing.length > 0) {
      return {
        allowed: false,
        reason: `Missing permissions: ${missing.join(', ')}`,
      };
    }
    return { allowed: true };
  }

  // mode === 'any'
  const hasAny = requiredPermissions.some(p => user.permissions.includes(p));
  if (hasAny) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: `Role '${user.role}' has none of the required permissions`,
  };
}

export function canAccessDashboard(user: RBACUser): boolean {
  return user.permissions.includes('dashboard:view');
}

export function canMonitorChat(user: RBACUser): boolean {
  return user.permissions.includes('chat:monitor');
}

export function canCreatePrescription(user: RBACUser): boolean {
  return user.permissions.includes('prescription:create');
}

export function canRequestInvestigation(user: RBACUser): boolean {
  return user.permissions.includes('investigation:request');
}

export function canCreateReferral(user: RBACUser): boolean {
  return user.permissions.includes('referral:create');
}
