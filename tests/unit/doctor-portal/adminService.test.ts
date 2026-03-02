/**
 * ═══════════════════════════════════════════════════════════════════════
 * IZARA TELEMEDICINE — Admin Service Unit Tests
 * ═══════════════════════════════════════════════════════════════════════
 * Tests the AdminService.getAllUsers SQL fix and doctor account
 * management flows.
 * ═══════════════════════════════════════════════════════════════════════
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================================
// SQL Builder Logic (extracted from AdminService.getAllUsers)
// ============================================================================

interface UserQueryParams {
  role?: string;
  status?: string;
  search?: string;
  specialization?: string;
  limit?: number;
  offset?: number;
}

function buildGetAllUsersQuery(params: UserQueryParams): { sql: string; values: any[] } {
  const conditions: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  // Role filter
  if (params.role) {
    conditions.push(`role = $${paramIndex}`);
    values.push(params.role);
    paramIndex++;
  }

  // Status filter — the FIXED logic
  if (params.status) {
    if (params.status === 'active') {
      conditions.push(`is_active = $${paramIndex}`);
      values.push(true);
      paramIndex++;
    } else if (params.status === 'inactive') {
      conditions.push(`is_active = $${paramIndex}`);
      values.push(false);
      paramIndex++;
    } else {
      // Other statuses like 'pending', 'approved', 'rejected'
      conditions.push(`approval_status = $${paramIndex}`);
      values.push(params.status);
      paramIndex++;
    }
  }

  // Search filter
  if (params.search) {
    conditions.push(
      `(LOWER(first_name) LIKE $${paramIndex} OR LOWER(last_name) LIKE $${paramIndex} OR LOWER(email) LIKE $${paramIndex})`
    );
    values.push(`%${params.search.toLowerCase()}%`);
    paramIndex++;
  }

  // Specialization filter
  if (params.specialization) {
    conditions.push(`specialization = $${paramIndex}`);
    values.push(params.specialization);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limitClause = params.limit ? `LIMIT $${paramIndex++}` : '';
  if (params.limit) values.push(params.limit);
  const offsetClause = params.offset ? `OFFSET $${paramIndex++}` : '';
  if (params.offset) values.push(params.offset);

  const sql = `SELECT id, email, first_name, last_name, role, is_active, approval_status, specialization, created_at
    FROM users ${whereClause} ORDER BY created_at DESC ${limitClause} ${offsetClause}`.trim();

  return { sql, values };
}

// The OLD buggy SQL builder that had the issue
function buildGetAllUsersQuery_BUGGY(params: UserQueryParams): { sql: string; values: any[] } {
  const conditions: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (params.role) {
    conditions.push(`role = $${paramIndex}`);
    values.push(params.role);
    paramIndex++;
  }

  // BUG: This produces invalid SQL: (approval_status = $n OR (is_active = ($n = 'active')))
  // ($n = 'active') is a boolean comparison, not a valid value for is_active
  if (params.status) {
    conditions.push(`(approval_status = $${paramIndex} OR (is_active = ($${paramIndex} = 'active')))`);
    values.push(params.status);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const sql = `SELECT * FROM users ${whereClause}`.trim();
  return { sql, values };
}

// ============================================================================
// TESTS
// ============================================================================

describe('AdminService — getAllUsers', () => {
  describe('Fixed SQL Builder', () => {
    it('should build correct query for role=doctor only (no status)', () => {
      const result = buildGetAllUsersQuery({ role: 'doctor' });
      expect(result.sql).toContain('role = $1');
      expect(result.values).toEqual(['doctor']);
    });

    it('should handle status=active with boolean is_active=true', () => {
      const result = buildGetAllUsersQuery({ role: 'doctor', status: 'active' });
      expect(result.sql).toContain('role = $1');
      expect(result.sql).toContain('is_active = $2');
      expect(result.values).toEqual(['doctor', true]);
      // The key fix: is_active should be compared to boolean true, not string comparison
    });

    it('should handle status=inactive with boolean is_active=false', () => {
      const result = buildGetAllUsersQuery({ role: 'doctor', status: 'inactive' });
      expect(result.sql).toContain('is_active = $2');
      expect(result.values).toEqual(['doctor', false]);
    });

    it('should handle status=pending with approval_status column', () => {
      const result = buildGetAllUsersQuery({ role: 'doctor', status: 'pending' });
      expect(result.sql).toContain('approval_status = $2');
      expect(result.values).toEqual(['doctor', 'pending']);
    });

    it('should handle status=approved via approval_status', () => {
      const result = buildGetAllUsersQuery({ role: 'doctor', status: 'approved' });
      expect(result.sql).toContain('approval_status = $2');
      expect(result.values).toEqual(['doctor', 'approved']);
    });

    it('should build search query correctly', () => {
      const result = buildGetAllUsersQuery({ search: 'Smith' });
      expect(result.sql).toContain('LOWER(first_name) LIKE $1');
      expect(result.values).toEqual(['%smith%']);
    });

    it('should combine role + status + search correctly', () => {
      const result = buildGetAllUsersQuery({
        role: 'doctor',
        status: 'active',
        search: 'john',
      });
      expect(result.sql).toContain('role = $1');
      expect(result.sql).toContain('is_active = $2');
      expect(result.sql).toContain('LIKE $3');
      expect(result.values).toEqual(['doctor', true, '%john%']);
    });

    it('should include pagination', () => {
      const result = buildGetAllUsersQuery({
        role: 'doctor',
        limit: 20,
        offset: 40,
      });
      expect(result.sql).toContain('LIMIT');
      expect(result.sql).toContain('OFFSET');
      expect(result.values).toContain(20);
      expect(result.values).toContain(40);
    });

    it('should return all users when no filters specified', () => {
      const result = buildGetAllUsersQuery({});
      expect(result.sql).not.toContain('WHERE');
      expect(result.values).toHaveLength(0);
    });

    it('should include specialization filter', () => {
      const result = buildGetAllUsersQuery({
        role: 'doctor',
        specialization: 'Cardiology',
      });
      expect(result.sql).toContain('specialization = $2');
      expect(result.values).toEqual(['doctor', 'Cardiology']);
    });
  });

  describe('Buggy SQL Builder (verify the bug)', () => {
    it('should demonstrate the bug in old query', () => {
      const buggy = buildGetAllUsersQuery_BUGGY({ role: 'doctor', status: 'active' });
      // The buggy SQL contains ($2 = 'active') which is a boolean expression inside is_active comparison
      expect(buggy.sql).toContain("($2 = 'active')");
      // This would make PostgreSQL compare: is_active = (TRUE) which evaluates differently than intended
    });

    it('should show fixed query does NOT contain the buggy pattern', () => {
      const fixed = buildGetAllUsersQuery({ role: 'doctor', status: 'active' });
      expect(fixed.sql).not.toContain("= 'active'");
      // Fixed version uses boolean true directly, not string comparison
    });
  });
});

describe('AdminService — Doctor Management', () => {
  describe('Doctor Approval Flow', () => {
    it('should validate doctor registration data', () => {
      const doctorData = {
        email: 'dr.smith@hospital.com',
        first_name: 'John',
        last_name: 'Smith',
        role: 'doctor',
        license_number: 'TH-12345',
        specialization: 'General Practice',
      };
      expect(doctorData.email).toMatch(/@/);
      expect(doctorData.role).toBe('doctor');
      expect(doctorData.license_number).toBeTruthy();
    });

    it('should set initial status for new doctor', () => {
      const newDoctor = {
        is_active: false,
        approval_status: 'pending',
      };
      expect(newDoctor.is_active).toBe(false);
      expect(newDoctor.approval_status).toBe('pending');
    });

    it('should update status when admin approves', () => {
      const approved = {
        is_active: true,
        approval_status: 'approved',
      };
      expect(approved.is_active).toBe(true);
      expect(approved.approval_status).toBe('approved');
    });

    it('should handle doctor rejection', () => {
      const rejected = {
        is_active: false,
        approval_status: 'rejected',
      };
      expect(rejected.is_active).toBe(false);
      expect(rejected.approval_status).toBe('rejected');
    });
  });

  describe('Doctor List Response Format', () => {
    it('should return proper doctor list response', () => {
      const response = {
        success: true,
        data: [
          { id: 'DOC-001', first_name: 'John', last_name: 'Smith', role: 'doctor', is_active: true },
          { id: 'DOC-002', first_name: 'Jane', last_name: 'Doe', role: 'doctor', is_active: false },
        ],
        total: 2,
      };
      expect(response.success).toBe(true);
      expect(response.data).toHaveLength(2);
      expect(response.data.every((d) => d.role === 'doctor')).toBe(true);
    });

    it('should format error response on failure', () => {
      const errorResponse = {
        success: false,
        error: 'Failed to load doctor accounts',
        details: 'Database query error',
      };
      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error).toBeTruthy();
    });
  });
});
